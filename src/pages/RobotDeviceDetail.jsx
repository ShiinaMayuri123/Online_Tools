import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, Plus, Trash2, Save, Copy, Check, AlertCircle } from 'lucide-react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import ToolLayout from '../components/common/ToolLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import useClipboard from '../hooks/useClipboard';
import { useTheme } from '../contexts/ThemeContext';

/**
 * RobotDeviceDetail: 设备详情页
 * 分为两部分：设备基础信息（需手动保存）+ 测试记录管理（操作即保存）。
 * 数据存储在 Firestore，实时同步。
 */

const MODEL_OPTIONS = ['欢乐送', '贝拉', '葫芦', '好啦'];
const TESTER_OPTIONS = ['熊小平', '彭汉杰', '康竣均'];
const PROJECT_OPTIONS = ['跑测', '维修', '拆机'];
const RESULT_OPTIONS = [
  { value: '正常', color: 'bg-green-100 text-green-700' },
  { value: '待定', color: 'bg-yellow-100 text-yellow-700' },
  { value: '异常', color: 'bg-red-100 text-red-700' },
];
const ABNORMAL_TYPE_OPTIONS = ['屏幕', 'RGBD', '雷达', '电源板', '核心板', '转接板', '电机'];

const generateId = () => {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Date.now().toString(36) + Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('');
};

const RobotDeviceDetail = () => {
  const { mac } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const decodedMac = decodeURIComponent(mac || '');

  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const { copiedKey, copy } = useClipboard();
  const [showAddRecord, setShowAddRecord] = useState(false);

  // 设备基础信息的本地编辑状态（不直接修改 device，点保存才写入 Firestore）
  const [editModel, setEditModel] = useState('');
  const [editApkVersion, setEditApkVersion] = useState('');
  const [editMapToolVersion, setEditMapToolVersion] = useState('');
  const [editCustomFields, setEditCustomFields] = useState([]);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [showModelError, setShowModelError] = useState(false);

  // 实时监听 Firestore 设备数据
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'devices', decodedMac), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDevice(data);
        // 仅在首次加载时同步编辑状态
        setEditModel(prev => prev || data.model || '');
        setEditApkVersion(prev => prev || data.apkVersion || '');
        setEditMapToolVersion(prev => prev || data.mapToolVersion || '');
        setEditCustomFields(prev => prev.length > 0 ? prev : data.customFields || []);
      } else {
        setDevice(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [decodedMac]);

  // 设备不存在时返回列表页
  useEffect(() => {
    if (!loading && !device) navigate('/robot-record', { replace: true });
  }, [loading, device, navigate]);

  // 保存设备基础信息到 Firestore
  const handleSaveInfo = async () => {
    if (!editModel) {
      setShowModelError(true);
      return;
    }
    setShowModelError(false);
    try {
      await updateDoc(doc(db, 'devices', decodedMac), {
        model: editModel,
        apkVersion: editApkVersion,
        mapToolVersion: editMapToolVersion,
        customFields: editCustomFields,
        updatedAt: serverTimestamp(),
      });
      setSaveFeedback(true);
      setTimeout(() => setSaveFeedback(false), 2000);
    } catch (e) {
      alert('保存失败: ' + e.message);
    }
  };

  // 自定义字段操作（编辑本地状态）
  const addCustomField = () => {
    setEditCustomFields(prev => [...prev, { label: '', value: '' }]);
  };
  const updateCustomField = (index, key, val) => {
    setEditCustomFields(prev => {
      const fields = [...prev];
      fields[index] = { ...fields[index], [key]: val };
      return fields;
    });
  };
  const removeCustomField = (index) => {
    setEditCustomFields(prev => prev.filter((_, i) => i !== index));
  };

  // 添加测试记录（直接写入 Firestore）
  const addTestRecord = async (record) => {
    if (!device) return;
    try {
      await updateDoc(doc(db, 'devices', decodedMac), {
        testRecords: [{ ...record, id: generateId() }, ...device.testRecords],
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      alert('添加记录失败: ' + e.message);
    }
  };

  // 删除测试记录
  const deleteTestRecord = async (id) => {
    if (!device) return;
    try {
      await updateDoc(doc(db, 'devices', decodedMac), {
        testRecords: device.testRecords.filter(r => r.id !== id),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      alert('删除记录失败: ' + e.message);
    }
  };

  // 复制 MAC 地址
  const handleCopy = () => copy(decodedMac, 'mac');

  if (loading) {
    return (
      <ToolLayout
        title="设备详情"
        icon={<Package size={14} strokeWidth={2.5} />}
        contentClassName="pt-20 sm:pt-24 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-10 xl:px-16 w-full max-w-[95%] lg:max-w-[90%] xl:max-w-[85%] mx-auto relative z-10"
      >
        <LoadingSpinner />
      </ToolLayout>
    );
  }

  if (!device) return null;

  return (
    <ToolLayout
      title="设备详情"
      icon={<Package size={14} strokeWidth={2.5} />}
      contentClassName="pt-20 sm:pt-24 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-10 xl:px-16 w-full max-w-[95%] lg:max-w-[90%] xl:max-w-[85%] mx-auto relative z-10 space-y-4 sm:space-y-6"
    >
      {/* MAC 地址标题 */}
      <div className="flex items-center gap-2 sm:gap-3 animate-in fade-in duration-300">
        <span className="font-mono text-base sm:text-lg font-bold text-slate-900">{device.mac}</span>
        <button
          onClick={handleCopy}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          title="复制 MAC 地址"
        >
          {copiedKey === 'mac' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
        </button>
      </div>

      {/* 第一部分：设备基础信息 */}
      <section className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200 shadow-md p-4 sm:p-6 space-y-4 sm:space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
        <h2 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">设备基础信息</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* 设备型号（必填） */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              设备型号 <span className="text-red-500">*</span>
            </label>
            <select
              value={editModel}
              onChange={(e) => { setEditModel(e.target.value); setShowModelError(false); }}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm bg-white ${
                showModelError && !editModel
                  ? 'border-red-400 focus:ring-red-300'
                  : 'border-slate-200 focus:ring-slate-300'
              }`}
            >
              <option value="">请选择设备型号</option>
              {MODEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {showModelError && !editModel && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5">
                <AlertCircle size={12} />
                设备型号为必填项
              </p>
            )}
          </div>

          {/* 本体 APK 版本 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">本体 APK 版本</label>
            <input
              type="text"
              value={editApkVersion}
              onChange={(e) => setEditApkVersion(e.target.value)}
              placeholder="输入版本号"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm"
            />
          </div>

          {/* 建图工具版本 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">建图工具版本</label>
            <input
              type="text"
              value={editMapToolVersion}
              onChange={(e) => setEditMapToolVersion(e.target.value)}
              placeholder="输入版本号"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm"
            />
          </div>
        </div>

        {/* 自定义字段 */}
        {editCustomFields.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">自定义字段</p>
            {editCustomFields.map((field, i) => (
              <div key={i} className="flex gap-2 sm:gap-3 items-start">
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateCustomField(i, 'label', e.target.value)}
                  placeholder="字段名称"
                  className="w-1/3 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm"
                />
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => updateCustomField(i, 'value', e.target.value)}
                  placeholder="字段内容"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm"
                />
                <button
                  onClick={() => removeCustomField(i)}
                  className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={addCustomField}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Plus size={16} />
            添加自定义字段
          </button>
        </div>

        {/* 保存按钮 */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
          <button
            onClick={handleSaveInfo}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-all flex items-center gap-2 ${
              saveFeedback
                ? 'bg-green-500 hover:bg-green-600'
                : `${theme.primaryBg} ${theme.primaryHover}`
            }`}
          >
            {saveFeedback ? <Check size={16} /> : <Save size={16} />}
            {saveFeedback ? '已保存' : '保存信息'}
          </button>
          {!editModel && (
            <span className="text-xs text-slate-400">请先选择设备型号</span>
          )}
        </div>
      </section>

      {/* 第二部分：测试记录管理 */}
      <section className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200 shadow-md p-4 sm:p-6 space-y-4 sm:space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">测试记录</h2>
          <button
            onClick={() => setShowAddRecord(true)}
            className={`px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 ${theme.primaryBg} ${theme.primaryHover}`}
          >
            <Plus size={16} />
            添加测试记录
          </button>
        </div>

        {/* 空状态 */}
        {device.testRecords.length === 0 && (
          <div className="text-center py-8 sm:py-10 text-slate-400">
            <p className="text-sm">暂无测试记录</p>
          </div>
        )}

        {/* 记录列表 */}
        {device.testRecords.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            {device.testRecords.map((record, i) => {
              const resultStyle = RESULT_OPTIONS.find(r => r.value === record.result)?.color || 'bg-slate-100 text-slate-700';
              return (
                <div key={record.id} className="p-3 sm:p-4 bg-white rounded-lg sm:rounded-xl border border-slate-200 hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="text-sm font-bold text-slate-900">{record.project}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${resultStyle}`}>
                          {record.result}
                        </span>
                        {(record.result === '异常' || record.project === '维修') && record.abnormalType && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
                            {record.abnormalType}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>人员: <span className="font-medium text-slate-700">{record.tester}</span></span>
                        <span>开始: <span className="font-medium text-slate-700">{record.startTime}</span></span>
                        <span>结束: <span className="font-medium text-slate-700">{record.endTime}</span></span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('确定要删除这条测试记录吗？')) deleteTestRecord(record.id);
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 添加测试记录弹窗 */}
      <AddTestRecordModal
        isOpen={showAddRecord}
        onClose={() => setShowAddRecord(false)}
        onSave={(record) => { addTestRecord(record); setShowAddRecord(false); }}
        theme={theme}
      />
    </ToolLayout>
  );
};

/**
 * AddTestRecordModal: 添加测试记录弹窗
 */
const AddTestRecordModal = ({ isOpen, onClose, onSave, theme }) => {
  const now = new Date();
  const defaultTime = now.toLocaleString('zh-CN', { hour12: false });

  const [tester, setTester] = useState(TESTER_OPTIONS[0]);
  const [startTime, setStartTime] = useState(defaultTime);
  const [endTime, setEndTime] = useState(defaultTime);
  const [project, setProject] = useState(PROJECT_OPTIONS[0]);
  const [result, setResult] = useState(RESULT_OPTIONS[0].value);
  const [abnormalType, setAbnormalType] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ tester, startTime, endTime, project, result, abnormalType: (result === '异常' || project === '维修') ? abnormalType : '' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md sm:max-w-lg">
        <div className="p-4 sm:p-6 border-b border-slate-200">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">添加测试记录</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {/* 测试人员 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">测试人员</label>
            <select
              value={tester}
              onChange={(e) => setTester(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm bg-white"
            >
              {TESTER_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* 时间段 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">开始时间</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 text-xs sm:text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">结束时间</label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 text-xs sm:text-sm font-mono"
              />
            </div>
          </div>

          {/* 项目 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">项目</label>
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm bg-white"
            >
              {PROJECT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* 结果 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">结果</label>
            <div className="flex gap-2">
              {RESULT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setResult(opt.value); if (opt.value !== '异常') setAbnormalType(''); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                    result === opt.value
                      ? `${opt.color} border-current`
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {opt.value}
                </button>
              ))}
            </div>
          </div>

          {/* 故障类型（当结果为"异常"或项目为"维修"时显示） */}
          {(result === '异常' || project === '维修') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {project === '维修' ? '维修项目' : '异常类型'}
              </label>
              <div className="flex flex-wrap gap-2">
                {ABNORMAL_TYPE_OPTIONS.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAbnormalType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                      abnormalType === type
                        ? 'bg-red-100 text-red-700 border-red-300'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 按钮 */}
          <div className="flex gap-3 pt-3 sm:pt-4">
            <button
              type="submit"
              className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${theme.primaryBg} ${theme.primaryHover}`}
            >
              <Save size={16} />
              保存记录
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              取消
            </button>
          </div>
        </form>
    </Modal>
  );
};

export default RobotDeviceDetail;
