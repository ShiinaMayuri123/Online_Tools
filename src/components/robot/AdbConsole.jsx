import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { ADB_COMMANDS } from '../../config/adbCommands';
import { ADB_SECTIONS } from '../../config/adbData';
import AdbWorkspace from './AdbWorkspace';

const AGENT_PORTS = [5038, 5039, 5040, 12553, 12554, 12555, 3001];
const AGENT_VERSION_KEY = 'adb_local_agent_version';
const FILE_MANAGER_CAPABILITY = 'file-manager';

const compareVersions = (left = '', right = '') => {
  const parse = (version) => String(version).replace(/^v/i, '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) - (b[index] || 0);
  }
  return 0;
};

async function detectLocalAgent(timeoutMs = 500) {
  const probes = await Promise.all(AGENT_PORTS.map(async (port) => {
    try {
      const healthResponse = await fetch(`http://127.0.0.1:${port}/health`, {
        cache: 'no-store',
        mode: 'cors',
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!healthResponse.ok) return null;
      const health = await healthResponse.json();
      if (!health.ok) return null;
      return {
        baseUrl: `http://127.0.0.1:${port}`,
        version: health.version || '',
        protocolVersion: health.protocolVersion || 0,
        capabilities: Array.isArray(health.capabilities) ? health.capabilities : [],
      };
    } catch {
      return null;
    }
  }));
  return probes.filter(Boolean).sort((left, right) => {
    const leftSupportsFiles = left.capabilities.includes(FILE_MANAGER_CAPABILITY);
    const rightSupportsFiles = right.capabilities.includes(FILE_MANAGER_CAPABILITY);
    if (leftSupportsFiles !== rightSupportsFiles) return rightSupportsFiles ? 1 : -1;
    return compareVersions(right.version, left.version);
  })[0] || null;
}

function getInitialToken() {
  try {
    return localStorage.getItem('adb_local_agent_token') || '';
  } catch {
    return '';
  }
}

function toReferenceCommand(section, item, index) {
  const placeholderPattern = /<([^>]+)>/g;
  const matches = [...String(item.cmd || '').matchAll(placeholderPattern)];
  return {
    id: `reference-${section.title}-${index}`,
    name: item.desc,
    category: section.title,
    description: item.desc,
    danger: item.risk || 'none',
    params: matches.map((match, paramIndex) => ({
      key: `value${paramIndex}`,
      label: match[1],
      type: 'text',
      required: true,
    })),
    build: (values = {}) => String(item.cmd || '').replace(placeholderPattern, (_, label, offset) => {
      const matchIndex = [...String(item.cmd || '').slice(0, offset).matchAll(placeholderPattern)].length;
      return values[`value${matchIndex}`] || `<${label}>`;
    }),
  };
}

export default function AdbConsole() {
  const { theme } = useTheme();
  const outputRef = useRef(null);
  const websocketRef = useRef(null);
  const mountedRef = useRef(true);
  const [agentBaseUrl, setAgentBaseUrl] = useState(null);
  const [agentToken, setAgentToken] = useState(getInitialToken);
  const [agentCapabilities, setAgentCapabilities] = useState([]);
  const [agentDetecting, setAgentDetecting] = useState(true);
  const [agentVersion, setAgentVersion] = useState(() => localStorage.getItem(AGENT_VERSION_KEY) || '');
  const [agentManifest, setAgentManifest] = useState(null);
  const [agentLaunchState, setAgentLaunchState] = useState('idle');
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [connectionInput, setConnectionInput] = useState('');
  const [portInput, setPortInput] = useState('5555');
  const [connecting, setConnecting] = useState(false);
  const [refreshingDevices, setRefreshingDevices] = useState(false);
  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [customCommand, setCustomCommand] = useState('adb shell ');
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('adb_exec_history') || '[]');
    } catch {
      return [];
    }
  });
  const [activePanel, setActivePanel] = useState('files');
  const [dangerCommand, setDangerCommand] = useState(null);

  const addOutput = (type, data) => setOutput((previous) => [...previous, { type, data, time: new Date().toLocaleTimeString() }]);

  useEffect(() => {
    localStorage.setItem('adb_exec_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    fetch('/agent-manifest.json', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((manifest) => mountedRef.current && setAgentManifest(manifest))
      .catch(() => undefined);
    return () => {
      mountedRef.current = false;
      websocketRef.current?.close();
    };
  }, []);

  const connectWebSocket = (baseUrl, token) => {
    websocketRef.current?.close();
    const socket = new WebSocket(`${baseUrl.replace(/^http/, 'ws')}/ws?token=${encodeURIComponent(token)}`);
    websocketRef.current = socket;
    socket.onopen = () => addOutput('system', '已建立现场 ADB 代理 WebSocket 连接');
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'start') setIsRunning(true);
        if (message.type === 'stdout') addOutput('stdout', message.data);
        if (message.type === 'stderr') addOutput('stderr', message.data);
        if (['close', 'error', 'killed'].includes(message.type)) setIsRunning(false);
      } catch {
        addOutput('error', '无法解析代理消息');
      }
    };
    socket.onerror = () => addOutput('error', 'WebSocket 通信异常');
  };

  const getHeaders = (token = agentToken) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  const refreshDevices = async (baseUrl = agentBaseUrl, token = agentToken) => {
    if (!baseUrl) return;
    setRefreshingDevices(true);
    try {
      const response = await fetch(`${baseUrl}/adb/devices`, { headers: getHeaders(token) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || '设备列表获取失败');
      setDevices(data.devices || []);
    } catch (error) {
      addOutput('error', `刷新设备失败: ${error.message}`);
    } finally {
      setRefreshingDevices(false);
    }
  };

  const applyAgent = (agent, token = agentToken) => {
    const baseUrl = agent?.baseUrl || null;
    setAgentBaseUrl(baseUrl);
    setAgentCapabilities(agent?.capabilities || []);
    setAgentVersion(agent?.version || '');
    setAgentLaunchState(baseUrl ? 'connected' : 'idle');
    if (agent?.version) localStorage.setItem(AGENT_VERSION_KEY, agent.version);
    if (baseUrl && token) {
      connectWebSocket(baseUrl, token);
      refreshDevices(baseUrl, token);
    }
    return baseUrl;
  };

  const detectAgent = async () => {
    setAgentDetecting(true);
    const agent = await detectLocalAgent();
    const baseUrl = applyAgent(agent);
    if (!baseUrl) addOutput('error', '未找到正在运行的现场连接助手');
    setAgentDetecting(false);
    return agent;
  };

  // 检测函数依赖代理连接回调，初始化时只注册一次。
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const timer = window.setTimeout(() => detectAgent(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  const startInstalledAgent = async () => {
    if (agentLaunchState === 'launching') return;
    setAgentLaunchState('launching');
    setAgentDetecting(true);
    window.location.href = 'pudu-agent://start';
    for (let attempt = 0; attempt < 30 && mountedRef.current; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, attempt === 0 ? 250 : 500));
      const agent = await detectLocalAgent(350);
      if (agent) {
        applyAgent(agent);
        setAgentDetecting(false);
        return;
      }
    }
    setAgentDetecting(false);
    setAgentLaunchState('failed');
    addOutput('error', '连接助手未能在 15 秒内启动，请检查安装器或手动打开助手');
  };

  const pairAgent = async (value) => {
    const token = value.trim();
    if (!agentBaseUrl || !token) throw new Error('请输入本地代理窗口显示的 Token');
    const response = await fetch(`${agentBaseUrl}/adb/devices`, { headers: getHeaders(token) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.error || 'Token 无效');
    setAgentToken(token);
    localStorage.setItem('adb_local_agent_token', token);
    applyAgent({ baseUrl: agentBaseUrl, version: agentVersion, capabilities: agentCapabilities }, token);
    setDevices(data.devices || []);
    addOutput('system', '本地代理已完成配对');
  };

  const executeCommand = async (commandObj, builtCommand, confirmCommand = '') => {
    if (!agentBaseUrl) {
      addOutput('error', '请先启动现场连接助手');
      return;
    }
    const startedAt = Date.now();
    setIsRunning(true);
    try {
      let response = await fetch(`${agentBaseUrl}/adb/exec-safe`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ commandId: commandObj?.id, rawCommand: builtCommand, confirmCommand }),
      });
      if (response.status === 404) {
        response = await fetch(`${agentBaseUrl}/adb/exec`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ command: builtCommand, confirmCommand }),
        });
      }
      const data = await response.json().catch(() => ({}));
      if (response.status === 409 && data.requiresConfirmation) {
        setDangerCommand({
          command: { ...commandObj, danger: 'high', name: commandObj?.name || '自定义命令', description: data.error || '该命令可能修改设备或本机文件' },
          builtCmd: builtCommand,
          confirmCommand: data.confirmation || builtCommand,
        });
        addOutput('system', '该命令需要输入 DELETE 确认后执行');
        return data;
      }
      const succeeded = response.ok && data.success === true && (data.code === undefined || data.code === 0);
      const message = succeeded
        ? data.stdout || data.message || '命令执行完成'
        : data.stderr || data.error || data.stdout || `命令执行失败（${response.status}）`;
      addOutput(succeeded ? 'stdout' : 'error', message);
      setHistory((previous) => [{
        id: String(Date.now()),
        commandId: commandObj?.id || 'custom',
        name: commandObj?.name || '自定义命令',
        fullCmd: builtCommand,
        timestamp: new Date().toLocaleTimeString(),
        duration: Date.now() - startedAt,
        status: succeeded ? 'success' : 'error',
        output: data.stdout || '',
        error: succeeded ? '' : data.stderr || data.error || message,
      }, ...previous]);
      return data;
    } catch (error) {
      addOutput('error', `命令请求失败: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const executeFromTerminal = (commandText, commandObj, confirmCommand = '') => executeCommand(commandObj || { id: 'custom', name: '自定义命令' }, commandText, confirmCommand);
  const fillTerminal = (_command, builtCommand) => setCustomCommand(builtCommand || '');
  const executeStream = (command) => websocketRef.current?.send(JSON.stringify({ type: 'exec-stream', command }));

  const handleConnect = async () => {
    if (!agentBaseUrl || !agentToken) {
      addOutput('error', '请先完成本地代理配对');
      return;
    }
    if (!connectionInput.trim()) return;
    setConnecting(true);
    try {
      const response = await fetch(`${agentBaseUrl}/adb/connect`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ip: connectionInput.trim(), port: portInput.trim() || '5555' }),
      });
      const data = await response.json();
      if (data.success) {
        setConnectedDevice(data.device || `${connectionInput.trim()}:${portInput.trim() || '5555'}`);
        await refreshDevices();
      } else addOutput('error', data.error || '设备连接失败');
    } catch (error) {
      addOutput('error', error.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (device) => {
    if (!agentBaseUrl) return;
    setRefreshingDevices(true);
    try {
      await fetch(`${agentBaseUrl}/adb/disconnect`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ device }) });
      setConnectedDevice(null);
      await refreshDevices();
    } finally {
      setRefreshingDevices(false);
    }
  };

  const libraryCommands = useMemo(() => {
    const configured = Array.isArray(ADB_COMMANDS) ? ADB_COMMANDS.filter(Boolean) : [];
    const references = (ADB_SECTIONS || []).flatMap((section) => (section.commands || []).map((item, index) => toReferenceCommand(section, item, index)));
    const seen = new Set();
    return [...configured, ...references].filter((command) => {
      const key = `${command.category}:${command.build({})}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  return <AdbWorkspace
    theme={theme}
    commands={libraryCommands}
    output={output}
    outputRef={outputRef}
    customCommand={customCommand}
    setCustomCommand={setCustomCommand}
    onExecute={executeFromTerminal}
    onPairAgent={pairAgent}
    onFillTerminal={fillTerminal}
    onExecuteStream={executeStream}
    isRunning={isRunning}
    history={history}
    onClearOutput={() => setOutput([])}
    onClearHistory={() => setHistory([])}
    activePanel={activePanel}
    setActivePanel={setActivePanel}
    connectionInput={connectionInput}
    setConnectionInput={setConnectionInput}
    portInput={portInput}
    setPortInput={setPortInput}
    connectedDevice={connectedDevice}
    connecting={connecting}
    agentBaseUrl={agentBaseUrl}
    agentToken={agentToken}
    agentCapabilities={agentCapabilities}
    agentDetecting={agentDetecting}
    agentVersion={agentVersion}
    agentManifest={agentManifest}
    agentLaunchState={agentLaunchState}
    onStartAgent={startInstalledAgent}
    onDetect={detectAgent}
    handleConnect={handleConnect}
    handleDisconnect={handleDisconnect}
    devices={devices}
    refreshDevices={refreshDevices}
    refreshingDevices={refreshingDevices}
    dangerCommand={dangerCommand}
    setDangerCommand={setDangerCommand}
    onRecordOperation={(item) => setHistory((previous) => [{ id: String(Date.now()), commandId: 'file-manager', duration: 0, ...item }, ...previous])}
  />;
}
