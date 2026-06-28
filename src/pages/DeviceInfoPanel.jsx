import { useState } from 'react';
import { Loader, Play, Download, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import ToolLayout from '../components/common/ToolLayout';

/**
 * 设备信息快速扫描面板
 * 一键获取设备的所有基本信息
 */
export default function DeviceInfoPanel() {
  const [scanning, setScanning] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [error, setError] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [agentToken, setAgentToken] = useState(localStorage.getItem('adbAgentToken'));
  const [agentUrl, setAgentUrl] = useState(localStorage.getItem('adbAgentUrl'));

  const handleScan = async () => {
    if (!agentToken || !agentUrl) {
      setError('请先配对 ADB 本地代理');
      return;
    }

    setScanning(true);
    setError('');
    setScanProgress(0);
    setDeviceInfo(null);

    try {
      const response = await fetch(`${agentUrl}/adb/device-info/scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${agentToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API 错误: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setDeviceInfo(data.data);
        setScanProgress(100);
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
      {/* ===== 头部控制区 ===== */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">扫描状态</h3>
            <div className="flex items-center gap-2">
              {scanning ? (
                <>
                  <Loader className="w-5 h-5 text-blue-500 animate-spin" />
                  <span className="text-sm text-gray-600">正在扫描 ({scanProgress}%)</span>
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

        {/* 进度条 */}
        {scanning && (
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
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
      {!deviceInfo && !scanning && !error && (
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
            <span className="font-semibold text-gray-800">{temp}°C</span>
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
