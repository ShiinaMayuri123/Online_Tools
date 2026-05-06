import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Upload, Copy, HardDrive, Trash2, Search, Terminal,
  ChevronDown, ChevronUp, Check, X, ClipboardList, AlertTriangle,
  Calendar, Wifi, Info, Settings, Folder, FileText, Monitor,
  MousePointer, SearchX, ArrowUpDown,
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import ToolLayout from '../components/common/ToolLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import FaultPieChart from '../components/common/FaultPieChart';
import useClipboard from '../hooks/useClipboard';
import { useTheme } from '../contexts/ThemeContext';

// ADB 命令分类数据（含图标）
const ADB_SECTIONS = [
  {
    title: '连接与设备管理',
    icon: Wifi,
    commands: [
      { cmd: 'adb connect <ip地址>', desc: '通过 WiFi 连接设备' },
      { cmd: 'adb disconnect', desc: '断开所有无线连接' },
      { cmd: 'adb devices', desc: '列出已连接的设备' },
      { cmd: 'adb devices -l', desc: '列出设备详细信息' },
    ],
  },
  {
    title: '设备信息查询',
    icon: Info,
    commands: [
      { cmd: 'adb shell getprop ro.product.model', desc: '获取设备型号' },
      { cmd: 'adb shell getprop ro.build.version.release', desc: '获取 Android 版本' },
      { cmd: 'adb shell cat /sys/class/net/wlan0/address', desc: '获取 WiFi MAC 地址' },
      { cmd: 'adb shell ifconfig wlan0', desc: '获取 WiFi 详细信息' },
      { cmd: 'adb shell df -h', desc: '查看磁盘使用情况' },
      { cmd: 'adb shell cat /proc/meminfo', desc: '查看内存信息' },
    ],
  },
  {
    title: '系统操作',
    icon: Settings,
    commands: [
      { cmd: 'adb reboot', desc: '重启设备' },
      { cmd: 'adb reboot recovery', desc: '重启进入 Recovery' },
      { cmd: 'adb shell date', desc: '查看设备时间' },
      { cmd: 'adb shell settings get system screen_brightness', desc: '获取屏幕亮度' },
    ],
  },
  {
    title: '应用管理',
    icon: Package,
    commands: [
      { cmd: 'adb shell pm list packages', desc: '列出所有应用' },
      { cmd: 'adb shell pm list packages | grep pudu', desc: '搜索普渡应用' },
      { cmd: 'adb install -r <apk路径>', desc: '覆盖安装应用' },
      { cmd: 'adb shell am force-stop <包名>', desc: '强制停止应用' },
      { cmd: 'adb shell pm clear <包名>', desc: '清除应用数据' },
    ],
  },
  {
    title: '文件操作',
    icon: Folder,
    commands: [
      { cmd: 'adb push <本地路径> <设备路径>', desc: '推送文件到设备' },
      { cmd: 'adb pull <设备路径> <本地路径>', desc: '从设备拉取文件' },
      { cmd: 'adb shell rm -r /sdcard/pudu/log/*', desc: '清理普渡日志' },
      { cmd: 'adb shell du -sh *', desc: '查看目录大小' },
    ],
  },
  {
    title: '日志与调试',
    icon: FileText,
    commands: [
      { cmd: 'adb logcat', desc: '查看实时日志' },
      { cmd: 'adb logcat -c', desc: '清除日志缓冲区' },
      { cmd: 'adb logcat *:E', desc: '只显示错误日志' },
      { cmd: 'adb logcat | grep -i "pudu\\|robot\\|error"', desc: '过滤普渡相关日志' },
      { cmd: 'adb shell dumpsys battery', desc: '查看电池状态' },
      { cmd: 'adb shell dumpsys wifi', desc: '查看 WiFi 状态' },
    ],
  },
  {
    title: '屏幕与显示',
    icon: Monitor,
    commands: [
      { cmd: 'adb shell screencap /sdcard/screenshot.png', desc: '截图' },
      { cmd: 'adb pull /sdcard/screenshot.png', desc: '拉取截图' },
      { cmd: 'adb shell screenrecord /sdcard/video.mp4', desc: '录屏' },
      { cmd: 'adb shell wm size', desc: '查看屏幕分辨率' },
    ],
  },
  {
    title: '输入模拟',
    icon: MousePointer,
    commands: [
      { cmd: 'adb shell input keyevent 3', desc: 'HOME 键' },
      { cmd: 'adb shell input keyevent 4', desc: '返回键' },
      { cmd: 'adb shell input tap 500 500', desc: '点击坐标' },
      { cmd: 'adb shell input swipe 500 1000 500 500', desc: '滑动操作' },
    ],
  },
];

/**
 * MAC 地址输入框组件
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

/** 格式化时间为简短格式 */
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [adbSearch, setAdbSearch] = useState('');
  const [activeSection, setActiveSection] = useState('all');
  const [sortBy, setSortBy] = useState('time');
  const { copiedKey, copy } = useClipboard();

  // 实时监听 Firestore 设备集合
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'devices'), (snapshot) => {
      const deviceList = snapshot.docs.map(d => d.data());
      setDevices(deviceList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 统计数据
  const stats = useMemo(() => {
    const allRecords = devices.flatMap(d => d.testRecords || []);
    const abnormalCount = allRecords.filter(r => r.result === '异常').length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = allRecords.filter(r => {
      if (!r.createdAt) return false;
      const d = r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
      return d >= today;
    }).length;
    return {
      deviceCount: devices.length,
      recordCount: allRecords.length,
      abnormalCount,
      todayCount,
    };
  }, [devices]);

  // 过滤设备列表（搜索 MAC + 型号）
  const filteredDevices = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filtered = devices.filter(d =>
      d.mac.toLowerCase().includes(term) || (d.model || '').toLowerCase().includes(term)
    );
    // 排序
    filtered.sort((a, b) => {
      if (sortBy === 'time') {
        const ta = a.updatedAt?.toMillis?.() || 0;
        const tb = b.updatedAt?.toMillis?.() || 0;
        return tb - ta;
      }
      return a.mac.localeCompare(b.mac);
    });
    return filtered;
  }, [devices, searchTerm, sortBy]);

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
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'devices', deleteTarget));
      setDeleteTarget(null);
    } catch (e) {
      alert('删除失败: ' + e.message);
    }
  };

  // 复制 MAC 地址
  const handleCopy = (mac) => copy(mac, `mac-${mac}`);

  // ADB 命令过滤
  const filteredAdbSections = useMemo(() => {
    const term = adbSearch.toLowerCase();
    if (!term && activeSection === 'all') return ADB_SECTIONS;
    return ADB_SECTIONS
      .filter((_, i) => activeSection === 'all' || i === Number(activeSection))
      .map(section => ({
        ...section,
        commands: section.commands.filter(c =>
          !term || c.cmd.toLowerCase().includes(term) || c.desc.toLowerCase().includes(term)
        ),
      }))
      .filter(section => section.commands.length > 0);
  }, [adbSearch, activeSection]);

  const totalAdbCommands = ADB_SECTIONS.reduce((sum, s) => sum + s.commands.length, 0);

  return (
    <ToolLayout
      title="机器人测试记录管理"
      icon={<Package size={14} strokeWidth={2.5} />}
      contentClassName="pt-20 sm:pt-24 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-10 xl:px-16 w-full max-w-[95%] lg:max-w-[90%] xl:max-w-7xl mx-auto relative z-10 space-y-4 sm:space-y-6"
    >
      {/* 统计概览栏 */}
      {!loading && devices.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {[
            { label: '设备总数', value: stats.deviceCount, icon: HardDrive, color: theme.textAccent },
            { label: '测试记录', value: stats.recordCount, icon: ClipboardList, color: 'text-blue-600' },
            { label: '异常记录', value: stats.abnormalCount, icon: AlertTriangle, color: 'text-red-500' },
            { label: '今日新增', value: stats.todayCount, icon: Calendar, color: 'text-emerald-600' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 shadow-md p-3 sm:p-4 animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon size={16} className={stat.color} />
                <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">{stat.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* 搜索 + 导入 + 排序 */}
      <div className="bg-white/80 backdrop-blur-sm p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="搜索 MAC 地址或型号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 pr-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy(sortBy === 'time' ? 'mac' : 'time')}
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              title={sortBy === 'time' ? '按时间排序' : '按 MAC 排序'}
            >
              <ArrowUpDown size={14} />
              <span className="hidden sm:inline">{sortBy === 'time' ? '时间' : 'MAC'}</span>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className={`px-5 py-2.5 rounded-xl font-bold text-white text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${theme.primaryBg} ${theme.primaryHover}`}
            >
              <Upload size={16} />
              <span>导入新设备</span>
            </button>
          </div>
        </div>
        {searchTerm && (
          <div className="mt-2 text-xs text-slate-400">
            找到 {filteredDevices.length} 台设备
          </div>
        )}
      </div>

      {/* 故障类型分布饼图 + 设备列表 */}
      {!loading && devices.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* 左侧：饼图 */}
          <div className="lg:col-span-1">
            {(() => {
              const allRecords = devices.flatMap(d => d.testRecords || []);
              const hasAbnormal = allRecords.some(r => r.result === '异常' && r.abnormalType);
              return hasAbnormal ? (
                <FaultPieChart records={allRecords} />
              ) : (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200 shadow-md p-4 sm:p-6">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">故障类型分布</h2>
                  <div className="text-center py-8 text-slate-400">
                    <Check size={32} className="mx-auto mb-2 text-emerald-400" />
                    <p className="text-sm">暂无异常记录</p>
                    <p className="text-xs text-slate-300 mt-1">共 {allRecords.length} 条测试记录</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 右侧：设备列表 */}
          <div className="lg:col-span-2">
            {filteredDevices.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {filteredDevices.map((device, i) => {
                  const records = device.testRecords || [];
                  const abnormalCount = records.filter(r => r.result === '异常').length;
                  return (
                    <div
                      key={device.mac}
                      onClick={() => navigate(`/robot-record/${encodeURIComponent(device.mac)}`)}
                      className="group bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200 shadow-md p-4 sm:p-5 cursor-pointer hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 animate-in fade-in slide-in-from-bottom-4"
                      style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                    >
                      <div className="flex items-center justify-between">
                        {/* 左侧：设备信息 */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-lg ${theme.bgLight} ${theme.textAccent} shrink-0`}>
                            <HardDrive size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm sm:text-base font-bold text-slate-900 truncate">{device.mac}</span>
                              {device.model && (
                                <span className="text-xs text-slate-500 shrink-0">{device.model}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                              <span>{records.length} 条记录</span>
                              {abnormalCount > 0 && (
                                <span className="text-red-500 font-medium">{abnormalCount} 异常</span>
                              )}
                              {device.updatedAt && (
                                <span>{formatTime(device.updatedAt)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 右侧：操作按钮 */}
                        <div className="flex items-center gap-1 sm:gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleCopy(device.mac)}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                            title="复制 MAC 地址"
                          >
                            {copiedKey === `mac-${device.mac}` ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(device.mac)}
                            className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                            title="删除设备"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <SearchX size={32} className="mx-auto mb-2" />
                <p className="text-sm">未找到匹配的设备</p>
                <button onClick={() => setSearchTerm('')} className="text-xs text-slate-500 underline mt-1">清除搜索</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {loading && <LoadingSpinner />}

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
      <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200 shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button
          onClick={() => setShowAdbRef(!showAdbRef)}
          className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-slate-100 text-slate-600">
              <Terminal size={16} />
            </div>
            <span className="text-sm sm:text-base font-bold text-slate-800">ADB 命令参考</span>
            <span className="text-xs text-slate-400 font-mono">{totalAdbCommands} 条命令</span>
          </div>
          <ChevronDown
            size={18}
            className={`text-slate-400 transition-transform duration-200 ${showAdbRef ? 'rotate-180' : ''}`}
          />
        </button>

        {showAdbRef && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 animate-in fade-in duration-200">
            {/* 搜索 + 分类标签 */}
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索命令或描述..."
                  value={adbSearch}
                  onChange={(e) => setAdbSearch(e.target.value)}
                  className="w-full px-4 py-2 pl-10 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                {adbSearch && (
                  <button
                    onClick={() => setAdbSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* 分类标签 */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setActiveSection('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    activeSection === 'all'
                      ? `${theme.primaryBg} text-white shadow-md`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  全部
                </button>
                {ADB_SECTIONS.map((section, i) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.title}
                      onClick={() => setActiveSection(String(i))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        activeSection === String(i)
                          ? `${theme.primaryBg} text-white shadow-md`
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Icon size={12} />
                      {section.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 命令列表 */}
            <div className="max-h-[50vh] overflow-y-auto space-y-4 sm:space-y-5">
              {filteredAdbSections.length > 0 ? (
                filteredAdbSections.map(section => {
                  const Icon = section.icon;
                  return (
                    <div key={section.title}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={14} className="text-slate-400" />
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{section.title}</h3>
                        <span className="text-xs text-slate-300">{section.commands.length}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {section.commands.map(({ cmd, desc }) => (
                          <div
                            key={cmd}
                            className="bg-slate-50 hover:bg-slate-100 rounded-lg p-3 transition-colors group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <code className="text-xs font-mono text-slate-700 break-all leading-relaxed">{cmd}</code>
                                <p className="text-xs text-slate-400 mt-1">{desc}</p>
                              </div>
                              <button
                                onClick={() => copy(cmd, `cmd-${cmd}`)}
                                className={`p-1.5 rounded-md transition-all shrink-0 ${
                                  copiedKey === `cmd-${cmd}`
                                    ? 'text-green-500 bg-green-50'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
                                }`}
                                title="复制命令"
                              >
                                {copiedKey === `cmd-${cmd}` ? <Check size={13} /> : <Copy size={13} />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <SearchX size={28} className="mx-auto mb-2" />
                  <p className="text-sm">未找到匹配的命令</p>
                  <button
                    onClick={() => { setAdbSearch(''); setActiveSection('all'); }}
                    className="text-xs text-slate-500 underline mt-1"
                  >
                    清除搜索
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 导入设备弹窗 */}
      <Modal isOpen={showImportModal} onClose={() => { setShowImportModal(false); setImportMac(''); }}>
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
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="max-w-sm">
        <div className="p-4 sm:p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">确认删除</h3>
          <p className="text-sm text-slate-500 mb-6">
            确定要删除设备 <span className="font-mono font-bold text-slate-700">{deleteTarget}</span> 吗？所有测试记录将一并删除，此操作不可撤销。
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg transition-all"
            >
              确认删除
            </button>
          </div>
        </div>
      </Modal>
    </ToolLayout>
  );
};

export default RobotRecord;
