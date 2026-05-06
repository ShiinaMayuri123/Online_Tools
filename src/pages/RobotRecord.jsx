import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Upload, Copy, HardDrive, Trash2, Search, Loader2, Terminal, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import ToolLayout from '../components/common/ToolLayout';
import FaultPieChart from '../components/common/FaultPieChart';
import { useTheme } from '../contexts/ThemeContext';

/**
 * RobotRecord: 设备列表页
 * 显示所有已导入的设备（MAC 地址），支持搜索、导入新设备、删除设备。
 * 数据存储在 Firestore，实时同步。
 */

/**
 * MAC 地址输入框组件
 * 只允许输入十六进制字符，每 2 位自动插入冒号，自动转大写。
 */
const MacInput = ({ value, onChange, placeholder }) => {
  const handleChange = (e) => {
    let raw = e.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    if (raw.length > 12) raw = raw.slice(0, 12);
    const formatted = raw.match(/.{1,2}/g)?.join(':') || raw;
    onChange(formatted);
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder || "输入 MAC 地址（如 001122334455）"}
      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 font-mono"
      maxLength={17}
    />
  );
};

const RobotRecord = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMac, setImportMac] = useState('');
  const [showAdbRef, setShowAdbRef] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState('');

  // 实时监听 Firestore 设备集合
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'devices'), (snapshot) => {
      const deviceList = snapshot.docs.map(d => d.data());
      // 按更新时间倒序排列
      deviceList.sort((a, b) => {
        const ta = a.updatedAt?.toMillis?.() || 0;
        const tb = b.updatedAt?.toMillis?.() || 0;
        return tb - ta;
      });
      setDevices(deviceList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 过滤设备列表
  const filteredDevices = devices.filter(d =>
    d.mac.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 导入新设备
  const handleImport = async () => {
    if (importMac.length < 17) return;
    if (devices.some(d => d.mac === importMac)) return;
    const newDevice = {
      mac: importMac,
      model: '',
      apkVersion: '',
      mapToolVersion: '',
      customFields: [],
      testRecords: [],
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'devices', importMac), newDevice);
      setImportMac('');
      setShowImportModal(false);
    } catch (e) {
      alert('导入失败: ' + e.message);
    }
  };

  // 删除设备
  const handleDelete = async (mac) => {
    if (!window.confirm(`确定要删除设备 ${mac} 吗？所有测试记录将一并删除。`)) return;
    try {
      await deleteDoc(doc(db, 'devices', mac));
    } catch (e) {
      alert('删除失败: ' + e.message);
    }
  };

  // 复制 MAC 地址
  const handleCopy = (mac) => {
    navigator.clipboard.writeText(mac);
  };

  // 复制命令
  const handleCopyCommand = (cmd) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(cmd);
    setTimeout(() => setCopiedCommand(''), 2000);
  };

  return (
    <ToolLayout
      title="机器人测试记录管理"
      icon={<Package size={14} strokeWidth={2.5} />}
      contentClassName="pt-20 sm:pt-24 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-10 xl:px-16 w-full max-w-[95%] lg:max-w-[90%] xl:max-w-[85%] mx-auto relative z-10 space-y-4 sm:space-y-6"
    >
      {/* 搜索 + 导入 */}
      <div className="bg-white/80 backdrop-blur-sm p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-md">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="搜索 MAC 地址..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            className={`px-5 py-2.5 rounded-xl font-bold text-white text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${theme.primaryBg} ${theme.primaryHover}`}
          >
            <Upload size={16} />
            <span>导入新设备</span>
          </button>
        </div>
      </div>

      {/* 故障类型分布饼图 + 设备列表 - 桌面端并排显示 */}
      {!loading && devices.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* 左侧：饼图（占 1/3） */}
          <div className="lg:col-span-1">
            {(() => {
              const allRecords = devices.flatMap(d => d.testRecords || []);
              return allRecords.filter(r => r.result === '异常' && r.abnormalType).length > 0 ? (
                <FaultPieChart records={allRecords} />
              ) : (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200 shadow-md p-4 sm:p-6">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                    故障类型分布
                  </h2>
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm">暂无异常记录</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 右侧：设备列表（占 2/3） */}
          <div className="lg:col-span-2">
            {/* 设备列表 */}
            {filteredDevices.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {filteredDevices.map(device => (
                  <div
                    key={device.mac}
                    onClick={() => navigate(`/robot-record/${encodeURIComponent(device.mac)}`)}
                    className="group bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200 shadow-md p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${theme.bgLight} ${theme.textAccent}`}>
                        <HardDrive size={18} />
                      </div>
                      <div>
                        <span className="font-mono text-sm sm:text-base font-bold text-slate-900">{device.mac}</span>
                        {device.model && (
                          <span className="ml-2 sm:ml-3 text-xs text-slate-500">{device.model}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleCopy(device.mac)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                        title="复制 MAC 地址"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(device.mac)}
                        className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                        title="删除设备"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm">未找到匹配的设备</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="text-center py-12">
          <Loader2 size={32} className="animate-spin mx-auto text-slate-400" />
        </div>
      )}

      {/* 空状态 */}
      {!loading && devices.length === 0 && (
        <div className="text-center py-16 sm:py-20 text-slate-400">
          <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-200/80 rounded-full flex items-center justify-center mx-auto mb-6">
            <HardDrive size={48} />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">暂无设备</h3>
          <p className="text-sm max-w-md mx-auto mb-6">点击"导入新设备"添加第一台机器人设备</p>
          <button
            onClick={() => setShowImportModal(true)}
            className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${theme.primaryBg} ${theme.primaryHover}`}
          >
            导入新设备
          </button>
        </div>
      )}

      {/* ADB 命令参考 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        <button
          onClick={() => setShowAdbRef(!showAdbRef)}
          className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-slate-100 text-slate-600">
              <Terminal size={16} sm={18} />
            </div>
            <span className="text-sm sm:text-base font-bold text-slate-800">ADB 命令参考</span>
          </div>
          {showAdbRef ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>

        {showAdbRef && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6 max-h-[60vh] overflow-y-auto">
            {/* 一、连接与设备管理 */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">一、连接与设备管理</h3>
              <div className="space-y-1">
                {[
                  { cmd: 'adb connect <ip地址>', desc: '通过 WiFi 连接设备' },
                  { cmd: 'adb disconnect', desc: '断开所有无线连接' },
                  { cmd: 'adb devices', desc: '列出已连接的设备' },
                  { cmd: 'adb devices -l', desc: '列出设备详细信息' },
                ].map(({ cmd, desc }) => (
                  <div key={cmd} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 group">
                    <div className="flex-1 min-w-0">
                      <code className="text-xs sm:text-sm font-mono text-slate-700 break-all">{cmd}</code>
                      <span className="text-xs text-slate-400 ml-2">{desc}</span>
                    </div>
                    <button
                      onClick={() => handleCopyCommand(cmd)}
                      className="p-1.5 rounded-md opacity-60 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all shrink-0"
                      title="复制命令"
                    >
                      {copiedCommand === cmd ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 二、设备信息查询 */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">二、设备信息查询</h3>
              <div className="space-y-1">
                {[
                  { cmd: 'adb shell getprop ro.product.model', desc: '获取设备型号' },
                  { cmd: 'adb shell getprop ro.build.version.release', desc: '获取 Android 版本' },
                  { cmd: 'adb shell cat /sys/class/net/wlan0/address', desc: '获取 WiFi MAC 地址' },
                  { cmd: 'adb shell ifconfig wlan0', desc: '获取 WiFi 详细信息' },
                  { cmd: 'adb shell df -h', desc: '查看磁盘使用情况' },
                  { cmd: 'adb shell cat /proc/meminfo', desc: '查看内存信息' },
                ].map(({ cmd, desc }) => (
                  <div key={cmd} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 group">
                    <div className="flex-1 min-w-0">
                      <code className="text-xs sm:text-sm font-mono text-slate-700 break-all">{cmd}</code>
                      <span className="text-xs text-slate-400 ml-2">{desc}</span>
                    </div>
                    <button
                      onClick={() => handleCopyCommand(cmd)}
                      className="p-1.5 rounded-md opacity-60 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all shrink-0"
                      title="复制命令"
                    >
                      {copiedCommand === cmd ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 三、系统操作 */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">三、系统操作</h3>
              <div className="space-y-1">
                {[
                  { cmd: 'adb reboot', desc: '重启设备' },
                  { cmd: 'adb reboot recovery', desc: '重启进入 Recovery' },
                  { cmd: 'adb shell date', desc: '查看设备时间' },
                  { cmd: 'adb shell settings get system screen_brightness', desc: '获取屏幕亮度' },
                ].map(({ cmd, desc }) => (
                  <div key={cmd} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 group">
                    <div className="flex-1 min-w-0">
                      <code className="text-xs sm:text-sm font-mono text-slate-700 break-all">{cmd}</code>
                      <span className="text-xs text-slate-400 ml-2">{desc}</span>
                    </div>
                    <button
                      onClick={() => handleCopyCommand(cmd)}
                      className="p-1.5 rounded-md opacity-60 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all shrink-0"
                      title="复制命令"
                    >
                      {copiedCommand === cmd ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 四、应用管理 */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">四、应用管理</h3>
              <div className="space-y-1">
                {[
                  { cmd: 'adb shell pm list packages', desc: '列出所有应用' },
                  { cmd: 'adb shell pm list packages | grep pudu', desc: '搜索普渡应用' },
                  { cmd: 'adb install -r <apk路径>', desc: '覆盖安装应用' },
                  { cmd: 'adb shell am force-stop <包名>', desc: '强制停止应用' },
                  { cmd: 'adb shell pm clear <包名>', desc: '清除应用数据' },
                ].map(({ cmd, desc }) => (
                  <div key={cmd} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 group">
                    <div className="flex-1 min-w-0">
                      <code className="text-xs sm:text-sm font-mono text-slate-700 break-all">{cmd}</code>
                      <span className="text-xs text-slate-400 ml-2">{desc}</span>
                    </div>
                    <button
                      onClick={() => handleCopyCommand(cmd)}
                      className="p-1.5 rounded-md opacity-60 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all shrink-0"
                      title="复制命令"
                    >
                      {copiedCommand === cmd ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 五、文件操作 */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">五、文件操作</h3>
              <div className="space-y-1">
                {[
                  { cmd: 'adb push <本地路径> <设备路径>', desc: '推送文件到设备' },
                  { cmd: 'adb pull <设备路径> <本地路径>', desc: '从设备拉取文件' },
                  { cmd: 'adb shell rm -r /sdcard/pudu/log/*', desc: '清理普渡日志' },
                  { cmd: 'adb shell du -sh *', desc: '查看目录大小' },
                ].map(({ cmd, desc }) => (
                  <div key={cmd} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 group">
                    <div className="flex-1 min-w-0">
                      <code className="text-xs sm:text-sm font-mono text-slate-700 break-all">{cmd}</code>
                      <span className="text-xs text-slate-400 ml-2">{desc}</span>
                    </div>
                    <button
                      onClick={() => handleCopyCommand(cmd)}
                      className="p-1.5 rounded-md opacity-60 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all shrink-0"
                      title="复制命令"
                    >
                      {copiedCommand === cmd ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 六、日志与调试 */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">六、日志与调试</h3>
              <div className="space-y-1">
                {[
                  { cmd: 'adb logcat', desc: '查看实时日志' },
                  { cmd: 'adb logcat -c', desc: '清除日志缓冲区' },
                  { cmd: 'adb logcat *:E', desc: '只显示错误日志' },
                  { cmd: 'adb logcat | grep -i "pudu\\|robot\\|error"', desc: '过滤普渡相关日志' },
                  { cmd: 'adb shell dumpsys battery', desc: '查看电池状态' },
                  { cmd: 'adb shell dumpsys wifi', desc: '查看 WiFi 状态' },
                ].map(({ cmd, desc }) => (
                  <div key={cmd} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 group">
                    <div className="flex-1 min-w-0">
                      <code className="text-xs sm:text-sm font-mono text-slate-700 break-all">{cmd}</code>
                      <span className="text-xs text-slate-400 ml-2">{desc}</span>
                    </div>
                    <button
                      onClick={() => handleCopyCommand(cmd)}
                      className="p-1.5 rounded-md opacity-60 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all shrink-0"
                      title="复制命令"
                    >
                      {copiedCommand === cmd ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 七、屏幕与显示 */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">七、屏幕与显示</h3>
              <div className="space-y-1">
                {[
                  { cmd: 'adb shell screencap /sdcard/screenshot.png', desc: '截图' },
                  { cmd: 'adb pull /sdcard/screenshot.png', desc: '拉取截图' },
                  { cmd: 'adb shell screenrecord /sdcard/video.mp4', desc: '录屏' },
                  { cmd: 'adb shell wm size', desc: '查看屏幕分辨率' },
                ].map(({ cmd, desc }) => (
                  <div key={cmd} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 group">
                    <div className="flex-1 min-w-0">
                      <code className="text-xs sm:text-sm font-mono text-slate-700 break-all">{cmd}</code>
                      <span className="text-xs text-slate-400 ml-2">{desc}</span>
                    </div>
                    <button
                      onClick={() => handleCopyCommand(cmd)}
                      className="p-1.5 rounded-md opacity-60 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all shrink-0"
                      title="复制命令"
                    >
                      {copiedCommand === cmd ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 八、输入模拟 */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">八、输入模拟</h3>
              <div className="space-y-1">
                {[
                  { cmd: 'adb shell input keyevent 3', desc: 'HOME 键' },
                  { cmd: 'adb shell input keyevent 4', desc: '返回键' },
                  { cmd: 'adb shell input tap 500 500', desc: '点击坐标' },
                  { cmd: 'adb shell input swipe 500 1000 500 500', desc: '滑动操作' },
                ].map(({ cmd, desc }) => (
                  <div key={cmd} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 group">
                    <div className="flex-1 min-w-0">
                      <code className="text-xs sm:text-sm font-mono text-slate-700 break-all">{cmd}</code>
                      <span className="text-xs text-slate-400 ml-2">{desc}</span>
                    </div>
                    <button
                      onClick={() => handleCopyCommand(cmd)}
                      className="p-1.5 rounded-md opacity-60 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all shrink-0"
                      title="复制命令"
                    >
                      {copiedCommand === cmd ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 导入设备弹窗 */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setShowImportModal(false); setImportMac(''); }}></div>
          <div className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-6">导入新设备</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">设备 MAC 地址</label>
                  <MacInput value={importMac} onChange={setImportMac} />
                  <p className="text-xs text-slate-400 mt-1.5">直接输入 12 位十六进制字符，冒号会自动插入</p>
                </div>
                {devices.some(d => d.mac === importMac) && (
                  <p className="text-xs text-red-500">该设备已存在</p>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleImport}
                    disabled={importMac.length < 17 || devices.some(d => d.mac === importMac)}
                    className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:shadow-none ${theme.primaryBg} ${theme.primaryHover}`}
                  >
                    确认导入
                  </button>
                  <button
                    onClick={() => { setShowImportModal(false); setImportMac(''); }}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default RobotRecord;
