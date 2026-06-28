import { useState, useEffect } from 'react';
import { Loader, Play, Download, AlertCircle, CheckCircle, Clock, RefreshCw, Link, Unlink, Shield } from 'lucide-react';
import ToolLayout from '../components/common/ToolLayout';

// ============ 本地代理配置 ============

// 候选端口列表（与 AdbConsole 保持一致）
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
        signal: AbortSignal.timeout(1000)
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
 * 设备信息快速扫描面板
 * 一键获取设备的所有基本信息
 */
export default function DeviceInfoPanel() {
  const [scanning, setScanning] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [error, setError] = useState('');

  // 本地代理状态
  const [agentBaseUrl, setAgentBaseUrl] = useState(null);
  const [agentDetecting, setAgentDetecting] = useState(true);
  const [agentToken, setAgentToken] = useState(localStorage.getItem('adb_local_agent_token') || '');
  const [showToken, setShowToken] = useState(false);
  const [pairSuccess, setPairSuccess] = useState(false);

  // 组件挂载时自动检测本地代理
  useEffect(() => {
    const detect = async () => {
      setAgentDetecting(true);
      const baseUrl = await detectLocalAgent();
      setAgentBaseUrl(baseUrl);
      setAgentDetecting(false);
    };
    detect();
  }, []);

  // 刷新代理检测
  const refreshAgentDetection = async () => {
    setAgentDetecting(true);
    const baseUrl = await detectLocalAgent();
    setAgentBaseUrl(baseUrl);
    setAgentDetecting(false);
  };

  // 处理 Token 提交（配对）
  const handleTokenSubmit = (token) => {
    setAgentToken(token);
    localStorage.setItem('adb_local_agent_token', token);
    setError('');
    // 显示配对成功提示，3 秒后自动消失
    setPairSuccess(true);
    setTimeout(() => setPairSuccess(false), 3000);
  };

  const handleScan = async () => {
    // 动态检测代理地址
    const currentToken = localStorage.getItem('adb_local_agent_token') || agentToken;
    const currentAgentUrl = await detectLocalAgent();

    if (!currentAgentUrl) {
      setError('未检测到本地代理，请先下载并运行本地代理程序');
      return;
    }
    if (!currentToken) {
      setError('未配对，请输入本地代理显示的 Token 完成配对');
      return;
    }

    // 更新检测到的地址
    setAgentBaseUrl(currentAgentUrl);
    setScanning(true);
    setError('');
    setDeviceInfo(null);

    try {
      const response = await fetch(`${currentAgentUrl}/adb/device-info/scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API 错误: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setDeviceInfo(data.data);
      } else {
        setError(data.error || '获取设备信息失败');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  const exportAsJson = () => {
    if (!deviceInfo) return;
    const json = JSON.stringify(deviceInfo, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `device-info-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <ToolLayout 
      title="设备信息快速扫描"
      description="一键获取设备的所有基本信息，包括系统版本、硬件配置、网络信息等"
    >
      {/* ===== 本地代理状态 + 配对 ===== */}
      <div className="mb-6 p-5 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
              {agentDetecting ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : agentBaseUrl ? (
                <Link size={16} />
              ) : (
                <Unlink size={16} />
              )}
            </div>
            <span className="text-sm font-bold text-slate-700">本地代理</span>
            {!agentDetecting && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                agentBaseUrl
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {agentBaseUrl ? '已连接' : '未检测到'}
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

        {/* 未检测到代理 - 引导提示 */}
        {!agentDetecting && !agentBaseUrl && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs text-amber-700">
              <strong>未检测到本地代理。</strong>
              请先下载并运行 ADB 本地代理程序，代理会在你的电脑上启动一个本地服务（仅监听 127.0.0.1）。
            </p>
            <a
              href="/download-agent.html"
              target="_blank"
              className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline"
            >
              📥 查看下载和安装指南
            </a>
          </div>
        )}

        {/* 已检测到代理 - Token 配对 */}
        {agentBaseUrl && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle size={12} className="text-emerald-500" />
              <span>代理地址: {agentBaseUrl}</span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Shield size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showToken ? 'text' : 'password'}
                  value={agentToken}
                  onChange={(e) => setAgentToken(e.target.value)}
                  placeholder="输入本地代理显示的 Token"
                  className="w-full pl-9 pr-14 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-xs font-mono"
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  {showToken ? '隐藏' : '显示'}
                </button>
              </div>
              <button
                onClick={() => handleTokenSubmit(agentToken)}
                className="px-3 py-2 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
              >
                配对
              </button>
            </div>
            {pairSuccess && (
              <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
                <CheckCircle size={12} />
                Token 已保存！现在可以点击下方"一键扫描"获取设备信息。
              </p>
            )}
          </div>
        )}
      </div>

      {/* ===== 扫描控制区 ===== */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">扫描状态</h3>
            <div className="flex items-center gap-2">
              {scanning ? (
                <>
                  <Loader className="w-5 h-5 text-blue-500 animate-spin" />
                  <span className="text-sm text-gray-600">正在扫描...</span>
                </>
              ) : deviceInfo ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-green-600">扫描完成</span>
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-500">未扫描</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={handleScan}
            disabled={scanning}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all ${
              scanning
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-lg hover:-translate-y-0.5'
            }`}
          >
            <Play className="w-5 h-5" />
            {scanning ? '扫描中...' : '一键扫描'}
          </button>

          {deviceInfo && (
            <button
              onClick={exportAsJson}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-gray-700 bg-white border-2 border-gray-200 hover:border-gray-400 transition-all"
            >
              <Download className="w-5 h-5" />
              导出 JSON
            </button>
          )}
        </div>

        {/* Indeterminate 进度条（纯 CSS 动画） */}
        {scanning && (
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full w-1/3 rounded-full animate-[indeterminate_1.5s_ease-in-out_infinite]" />
          </div>
        )}
      </div>

      {/* ===== 错误提示 ===== */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-700">出错</h4>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* ===== 信息展示区 ===== */}
      {deviceInfo && (
        <div className="space-y-6">
          
          {/* 【第一行】连接设备 - 全宽 - 最优先显示 */}
          <div className="grid grid-cols-1 gap-4">
            <DevicesCard devicesData={deviceInfo.devices_l?.value} />
          </div>

          {/* 【第二行】系统信息 - 3 列网格 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 系统信息卡 */}
            <InfoCard 
              title="系统信息"
              items={[
                { label: 'Android 版本', value: deviceInfo.android_version?.value },
                { label: '设备型号', value: deviceInfo.device_model?.value },
                { label: '设备品牌', value: deviceInfo.device_name?.value },
              ]}
            />

            {/* 设备标识卡 */}
            <InfoCard 
              title="设备标识"
              items={[
                { label: '序列号', value: deviceInfo.serial_number?.value, mono: true },
              ]}
              fullHeight
            />

            {/* 屏幕信息卡 */}
            <InfoCard 
              title="屏幕信息"
              items={[
                { label: '分辨率', value: deviceInfo.screen_resolution?.value },
                { label: '屏幕密度', value: deviceInfo.screen_density?.value },
              ]}
            />
          </div>

          {/* 【第三行】电池 + 时间信息 - 2 列网格 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 电池信息 */}
            <BatteryCard batteryData={deviceInfo.battery_status?.value} />

            {/* 系统时间 */}
            <InfoCard 
              title="系统时间"
              items={[
                { label: '当前时间', value: deviceInfo.device_time?.value, mono: true },
                { label: '运行时长', value: deviceInfo.uptime?.value },
              ]}
            />
          </div>

          {/* 【第四行】硬件配置 - 2 列网格 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CPU 信息 */}
            <InfoCard 
              title="处理器信息"
              type="detailed"
              content={deviceInfo.cpu_info?.value}
            />

            {/* 内存信息 */}
            <InfoCard 
              title="内存配置"
              type="detailed"
              content={deviceInfo.memory_info?.value}
            />
          </div>

          {/* 【第五行】磁盘使用情况 - 全宽 */}
          <div className="grid grid-cols-1 gap-4">
            <DiskUsageCard diskData={deviceInfo.disk_usage?.value} />
          </div>

          {/* 【第六行】网络信息 - 全宽 */}
          <div className="grid grid-cols-1 gap-4">
            <InfoCard 
              title="网络配置"
              type="code"
              content={deviceInfo.ip_address?.value}
            />
          </div>

        </div>
      )}

      {/* ===== 空状态 ===== */}
      {!deviceInfo && !scanning && !error && !agentDetecting && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">点击开始扫描</h3>
          <p className="text-gray-500">将一次性获取设备的所有基本信息</p>
        </div>
      )}
    </ToolLayout>
  );
}

// ========== 卡片组件 ==========

function InfoCard({ title, items, content, type = 'simple', fullHeight = false }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow overflow-hidden ${fullHeight ? 'lg:row-span-2' : ''}`}>
      {/* 卡片头 */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
      </div>

      {/* 卡片内容 */}
      <div className="p-6">
        {type === 'simple' && items && (
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx}>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                  {item.label}
                </p>
                <p className={`text-gray-800 font-medium break-words ${item.mono ? 'font-mono text-sm bg-gray-50 px-3 py-2 rounded' : ''}`}>
                  {item.value || <span className="text-gray-400">-</span>}
                </p>
              </div>
            ))}
          </div>
        )}

        {type === 'detailed' && content && (
          <pre className="bg-gray-50 p-4 rounded text-xs text-gray-700 overflow-x-auto max-h-48">
            {typeof content === 'object' ? JSON.stringify(content, null, 2) : content}
          </pre>
        )}

        {type === 'code' && content && (
          <pre className="bg-gray-50 p-4 rounded text-xs text-gray-700 overflow-x-auto max-h-48 font-mono">
            {typeof content === 'object' ? JSON.stringify(content, null, 2) : content}
          </pre>
        )}
      </div>
    </div>
  );
}

function BatteryCard({ batteryData }) {
  if (!batteryData) return null;

  const level = batteryData.level || '0';
  const status = batteryData.status || 'unknown';
  const temp = batteryData.temperature || '0';
  const health = batteryData.health || 'unknown';

  const levelNum = parseInt(level);
  const levelColor = levelNum > 50 ? 'text-green-600' : levelNum > 20 ? 'text-yellow-600' : 'text-red-600';
  const bgColor = levelNum > 50 ? 'bg-green-100' : levelNum > 20 ? 'bg-yellow-100' : 'bg-red-100';

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800 text-sm">🔋 电池状态</h3>
      </div>

      <div className="p-6">
        {/* 大电量显示 */}
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${bgColor} mb-3`}>
            <span className={`text-3xl font-bold ${levelColor}`}>{level}%</span>
          </div>
          <p className="text-gray-600 text-sm">{status}</p>
        </div>

        {/* 详细信息 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-xs text-gray-500 uppercase">温度</span>
            <span className="font-semibold text-gray-800">{(parseInt(temp) / 10).toFixed(1)}°C</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-xs text-gray-500 uppercase">健康状态</span>
            <span className="font-semibold text-gray-800">{health}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiskUsageCard({ diskData }) {
  if (!diskData || !Array.isArray(diskData) || diskData.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800 text-sm">💾 磁盘使用</h3>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {diskData.map((disk, idx) => (
            <div key={idx} className="pb-4 border-b border-gray-100 last:border-b-0">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{disk.filesystem}</p>
                  <p className="text-xs text-gray-500">{disk.available} 可用</p>
                </div>
                <span className="text-sm font-bold text-gray-700">{disk.usage}</span>
              </div>
              
              {/* 进度条 */}
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full"
                  style={{ width: disk.usage }}
                />
              </div>

              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>已用: {disk.used}</span>
                <span>总容量: {disk.total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DevicesCard({ devicesData }) {
  if (!devicesData) return null;

  const devices = Array.isArray(devicesData) ? devicesData : [devicesData];

  return (
    <div className="bg-white rounded-lg border border-blue-300 hover:shadow-lg transition-shadow overflow-hidden border-2">
      <div className="bg-gradient-to-r from-blue-100 to-blue-50 px-6 py-4 border-b border-blue-200">
        <h3 className="font-bold text-blue-800 text-base">📱 连接设备 - 直观了解连接状态</h3>
      </div>

      <div className="p-6">
        {devices.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">没有连接的设备</p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device, idx) => (
              <div key={idx} className={`p-4 rounded-lg border-2 ${
                device.state === 'device' 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-yellow-50 border-yellow-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${
                      device.state === 'device' 
                        ? 'bg-green-500' 
                        : 'bg-yellow-500'
                    }`}></div>
                    <p className="font-mono text-sm font-bold text-gray-800">{device.serial || 'N/A'}</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    device.state === 'device' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-yellow-500 text-white'
                  }`}>
                    {device.state === 'device' ? '✓ 已连接' : '⚠️ ' + device.state}
                  </span>
                </div>
                
                {device.details && (
                  <p className="text-xs text-gray-600 break-words font-mono bg-white px-3 py-2 rounded border border-gray-200">
                    {device.details}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
