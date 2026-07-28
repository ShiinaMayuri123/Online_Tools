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

const AGENT_PORTS = [5038, 5039, 5040, 12553, 12554, 3001];

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
        if (data.ok) return `http://127.0.0.1:${port}`;
      }
    } catch {
      // 继续探查下一个端口
    }
  }
  return null;
}

const getApiKey = () => localStorage.getItem('adb_local_agent_token') || '';

export default function AdbConsole() {
  const { theme } = useTheme();
  const outputRef = useRef(null);
  const wsRef = useRef(null);

  // 本地代理与安全连接
  const [agentBaseUrl, setAgentBaseUrl] = useState(null);
  const [agentDetecting, setAgentDetecting] = useState(true);
  const [agentToken, setAgentToken] = useState(getApiKey());

  // 设备状态
  const [connectionInput, setConnectionInput] = useState('192.168.51.143');
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

  useEffect(() => {
    const detect = async () => {
      setAgentDetecting(true);
      const baseUrl = await detectLocalAgent();
      setAgentBaseUrl(baseUrl);
      setAgentDetecting(false);

      if (baseUrl) {
        addOutput('system', `已感知到机器代理服务运行于: ${baseUrl}`);
        if (agentToken) connectWebSocket(baseUrl, agentToken);
      } else {
        addOutput('system', '未发现可用的本地 ADB 代理服务');
      }
    };
    detect();
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
      let res = await fetch(`${agentBaseUrl || ''}/api/adb/exec-safe`, {
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
        res = await fetch(`${agentBaseUrl || ''}/api/adb/exec`, {
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
    if (!connectionInput || !agentBaseUrl) return;
    setConnecting(true);
    const targetIp = connectionInput.trim();
    const targetPort = portInput.trim() || '5555';
    try {
      const res = await fetch(`${agentBaseUrl}/api/adb/connect`, {
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
    if (!agentBaseUrl) return;
    try {
      await fetch(`${agentBaseUrl}/api/adb/disconnect`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ device }),
      });
      if (device === connectedDevice) setConnectedDevice(null);
      addOutput('system', `已断开连接: ${device}`);
      refreshDevices();
    } catch (e) {
      addOutput('error', `断开命令失败: ${e.message}`);
    }
  };

  const refreshDevices = async () => {
    if (!agentBaseUrl) return;
    try {
      const res = await fetch(`${agentBaseUrl}/api/adb/devices`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setDevices(data.devices);
    } catch (e) {
      console.error('设备列表感知异常:', e);
    }
  };

  // 仅保留配置有交互参数的 ADB 命令卡片，过滤纯静态无参命令（避免与下方参考面板重复）
  const parameterizedCommands = useMemo(() => {
    if (!Array.isArray(ADB_COMMANDS)) return [];
    return ADB_COMMANDS.filter((c) => c && Array.isArray(c.params) && c.params.length > 0);
  }, []);

  // 模糊搜索与分类筛选过滤
  const filteredCommands = useMemo(() => {
    return parameterizedCommands.filter((cmd) => {
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
  }, [parameterizedCommands, selectedCategory, searchQuery]);

  const outputStyles = {
    command: 'text-blue-400 font-bold',
    stdout: 'text-emerald-300',
    stderr: 'text-amber-300',
    error: 'text-rose-400',
    system: 'text-purple-400',
  };

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
