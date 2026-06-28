import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Wifi, WifiOff, Monitor, Package, FileText, Folder, Network,
  HardDrive, Settings, Stethoscope, ChevronDown, ChevronRight,
  Play, Square, Trash2, Download, Terminal, X, Search, Copy, Check,
  AlertTriangle, Shield, RefreshCw, Cpu, Battery, Link, Unlink,
  CheckCircle, BookOpen, Zap,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { ADB_SECTIONS, TROUBLESHOOTING_FLOWS, LOG_FILTER_KEYWORDS } from '../../config/adbData';
import LocalAgentGuide from './LocalAgentGuide';

// ============ 本地代理配置 ============

// 候选端口列表（避免使用 5037，那是 adb server 默认端口）
const AGENT_PORTS = [5038, 5039, 5040, 12553, 12554];

/**
 * 检测本地代理是否运行
 * @returns {Promise<string|null>} 代理地址，未检测到返回 null
 */
async function detectLocalAgent() {
  for (const port of AGENT_PORTS) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`, {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors',
        signal: AbortSignal.timeout(1000) // 1 秒超时
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          return `http://127.0.0.1:${port}`;
        }
      }
    } catch {
      // 继续尝试下一个端口
    }
  }
  return null;
}

/**
 * 获取 API Token
 * @returns {string}
 */
const getApiKey = () => {
  return localStorage.getItem('adb_local_agent_token') || '';
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
  const outputRef = useRef(null);
  const wsRef = useRef(null);

  // 本地代理状态
  const [agentBaseUrl, setAgentBaseUrl] = useState(null); // 检测到的代理地址
  const [agentDetecting, setAgentDetecting] = useState(true); // 检测中
  const [agentToken, setAgentToken] = useState(getApiKey()); // Token

  // 连接状态
  const [connectionInput, setConnectionInput] = useState('192.168.51.143');
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [devices, setDevices] = useState([]);
  const [showConsole, setShowConsole] = useState(true);
  const [showToken, setShowToken] = useState(false);

  // 命令执行状态
  const [activeModule, setActiveModule] = useState('device-info');
  const [customCommand, setCustomCommand] = useState('adb shell ');
  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [autoScroll] = useState(true);
  const [showQuickStart, setShowQuickStart] = useState(false);

  // 一键扫描设备信息状态
  const [deviceInfoScanning, setDeviceInfoScanning] = useState(false);
  const [deviceInfoResult, setDeviceInfoResult] = useState(null);

  // 添加输出
  const addOutput = (type, data) => {
    setOutput(prev => [...prev, { type, data, time: new Date().toLocaleTimeString() }]);
  };

  // 连接 WebSocket
  const connectWebSocket = (baseUrl, token) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = baseUrl.replace(/^http/, 'ws') + `/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      addOutput('system', '已连接到本地代理');
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
      } catch (err) {
        addOutput('error', err.message);
      }
    };

    ws.onerror = () => {
      addOutput('error', 'WebSocket 连接失败，请检查本地代理是否运行');
    };

    ws.onclose = () => {
      addOutput('system', 'WebSocket 连接已断开');
    };
  };

  // 处理 Token 提交（配对）
  const handleTokenSubmit = (token) => {
    setAgentToken(token);
    localStorage.setItem('adb_local_agent_token', token);

    if (agentBaseUrl) {
      connectWebSocket(agentBaseUrl, token);
      addOutput('system', 'Token 已保存，正在重新连接...');
    }
  };

  // 刷新代理检测
  const refreshAgentDetection = async () => {
    setAgentDetecting(true);
    const baseUrl = await detectLocalAgent();
    setAgentBaseUrl(baseUrl);
    setAgentDetecting(false);

    if (baseUrl && agentToken) {
      connectWebSocket(baseUrl, agentToken);
    }
  };

  // 检测本地代理（组件挂载时执行一次）
  useEffect(() => {
    const detect = async () => {
      setAgentDetecting(true);
      const baseUrl = await detectLocalAgent();
      setAgentBaseUrl(baseUrl);
      setAgentDetecting(false);

      if (baseUrl) {
        addOutput('system', `已检测到本地代理: ${baseUrl}`);
        // 如果有 Token，自动连接 WebSocket
        if (agentToken) {
          connectWebSocket(baseUrl, agentToken);
        }
      } else {
        addOutput('system', '未检测到本地代理，请先下载并运行');
      }
    };
    detect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自动滚动
  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  // 执行命令（流式）
  const executeStream = (command) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addOutput('error', 'WebSocket 未连接');
      return;
    }
    wsRef.current.send(JSON.stringify({ type: 'exec-stream', command }));
  };

  // 构建请求头
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${agentToken}`
  });

  // 执行命令（HTTP）
  const executeHttp = async (command) => {
    if (!agentBaseUrl) {
      addOutput('error', '未连接到本地代理，请先配对');
      return;
    }

    addOutput('command', `$ ${command}`);
    try {
      const res = await fetch(`${agentBaseUrl}/adb/exec`, {
        method: 'POST',
        headers: getHeaders(),
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

  // 一键扫描设备信息（调用批量 API）
  const handleDeviceInfoScan = async () => {
    if (!agentBaseUrl) {
      addOutput('error', '未连接到本地代理，请先配对');
      return;
    }

    setDeviceInfoScanning(true);
    setDeviceInfoResult(null);
    addOutput('command', '$ 一键扫描设备信息 (15条命令并发)');

    try {
      const res = await fetch(`${agentBaseUrl}/adb/device-info/scan`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setDeviceInfoResult(data.data);
        addOutput('stdout', '✓ 设备信息扫描完成');
      } else {
        addOutput('error', data.error || '扫描失败');
      }
    } catch (e) {
      addOutput('error', `扫描失败: ${e.message}`);
    } finally {
      setDeviceInfoScanning(false);
    }
  };

  // 连接设备
  const handleConnect = async () => {
    if (!connectionInput || !agentBaseUrl) return;
    setConnecting(true);
    try {
      const res = await fetch(`${agentBaseUrl}/adb/connect`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ip: connectionInput.split(':')[0],
          port: connectionInput.split(':')[1] || 5555
        })
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
    if (!agentBaseUrl) return;
    try {
      await fetch(`${agentBaseUrl}/adb/disconnect`, {
        method: 'POST',
        headers: getHeaders(),
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
    if (!agentBaseUrl) return;
    try {
      const res = await fetch(`${agentBaseUrl}/adb/devices`, {
        headers: getHeaders()
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
          {/* 本地代理状态 */}
          {!agentDetecting && (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              agentBaseUrl
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-500'
            }`}>
              {agentBaseUrl ? '代理已连接' : '代理未连接'}
            </span>
          )}
          {connectedDevice && (
            <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
              设备已连接
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
          <div className={`p-4 bg-slate-50 rounded-xl border border-slate-200 ${!agentBaseUrl ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              {connectedDevice ? (
                <Wifi size={18} className="text-emerald-500" />
              ) : (
                <WifiOff size={18} className="text-slate-400" />
              )}
              <span className="text-sm font-bold text-slate-700">设备连接</span>
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
                onClick={connectedDevice ? () => handleDisconnect(connectedDevice) : handleConnect}
                disabled={connecting || (!connectedDevice && !connectionInput)}
                className={`px-4 py-2.5 rounded-lg font-bold text-sm text-white transition-all ${
                  connectedDevice
                    ? 'bg-red-500 hover:bg-red-600'
                    : `${theme.primaryBg} ${theme.primaryHover}`
                } disabled:opacity-50`}
              >
                {connecting ? '连接中...' : connectedDevice ? '断开连接' : '连接'}
              </button>
            </div>

            <button
              onClick={refreshDevices}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={14} />
              刷新设备列表
            </button>

            {/* 已连接设备列表 */}
            {devices.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-slate-500 font-medium">已连接设备：</p>
                {devices.map((dev, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                      dev.serial === connectedDevice
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${dev.state === 'device' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="font-mono text-sm text-slate-700">{dev.serial}</span>
                    {dev.model && <span className="text-xs text-slate-500">({dev.model})</span>}
                    {dev.serial === connectedDevice && (
                      <span className="ml-auto text-xs font-bold text-emerald-600">当前</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 功能模块选择 */}
          <div className={`grid grid-cols-4 sm:grid-cols-8 gap-2 ${!agentBaseUrl ? 'opacity-50 pointer-events-none' : ''}`}>
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
          <div className={`bg-slate-50 rounded-xl border border-slate-200 p-4 ${!agentBaseUrl ? 'opacity-50 pointer-events-none' : ''}`}>
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
            ) : activeModule === 'device-info' ? (
              // 设备信息模块：一键扫描 + 单条命令
              <div className="space-y-4">
                {/* 一键扫描按钮 */}
                <button
                  onClick={handleDeviceInfoScan}
                  disabled={deviceInfoScanning}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm text-white transition-all ${
                    deviceInfoScanning
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  {deviceInfoScanning ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Zap size={16} />
                  )}
                  {deviceInfoScanning ? '扫描中...' : '一键扫描设备信息（15条命令）'}
                </button>

                {/* 扫描结果 */}
                {deviceInfoResult && (
                  <div className="bg-white rounded-lg border border-blue-200 p-4 space-y-3">
                    <h4 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                      <CheckCircle size={14} />
                      扫描结果
                    </h4>
                    {/* 基本信息 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {[
                        { label: 'Android 版本', key: 'android_version' },
                        { label: '设备型号', key: 'device_model' },
                        { label: '设备品牌', key: 'device_name' },
                        { label: '序列号', key: 'serial_number' },
                        { label: '屏幕分辨率', key: 'screen_resolution' },
                        { label: '屏幕密度', key: 'screen_density' },
                        { label: '设备时间', key: 'device_time' },
                        { label: '运行时长', key: 'uptime' },
                        { label: 'IP 地址', key: 'ip_address' },
                      ].map(({ label, key }) => (
                        <div key={key} className="flex justify-between gap-2 py-1.5 border-b border-slate-100">
                          <span className="text-slate-500 shrink-0">{label}</span>
                          <span className="font-mono text-slate-700 text-right truncate" title={typeof deviceInfoResult[key]?.value === 'string' ? deviceInfoResult[key].value : ''}>
                            {typeof deviceInfoResult[key]?.value === 'string'
                              ? deviceInfoResult[key].value.split('\n')[0]
                              : deviceInfoResult[key]?.value || '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* 电池信息 */}
                    {deviceInfoResult.battery_status?.value && (
                      <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                        <Battery size={16} className="text-green-600" />
                        <span className="text-xs font-bold text-green-700">
                          电量 {deviceInfoResult.battery_status.value.level}%
                          · 温度 {deviceInfoResult.battery_status.value.temperature}°C
                          · {deviceInfoResult.battery_status.value.status}
                        </span>
                      </div>
                    )}
                    {/* 详细信息（可展开） */}
                    <details className="text-xs">
                      <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium">
                        查看详细信息（CPU / 内存 / 磁盘）
                      </summary>
                      <div className="mt-2 space-y-3">
                        {deviceInfoResult.cpu_info?.value && (
                          <div>
                            <p className="font-bold text-slate-600 mb-1">CPU 信息</p>
                            <pre className="bg-slate-50 p-2 rounded text-[10px] overflow-x-auto max-h-32 whitespace-pre-wrap">
                              {deviceInfoResult.cpu_info.value.split('\n').filter(l => l.trim()).slice(0, 8).join('\n')}
                            </pre>
                          </div>
                        )}
                        {deviceInfoResult.memory_info?.value && (
                          <div>
                            <p className="font-bold text-slate-600 mb-1">内存信息</p>
                            <pre className="bg-slate-50 p-2 rounded text-[10px] overflow-x-auto max-h-32 whitespace-pre-wrap">
                              {deviceInfoResult.memory_info.value.split('\n').filter(l => l.trim()).slice(0, 6).join('\n')}
                            </pre>
                          </div>
                        )}
                        {deviceInfoResult.disk_usage?.value && Array.isArray(deviceInfoResult.disk_usage.value) && (
                          <div>
                            <p className="font-bold text-slate-600 mb-1">磁盘使用</p>
                            <div className="space-y-1">
                              {deviceInfoResult.disk_usage.value.map((disk, i) => (
                                <div key={i} className="flex justify-between gap-2 bg-slate-50 p-1.5 rounded">
                                  <span className="font-mono text-slate-600">{disk.filesystem}</span>
                                  <span className="text-slate-500">{disk.used}/{disk.size}</span>
                                  <span className="font-bold text-slate-700">{disk.usage}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                    {/* 导出按钮 */}
                    <button
                      onClick={() => {
                        const json = JSON.stringify(deviceInfoResult, null, 2);
                        const blob = new Blob([json], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `device-info-${new Date().toISOString().slice(0, 10)}.json`;
                        a.click();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                    >
                      <Download size={12} />
                      导出 JSON
                    </button>
                  </div>
                )}

                {/* 单条命令按钮 */}
                <div>
                  <p className="text-xs text-slate-400 mb-2">或单独执行：</p>
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
                </div>
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
          <div className={`flex gap-2 ${!agentBaseUrl ? 'opacity-50 pointer-events-none' : ''}`}>
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
              disabled={isRunning || !customCommand || !agentBaseUrl}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm text-white transition-all ${theme.primaryBg} ${theme.primaryHover} disabled:opacity-50`}
              title="执行命令"
            >
              <Play size={16} />
            </button>
            <button
              onClick={() => executeStream(customCommand)}
              disabled={isRunning || !customCommand || !agentBaseUrl}
              className="px-4 py-2.5 rounded-lg font-bold text-sm text-white bg-purple-500 hover:bg-purple-600 transition-all disabled:opacity-50"
              title="流式执行（适用于 logcat 等实时输出）"
            >
              <Terminal size={16} />
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

          {/* 本地代理（包含快速开始） */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 shadow-md overflow-hidden">
            {/* 本地代理标题 */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                  {agentDetecting ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : agentBaseUrl ? (
                    <Link size={18} />
                  ) : (
                    <Unlink size={18} />
                  )}
                </div>
                <span className="text-base sm:text-lg font-bold text-slate-800">本地代理</span>
                {agentBaseUrl && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                    已连接
                  </span>
                )}
              </div>
              <button
                onClick={refreshAgentDetection}
                disabled={agentDetecting}
                className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded transition-colors flex items-center gap-1"
              >
                <RefreshCw size={12} className={agentDetecting ? 'animate-spin' : ''} />
                刷新
              </button>
            </div>

            {/* 本地代理内容 */}
            <div className="px-4 sm:px-6 py-4 space-y-4">
              {/* 未检测到代理时显示引导 */}
              {!agentDetecting && !agentBaseUrl && (
                <LocalAgentGuide onTokenSubmit={handleTokenSubmit} />
              )}

              {/* 已检测到代理时显示 Token 配对 */}
              {agentBaseUrl && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle size={14} className="text-emerald-500" />
                    <span>代理地址: {agentBaseUrl}</span>
                  </div>

                  {/* Token 输入 */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="text-xs font-medium text-slate-600">Token 配对</label>
                      <button
                        onClick={() => setShowToken(!showToken)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        {showToken ? '隐藏' : '显示'}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={agentToken}
                        onChange={(e) => setAgentToken(e.target.value)}
                        placeholder="输入本地代理显示的 Token"
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 text-xs font-mono"
                      />
                      <button
                        onClick={() => handleTokenSubmit(agentToken)}
                        className="px-3 py-2 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                      >
                        配对
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      运行本地代理后会显示 Token，请复制粘贴到这里
                    </p>
                  </div>
                </div>
              )}

              {/* 快速开始 */}
              <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setShowQuickStart(!showQuickStart)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-emerald-500" />
                    <span className="text-sm font-bold text-slate-700">快速开始</span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${showQuickStart ? 'rotate-180' : ''}`}
                  />
                </button>

                {showQuickStart && (
                  <div className="px-4 pb-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
                      <div className="space-y-2">
                        <p className="font-bold text-slate-700">📱 WiFi 调试（推荐）</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>下载并运行 <strong>ADB 本地代理</strong></li>
                          <li>复制 Token 到网页进行配对</li>
                          <li>手机开启 USB 调试</li>
                          <li>首次用 USB 执行 <code className="bg-slate-100 px-1 rounded">adb tcpip 5555</code></li>
                          <li>拔掉 USB，输入手机 IP 连接</li>
                        </ol>
                      </div>
                      <div className="space-y-2">
                        <p className="font-bold text-slate-700">🔌 USB 调试</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>下载并运行 <strong>ADB 本地代理</strong></li>
                          <li>复制 Token 到网页进行配对</li>
                          <li>手机开启 USB 调试</li>
                          <li>用 USB 线连接手机</li>
                          <li>点击"刷新设备列表"</li>
                        </ol>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs text-amber-700">
                        <strong>⚠️ 注意：</strong>
                        首次使用需要下载并运行本地代理程序。
                        代理会在你的电脑上启动一个本地服务，用于调用 ADB 命令。
                        程序只监听 <code className="bg-amber-100 px-1 rounded">127.0.0.1</code>，安全可靠。
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 参考详细使用指南 */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <BookOpen size={14} className="text-blue-500" />
                  参考详细使用指南
                </h4>
                <div className="text-xs text-slate-600 space-y-2">
                  <p>如需更详细的使用说明，请参考以下文档：</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><a href="/docs/adb-local-agent-guide.md" target="_blank" className="text-blue-500 hover:underline">ADB 本地代理使用指南</a></li>
                    <li><a href="https://github.com/ShiinaMayuri123/online_toolbox_vite/blob/main/local-agent/README.md" target="_blank" className="text-blue-500 hover:underline">本地代理 README</a></li>
                    <li><a href="https://developer.android.com/studio/releases/platform-tools" target="_blank" className="text-blue-500 hover:underline">Android SDK Platform Tools</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default AdbConsole;
