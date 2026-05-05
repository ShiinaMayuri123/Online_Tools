import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Upload, Copy, HardDrive, Trash2, Search, Loader2 } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import ToolLayout from '../components/common/ToolLayout';
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

  return (
    <ToolLayout
      title="机器人测试记录管理"
      icon={<Package size={14} strokeWidth={2.5} />}
      contentClassName="pt-20 sm:pt-24 pb-16 sm:pb-20 px-3 sm:px-6 lg:px-8 max-w-3xl lg:max-w-4xl mx-auto relative z-10 space-y-4 sm:space-y-6"
    >
      {/* 搜索 + 导入 */}
      <div className="bg-white/80 backdrop-blur-sm p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm">
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

      {/* 加载状态 */}
      {loading && (
        <div className="text-center py-12">
          <Loader2 size={32} className="animate-spin mx-auto text-slate-400" />
        </div>
      )}

      {/* 空状态 */}
      {!loading && devices.length === 0 && (
        <div className="text-center py-16 sm:py-20 text-slate-400">
          <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-200/50 rounded-full flex items-center justify-center mx-auto mb-6">
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

      {/* 设备列表 */}
      {!loading && filteredDevices.length > 0 && (
        <div className="space-y-2 sm:space-y-3">
          {filteredDevices.map(device => (
            <div
              key={device.mac}
              onClick={() => navigate(`/robot-record/${encodeURIComponent(device.mac)}`)}
              className="group bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:border-slate-300 hover:shadow-md transition-all"
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
      )}

      {/* 有设备但搜索无结果 */}
      {!loading && devices.length > 0 && filteredDevices.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">未找到匹配的设备</p>
        </div>
      )}

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
