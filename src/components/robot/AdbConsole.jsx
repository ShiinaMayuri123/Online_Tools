import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Wifi, WifiOff, Monitor, Package, FileText, Folder, Network,
  HardDrive, Settings, Stethoscope, ChevronDown, ChevronRight,
  Play, Square, Trash2, Download, Terminal, X, Search, Copy, Check,
  AlertTriangle, Shield, RefreshCw, Cpu, Battery,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import useClipboard from '../../hooks/useClipboard';
import { ADB_SECTIONS, TROUBLESHOOTING_FLOWS, LOG_FILTER_KEYWORDS } from '../../config/adbData';

const API_BASE = '/api';
const WS_URL = 'ws://localhost:3001';

// API 密钥配置 - 首次运行服务器时获取
const getApiKey = () => {
  // 从 localStorage 获取，或使用默认值
  return localStorage.getItem('adb_api_key') || '';
};

/** 功能模块配置 */
const MODULES = [
  { id: 'device-info', label: '设备信息', icon: HardDrive, color: 'text-blue-600' },
  { id: 'app-manager', label: '应用管理', icon: Package, color: 'text-purple-600' },
  { id: 'log-viewer', label: '日志查看', icon: FileText, color: 'text-green-600' },
  { id: 'screen-control', label: '屏幕控制', icon: Monitor, color: 'text-orange-600' },
  { id: 'network', label: '网络诊断', icon: Network, color: 'text-cyan-600' },
  { id: 'file-ops', label: '文件操作', icon: Folder, color: 'text-yellow-600' },
  { id: 'system', label: '系统控制', icon: Settings, color: 'text-red-600' },
  { id: 'troubleshoot', label: '故障排查', icon: Stethoscope, color: 'text-pink-600' },
];

const AdbConsole = () => {
  const { theme } = useTheme();
  const { copiedKey, copy } = useClipboard();
  const outputRef = useRef(null);
  const wsRef = useRef(null);

  // 连接状态
  const [connectionInput, setConnectionInput] = useState('192.168.51.143');
  const [apiKeyInput, setApiKeyInput] = useState(getApiKey());
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [devices, setDevices] = useState([]);
  const [showConsole, setShowConsole] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);

  // 命令执行状态
  const [activeModule, setActiveModule] = useState('device-info');
  const [customCommand, setCustomCommand] = useState('adb shell ');
  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [logLevel, setLogLevel] = useState('all');

  // WebSocket 连接
  useEffect(() => {
    const apiKey = getApiKey();
    const ws = new WebSocket(`${WS_URL}?token=${apiKey}`);
    wsRef.current = ws;

    ws.onopen = () => {
      addOutput('system', '已连接到 ADB 控制台服务器');
    };

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
              addOutput('error', `进程退出，代码: ${msg.code}`);
            }
            break;
          case 'error':
            addOutput('error', msg.data);
            setIsRunning(false);
            break;
          case 'killed':
            addOutput('system', '命令已终止');
            setIsRunning(false);
            break;
        }
      } catch (e) {
        addOutput('error', e.message);
      }
    };

    ws.onerror = () => {
      addOutput('error', 'WebSocket 连接失败，请确保服务器已启动');
    };

    return () => {
      ws.close();
    };
  }, []);

  // 自动滚动
  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  // 添加输出
  const addOutput = (type, data) => {
    setOutput(prev => [...prev, { type, data, time: new Date().toLocaleTimeString() }]);
  };

  // 执行命令（流式）
  const executeStream = (command) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addOutput('error', 'WebSocket 未连接');
      return;
    }
    wsRef.current.send(JSON.stringify({ type: 'exec-stream', command }));
  };

  // 执行命令（HTTP）
  const executeHttp = async (command) => {
    addOutput('command', `$ ${command}`);
    try {
      const res = await fetch(`${API_BASE}/adb/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiKey()}`
        },
        body: JSON.stringify({ command })
      });
      const data = await res.json();
      if (data.success) {
        if (data.stdout) addOutput('stdout', data.stdout);
        if (data.stderr) addOutput('stderr', data.stderr);
      } else {
        addOutput('error', data.error || data.stderr);
      }
    } catch (e) {
      addOutput('error', `请求失败: ${e.message}`);
    }
  };

  // 连接设备
  const handleConnect = async () => {
    if (!connectionInput) return;
    setConnecting(true);
    try {
      const res = await fetch(`${API_BASE}/adb/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiKey()}`
        },
        body: JSON.stringify({ ip: connectionInput.split(':')[0], port: connectionInput.split(':')[1] || 5555 })
      });
      const data = await res.json();
      if (data.success) {
        setConnectedDevice(data.device);
        addOutput('system', `已连接到设备: ${data.device}`);
        refreshDevices();
      } else {
        addOutput('error', `连接失败: ${data.error || data.message}`);
      }
    } catch (e) {
      addOutput('error', `连接失败: ${e.message}`);
    }
    setConnecting(false);
  };

  // 断开连接
  const handleDisconnect = async (device) => {
    try {
      await fetch(`${API_BASE}/adb/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiKey()}`
        },
        body: JSON.stringify({ device })
      });
      if (device === connectedDevice) setConnectedDevice(null);
      addOutput('system', `已断开: ${device}`);
      refreshDevices();
    } catch (e) {
      addOutput('error', `断开失败: ${e.message}`);
    }
  };

  // 刷新设备列表
  const refreshDevices = async () => {
    try {
      const res = await fetch(`${API_BASE}/adb/devices`, {
        headers: { 'Authorization': `Bearer ${getApiKey()}` }
      });
      const data = await res.json();
      if (data.success) setDevices(data.devices);
    } catch (e) {
      console.error('刷新设备失败:', e);
    }
  };

  // 终止当前命令
  const killCommand = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'kill' }));
    }
  };

  // 清空输出
  const clearOutput = () => setOutput([]);

  // 导出输出
  const exportOutput = () => {
    const text = output.map(o => `[${o.time}] ${o.data}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adb-output-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 获取当前模块对应的命令
  const moduleCommands = useMemo(() => {
    const sectionMap = {
      'device-info': '设备信息',
      'app-manager': '应用管理',
      'log-viewer': '日志与调试',
      'screen-control': '屏幕与输入',
      'network': '网络诊断',
      'file-ops': '文件操作',
      'system': '系统控制',
    };

    if (activeModule === 'troubleshoot') {
      return TROUBLESHOOTING_FLOWS;
    }

    const section = ADB_SECTIONS.find(s => s.title === sectionMap[activeModule]);
    return section?.commands || [];
  }, [activeModule]);

  // 输出类型样式
  const outputStyles = {
    command: 'text-blue-400 font-bold',
    stdout: 'text-green-300',
    stderr: 'text-yellow-300',
    error: 'text-red-400',
    system: 'text-purple-400',
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200 shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 标题栏 */}
      <button
        onClick={() => setShowConsole(!showConsole)}
        className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
            <Terminal size={18} />
          </div>
          <span className="text-base sm:text-lg font-bold text-slate-800">ADB 控制台</span>
          {connectedDevice && (
            <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
              已连接
            </span>
          )}
        </div>
        <ChevronDown
          size={20}
          className={`text-slate-400 transition-transform duration-200 ${showConsole ? 'rotate-180' : ''}`}
        />
      </button>

      {showConsole && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 animate-in fade-in duration-200">

          {/* 设备连接区域 */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              {connectedDevice ? (
                <Wifi size={18} className="text-emerald-500" />
              ) : (
                <WifiOff size={18} className="text-slate-400" />
              )}
              <span className="text-sm font-bold text-slate-700">设备连接</span>
            </div>

            {/* API 密钥输入 */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-xs font-medium text-slate-600">API 密钥</label>
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? '隐藏' : '显示'}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="输入服务器 API 密钥"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 text-xs font-mono"
                />
                <button
                  onClick={() => {
                    localStorage.setItem('adb_api_key', apiKeyInput);
                    addOutput('system', 'API 密钥已保存');
                  }}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  保存
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                首次运行服务器时会显示密钥，请复制保存
              </p>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={connectionInput}
                onChange={(e) => setConnectionInput(e.target.value)}
                placeholder="输入设备 IP 地址"
                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm font-mono"
              />
              <button
                onClick={handleConnect}
                disabled={connecting || !connectionInput}
                className={`px-4 py-2.5 rounded-lg font-bold text-sm text-white transition-all ${
                  connectedDevice
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : `${theme.primaryBg} ${theme.primaryHover}`
                } disabled:opacity-50`}
              >
                {connecting ? '连接中...' : connectedDevice ? '已连接' : '连接'}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={refreshDevices}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RefreshCw size={14} />
                刷新设备列表
              </button>
              {connectedDevice && (
                <button
                  onClick={() => handleDisconnect(connectedDevice)}
                  className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  断开连接
                </button>
              )}
            </div>

            {/* 已连接设备列表 */}
            {devices.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-slate-500 font-medium">已连接设备：</p>
                {devices.map((dev, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2.5 rounded-lg border ${
                      dev.serial === connectedDevice
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${dev.state === 'device' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className="font-mono text-sm text-slate-700">{dev.serial}</span>
                      {dev.model && <span className="text-xs text-slate-500">({dev.model})</span>}
                    </div>
                    <button
                      onClick={() => handleDisconnect(dev.serial)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      断开
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 功能模块选择 */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`p-3 rounded-xl text-center transition-all ${
                    activeModule === mod.id
                      ? `${theme.primaryBg} text-white shadow-md`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon size={18} className="mx-auto mb-1" />
                  <span className="text-xs font-bold">{mod.label}</span>
                </button>
              );
            })}
          </div>

          {/* 命令按钮区 */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-slate-700">
                {MODULES.find(m => m.id === activeModule)?.label}
              </span>
            </div>

            {activeModule === 'troubleshoot' ? (
              // 故障排查流程
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TROUBLESHOOTING_FLOWS.map((flow) => {
                  const Icon = flow.icon;
                  return (
                    <div key={flow.id} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={16} className="text-orange-500" />
                        <span className="text-sm font-bold text-slate-700">{flow.title}</span>
                      </div>
                      <div className="space-y-1.5">
                        {flow.steps.map((step, i) => (
                          <button
                            key={i}
                            onClick={() => executeHttp(step.cmd)}
                            className="w-full text-left px-3 py-2 text-xs font-mono text-slate-600 hover:bg-white rounded-lg transition-colors"
                          >
                            {step.cmd}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // 普通命令按钮
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {moduleCommands.map((cmd, i) => (
                  <button
                    key={i}
                    onClick={() => executeHttp(cmd.cmd)}
                    disabled={isRunning}
                    className="px-3 py-2.5 text-left text-xs font-mono text-slate-600 hover:bg-white rounded-lg border border-slate-200 transition-colors disabled:opacity-50 truncate"
                    title={cmd.desc}
                  >
                    {cmd.cmd.replace('adb ', '')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 自定义命令输入 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeHttp(customCommand)}
              placeholder="输入自定义 ADB 命令"
              className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm font-mono"
            />
            <button
              onClick={() => executeHttp(customCommand)}
              disabled={isRunning || !customCommand}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm text-white transition-all ${theme.primaryBg} ${theme.primaryHover} disabled:opacity-50`}
            >
              <Play size={16} />
            </button>
          </div>

          {/* 执行结果输出 */}
          <div className="bg-slate-900 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800">
              <span className="text-xs font-bold text-slate-400">执行结果</span>
              <div className="flex items-center gap-2">
                {isRunning && (
                  <button
                    onClick={killCommand}
                    className="px-2 py-1 text-xs font-bold text-red-400 hover:bg-slate-700 rounded transition-colors"
                  >
                    <Square size={12} className="inline mr-1" />
                    终止
                  </button>
                )}
                <button
                  onClick={clearOutput}
                  className="px-2 py-1 text-xs text-slate-400 hover:bg-slate-700 rounded transition-colors"
                >
                  <Trash2 size={12} className="inline mr-1" />
                  清空
                </button>
                <button
                  onClick={exportOutput}
                  className="px-2 py-1 text-xs text-slate-400 hover:bg-slate-700 rounded transition-colors"
                >
                  <Download size={12} className="inline mr-1" />
                  导出
                </button>
              </div>
            </div>
            <div
              ref={outputRef}
              className="p-4 h-64 overflow-y-auto font-mono text-xs leading-relaxed"
            >
              {output.length === 0 ? (
                <p className="text-slate-500">等待命令执行...</p>
              ) : (
                output.map((line, i) => (
                  <div key={i} className={`${outputStyles[line.type] || 'text-slate-300'} whitespace-pre-wrap break-all`}>
                    {line.data}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default AdbConsole;
