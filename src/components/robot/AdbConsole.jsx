import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Wifi, WifiOff, Monitor, Package, FileText, Folder, Network,
  HardDrive, Settings, Stethoscope, ChevronDown, Play, Square,
  Trash2, Download, Terminal, Search, RefreshCw, Cpu, Battery,
  Link as LinkIcon, Unlink, Activity, ShieldAlert, Layers
} from 'lucide-react';

import { useTheme } from '../../contexts/ThemeContext';
import { ADB_COMMANDS, COMMAND_CATEGORIES } from '../../config/adbCommands';
import AdbCommandCard from './AdbCommandCard';
import ExecutionHistory from './ExecutionHistory';
import RobotHealthDiagnostic from './RobotHealthDiagnostic';
import AdbTerminal from './AdbTerminal';
import DangerConfirmModal from './DangerConfirmModal';
import AdbWorkspace from './AdbWorkspace';
import { ADB_SECTIONS, TROUBLESHOOTING_FLOWS, DEVICE_SPECIFIC_INFO, TEST_SUMMARY, LOG_FILTER_KEYWORDS } from '../../config/adbData';

const AGENT_PORTS = [5038, 5039, 5040, 12553, 12554, 12555, 3001];

/**
 * 自动检测本地代理是否运行
 */
async function detectLocalAgent() {
  for (const port of AGENT_PORTS) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`, {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors',
        signal: AbortSignal.timeout(1000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          const tokenResponse = await fetch(`http://127.0.0.1:${port}/token`, {
            cache: 'no-store', mode: 'cors', signal: AbortSignal.timeout(1000),
          });
          const tokenData = tokenResponse.ok ? await tokenResponse.json() : {};
          return { baseUrl: `http://127.0.0.1:${port}`, token: tokenData.token || '' };
        }
      }
    } catch {
      // 继续探查下一个端口
    }
  }
  return null;
}

const getApiKey = () => localStorage.getItem('adb_local_agent_token') || '';

const placeholderPattern = /<([^>]+)>/g;
const toReferenceCommand = (section, item, index) => {
  const matches = [...item.cmd.matchAll(placeholderPattern)];
  const params = matches.map((match, paramIndex) => ({
    key: `value${paramIndex}`, label: match[1], type: 'text', required: true,
  }));
  return {
    id: `reference-${section.title}-${index}`,
    name: item.desc,
    category: section.title,
    description: item.desc,
    danger: item.risk || 'none',
    params,
    build: (values = {}) => item.cmd.replace(placeholderPattern, (_, __, offset) => {
      const matchIndex = [...item.cmd.slice(0, offset).matchAll(placeholderPattern)].length;
      return values[`value${matchIndex}`] || `<${matches[matchIndex]?.[1] || '参数'}>`;
    }),
  };
};

export default function AdbConsole() {
  const { theme } = useTheme();
  const outputRef = useRef(null);
  const wsRef = useRef(null);
  const hasDetectedAgentRef = useRef(false);

  // 本地代理与安全连接
  const [agentBaseUrl, setAgentBaseUrl] = useState(null);
  const [agentDetecting, setAgentDetecting] = useState(true);
  const [agentToken, setAgentToken] = useState(getApiKey());
  const [refreshingDevices, setRefreshingDevices] = useState(false);

  // 设备状态
  const [connectionInput, setConnectionInput] = useState('192.168.51.143');
  const [portInput, setPortInput] = useState('5555');
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [devices, setDevices] = useState([]);
  const [showConsole, setShowConsole] = useState(true);

  // 核心交互模式与搜索筛选
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [customCommand, setCustomCommand] = useState('adb shell ');

  // 控制台输出与终端状态
  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activePanel, setActivePanel] = useState('commands');
  const [dangerCommand, setDangerCommand] = useState(null);

  // 执行历史记录 (LocalStorage 持久化)
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('adb_exec_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('adb_exec_history', JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save execution history', e);
    }
  }, [history]);

  const addOutput = (type, data) => {
    setOutput((prev) => [...prev, { type, data, time: new Date().toLocaleTimeString() }]);
  };

  // WebSocket 实时双向流连接
  const connectWebSocket = (baseUrl, token) => {
    if (wsRef.current) wsRef.current.close();

    const wsUrl = baseUrl.replace(/^http/, 'ws') + `/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => addOutput('system', '已成功与现场 ADB 运维代理建立 WebSocket 链路');
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'start':
            setIsRunning(true);
            addOutput('command', `$ ${msg.command}`);
            break;
          case 'stdout':
            addOutput('stdout', msg.data);
            break;
          case 'stderr':
            addOutput('stderr', msg.data);
            break;
          case 'close':
            setIsRunning(false);
            if (msg.code !== 0 && msg.code !== null) {
              addOutput('error', `进程结束，退出代码: ${msg.code}`);
            }
            break;
          case 'error':
            addOutput('error', msg.data);
            setIsRunning(false);
            break;
          case 'killed':
            addOutput('system', '用户发起了终止进程指令');
            setIsRunning(false);
            break;
        }
      } catch (err) {
        addOutput('error', err.message);
      }
    };

    ws.onerror = () => addOutput('error', 'WebSocket 通信异常');
    ws.onclose = () => addOutput('system', 'WebSocket 连接已关闭');
  };

  const detectAgent = async () => {
    setAgentDetecting(true);
    const agent = await detectLocalAgent();
    const baseUrl = agent?.baseUrl || null;
    const token = agent?.token || agentToken;
    setAgentBaseUrl(baseUrl);
    if (token) {
      setAgentToken(token);
      localStorage.setItem('adb_local_agent_token', token);
    }
    setAgentDetecting(false);

    if (baseUrl) {
      addOutput('system', `已连接现场连接助手: ${baseUrl}`);
      if (token) connectWebSocket(baseUrl, token);
      refreshDevices(baseUrl, token);
    } else {
      addOutput('error', '未找到现场连接助手，请先双击启动连接助手后再重试');
    }
  };

  useEffect(() => {
    if (hasDetectedAgentRef.current) return;
    hasDetectedAgentRef.current = true;
    detectAgent();
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${agentToken}`,
  });

  // 1. 发送构建完成的文本命令执行 (HTTP API)
  const executeCommand = async (commandObj, builtCmd, paramValues) => {
    const startTime = Date.now();
    addOutput('command', `$ ${builtCmd}`);
    setIsRunning(true);

    try {
      // 优先发送安全路由 /api/adb/exec-safe，后置兜底普通 /api/adb/exec
      let res = await fetch(`${agentBaseUrl || ''}/adb/exec-safe`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          commandId: commandObj?.id,
          params: paramValues,
          rawCommand: builtCmd,
        }),
      });

      if (res.status === 404) {
        // 如果后端尚未更新 safe 路由，降级回传统 exec 接口
        res = await fetch(`${agentBaseUrl || ''}/adb/exec`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ command: builtCmd }),
        });
      }

      const data = await res.json();
      const duration = Date.now() - startTime;
      setIsRunning(false);

      const historyItem = {
        id: Date.now().toString(),
        commandId: commandObj?.id || 'custom',
        name: commandObj?.name || '自定义命令',
        category: commandObj?.category || '常用调试',
        fullCmd: builtCmd,
        timestamp: new Date().toLocaleTimeString(),
        duration,
        status: data.success ? 'success' : 'error',
        output: data.stdout || data.message || '',
        error: data.error || data.stderr || '',
      };

      setHistory((prev) => [historyItem, ...prev]);

      if (data.success) {
        if (data.stdout) addOutput('stdout', data.stdout);
        if (data.stderr) addOutput('stderr', data.stderr);
      } else {
        addOutput('error', data.error || data.stderr || '命令执行失败');
      }

      return data;
    } catch (e) {
      const duration = Date.now() - startTime;
      setIsRunning(false);
      addOutput('error', `请求服务端发生致命错误: ${e.message}`);

      setHistory((prev) => [
        {
          id: Date.now().toString(),
          commandId: commandObj?.id || 'custom',
          name: commandObj?.name || '自定义命令',
          category: commandObj?.category || '常用调试',
          fullCmd: builtCmd,
          timestamp: new Date().toLocaleTimeString(),
          duration,
          status: 'error',
          error: e.message,
        },
        ...prev,
      ]);
    }
  };

  // 2. 流式 WebSocket 执行（适合无限日志输出）
  const executeStream = (command) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addOutput('error', 'WebSocket 链路未建立，无法开启实时数据流');
      return;
    }
    wsRef.current.send(JSON.stringify({ type: 'exec-stream', command }));
  };

  // 设备连接控制
  const handleConnect = async () => {
    if (!connectionInput) {
      addOutput('error', '请输入设备 IP 地址');
      return;
    }
    if (!agentBaseUrl) {
      addOutput('error', '未检测到现场连接助手，请先启动连接助手后点击重新检测');
      return;
    }
    setConnecting(true);
    const targetIp = connectionInput.trim();
    const targetPort = portInput.trim() || '5555';
    try {
      const res = await fetch(`${agentBaseUrl}/adb/connect`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ip: targetIp,
          port: targetPort,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConnectedDevice(data.device || `${targetIp}:${targetPort}`);
        addOutput('system', `成功握手远程网络设备: ${data.device || `${targetIp}:${targetPort}`}`);
        refreshDevices();
      } else {
        addOutput('error', `连接失败: ${data.error || data.message}`);
      }
    } catch (e) {
      addOutput('error', `网络连接失败: ${e.message}`);
    }
    setConnecting(false);
  };

  const handleDisconnect = async (device) => {
    if (!agentBaseUrl) {
      addOutput('error', '未检测到现场连接助手，请先启动连接助手后点击重新检测');
      return;
    }
    setRefreshingDevices(true);
    try {
      await fetch(`${agentBaseUrl}/adb/disconnect`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ device }),
      });
      if (device === connectedDevice) setConnectedDevice(null);
      addOutput('system', `已断开连接: ${device}`);
      refreshDevices();
    } catch (e) {
      addOutput('error', `断开命令失败: ${e.message}`);
    } finally {
      setRefreshingDevices(false);
    }
  };

  const refreshDevices = async (baseUrl = agentBaseUrl, token = agentToken) => {
    if (!baseUrl) {
      addOutput('error', '连接助手未运行，无法刷新设备');
      return;
    }
    setRefreshingDevices(true);
    try {
      const res = await fetch(`${baseUrl}/adb/devices`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || '设备列表获取失败');
      setDevices(data.devices || []);
      addOutput('system', `已刷新设备列表，共 ${data.devices?.length || 0} 台设备`);
    } catch (e) {
      console.error('设备列表感知异常:', e);
      addOutput('error', `刷新设备失败: ${e.message}`);
    } finally {
      setRefreshingDevices(false);
    }
  };

  // 仅保留配置有交互参数的 ADB 命令卡片，过滤纯静态无参命令（避免与下方参考面板重复）
  const libraryCommands = useMemo(() => {
    const configured = Array.isArray(ADB_COMMANDS) ? ADB_COMMANDS.filter(Boolean) : [];
    const configuredTexts = new Set(configured.map((command) => {
      try { return command.build({}); } catch { return ''; }
    }));
    const references = ADB_SECTIONS.flatMap((section) => section.commands.map((item, index) => toReferenceCommand(section, item, index)))
      .filter((command) => {
        const text = command.build({});
        if (configuredTexts.has(text)) return false;
        configuredTexts.add(text);
        return true;
      });
    return [...configured, ...references];
  }, []);

  // 模糊搜索与分类筛选过滤
  const filteredCommands = useMemo(() => {
    return libraryCommands.filter((cmd) => {
      if (!cmd) return false;
      // 1. 分类筛选
      const matchCategory = selectedCategory === '全部' || cmd.category === selectedCategory;
      if (!matchCategory) return false;

      // 2. 关键词模糊匹配
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (cmd.name && cmd.name.toLowerCase().includes(q)) ||
        (cmd.category && cmd.category.toLowerCase().includes(q)) ||
        (cmd.description && cmd.description.toLowerCase().includes(q)) ||
        (cmd.id && cmd.id.toLowerCase().includes(q))
      );
    });
  }, [libraryCommands, selectedCategory, searchQuery]);

  const commandGroups = useMemo(() => {
    const groups = [];
    filteredCommands.forEach((command) => {
      let group = groups.find((item) => item.category === command.category);
      if (!group) {
        group = { category: command.category, commands: [] };
        groups.push(group);
      }
      group.commands.push(command);
    });
    return groups;
  }, [filteredCommands]);

  const fillTerminal = (command, builtCmd) => {
    if (!builtCmd) return;
    if (customCommand.trim() && customCommand.trim() !== builtCmd.trim() && !window.confirm('终端中已有命令，是否替换？')) return;
    setCustomCommand(builtCmd);
    addOutput('system', `已填入终端：${builtCmd}`);
  };

  const handleTerminalExecute = (commandText) => {
    const builtCmd = commandText.trim();
    if (!builtCmd) return;
    const matched = libraryCommands.find((command) => {
      try { return command.build({}) === builtCmd; } catch { return false; }
    });
    const highRisk = matched?.danger === 'high' || /(rm\s+-r[f]?|reboot|pm\s+clear|adb\s+root)/i.test(builtCmd);
    const command = matched || { id: 'custom', name: '自定义命令', description: '终端中输入的命令', danger: highRisk ? 'high' : 'none' };
    if (highRisk) {
      setDangerCommand({ command: { ...command, danger: 'high' }, builtCmd });
      return;
    }
    executeCommand(command, builtCmd, {});
  };

  const outputStyles = {
    command: 'text-blue-400 font-bold',
    stdout: 'text-emerald-300',
    stderr: 'text-amber-300',
    error: 'text-rose-400',
    system: 'text-purple-400',
  };

  const executeFromTerminal = (commandText, commandObj) => {
    if (commandObj) {
      executeCommand(commandObj, commandText, {});
      return;
    }
    handleTerminalExecute(commandText);
  };

  return (
    <AdbWorkspace
      theme={theme}
      commands={libraryCommands}
      output={output}
      outputRef={outputRef}
      customCommand={customCommand}
      setCustomCommand={setCustomCommand}
      onExecute={executeFromTerminal}
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
      agentDetecting={agentDetecting}
      onDetect={detectAgent}
      handleConnect={handleConnect}
      handleDisconnect={handleDisconnect}
      devices={devices}
      refreshDevices={refreshDevices}
      refreshingDevices={refreshingDevices}
      dangerCommand={dangerCommand}
      setDangerCommand={setDangerCommand}
    />
  );

  return (
    <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-fadeIn">
      {/* 运维平台 Header */}
      <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-950/80 border border-blue-800/80 text-blue-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>机器人现场运维平台</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                Robot Service Platform v2.0
              </span>
            </h1>
            <p className="text-xs text-slate-400">参数化配置驱动 · 危险级别防控 · 一键健康排查</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!agentDetecting && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${agentBaseUrl
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
            >
              {agentBaseUrl ? <LinkIcon className="w-3.5 h-3.5 text-emerald-400" /> : <Unlink className="w-3.5 h-3.5" />}
              {agentBaseUrl ? '代理服务已就绪' : '未链接本地代理'}
            </span>
          )}

          <button
            onClick={() => setShowConsole(!showConsole)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showConsole ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {showConsole && (
        <div className="p-6 space-y-6">
          {/* 融合增强后的设备连接区域 */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                {connectedDevice ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-slate-500" />}
                <span>远程 ADB 无线连接 (TCP/IP)</span>
                {connectedDevice && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                    已连接: {connectedDevice}
                  </span>
                )}
              </div>
              <button
                onClick={refreshDevices}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/60"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>感知设备列表</span>
              </button>
            </div>

            {/* IP 地址 + 端口号 + 建立连接按钮 */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              {/* 设备 IP */}
              <div className="sm:col-span-6 space-y-1">
                <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                  <span>设备 IP 地址 <span className="text-rose-400">*</span></span>
                  <span className="text-[10px] text-slate-500 font-mono">IPv4</span>
                </label>
                <input
                  type="text"
                  value={connectionInput}
                  onChange={(e) => setConnectionInput(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* ADB 端口 */}
              <div className="sm:col-span-3 space-y-1">
                <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                  <span>ADB 端口</span>
                  <span className="text-[10px] text-slate-500 font-mono">默认 5555</span>
                </label>
                <input
                  type="text"
                  value={portInput}
                  onChange={(e) => setPortInput(e.target.value)}
                  placeholder="5555"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 连接控制按键 */}
              <div className="sm:col-span-3">
                <button
                  onClick={connectedDevice ? () => handleDisconnect(connectedDevice) : handleConnect}
                  disabled={connecting || (!connectedDevice && !connectionInput)}
                  className={`w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    connectedDevice
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/40'
                      : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shadow-md shadow-blue-950/40'
                  }`}
                >
                  {connecting ? '正在连接...' : connectedDevice ? '断开设备连接' : '建立远程连接'}
                </button>
              </div>
            </div>

            {/* 生成代码控制预览 */}
            <div className="flex flex-wrap items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">生成的 ADB 命令:</span>
                <code className="text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  adb connect {connectionInput || '<IP>'}:{portInput || '5555'}
                </code>
              </div>
            </div>

            {/* 设备列表 */}
            {devices.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {devices.map((dev, i) => (
                  <div
                    key={i}
                    className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-slate-200">{dev.serial}</span>
                    <span className="text-slate-500">({dev.model || dev.state})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 双栏响应式主布局区域：左侧独立吸顶终端，右侧参数化卡片面板 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 左侧：独立吸顶终端区 (lg:col-span-5) */}
            <div className="lg:col-span-5 sticky top-20">
              <AdbTerminal
                output={output}
                onClearOutput={() => setOutput([])}
                customCommand={customCommand}
                setCustomCommand={setCustomCommand}
                onExecuteCustom={(cmd) => executeCommand({ id: 'custom', name: '自定义命令' }, cmd, {})}
                onExecuteStream={executeStream}
                isRunning={isRunning}
                history={history}
                onClearHistory={() => setHistory([])}
                outputRef={outputRef}
                agentBaseUrl={agentBaseUrl}
              />
            </div>

            {/* 右侧：健康诊断 + 搜索分类 + 参数化命令卡片网格 (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-6">
              {/* 机器人一键健康诊断面板 */}
              <RobotHealthDiagnostic
                onRunBatchExec={(cmd) => executeCommand({ id: 'diagnostic', name: '一键诊断', category: '核心诊断' }, cmd, {})}
              />

              {/* 搜索与分类 Tab 工具栏 */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  {/* 搜索框 */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜索参数化配置命令..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono transition-colors"
                    />
                  </div>
                </div>

                {/* 十大分类选择 Tab 轴 */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory('全部')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${selectedCategory === '全部'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-950/40'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                  >
                    全部参数命令 ({parameterizedCommands.length})
                  </button>

                  {COMMAND_CATEGORIES.map((cat) => {
                    const count = parameterizedCommands.filter((c) => c.category === cat).length;
                    const isActive = selectedCategory === cat;

                    if (count === 0) return null;

                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 ${isActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-950/40'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                          }`}
                      >
                        <span>{cat}</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-950/60 text-[10px] font-mono">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 动态参数命令卡片网格列表 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredCommands.length > 0 ? (
                  filteredCommands.map((command) => (
                    <AdbCommandCard
                      key={command.id}
                      command={command}
                      onExecute={executeCommand}
                      isExecuting={isRunning}
                    />
                  ))
                ) : (
                  <div className="col-span-full py-12 bg-slate-900/40 rounded-xl border border-slate-800/60 text-center space-y-2">
                    <Layers className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">未找到匹配的参数化 ADB 配置命令</p>
                    <p className="text-[11px] text-slate-500">静态无参命令请参阅下方的《ADB 命令参考手册》</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
