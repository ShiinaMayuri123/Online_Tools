import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Package, Upload, Download, HardDrive, Copy, Settings, Trash2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import ThemeSwitcher from '../components/common/ThemeSwitcher';

/**
 * 内部组件：测试记录的表单组件
 * 弹出一个模态框，用于录入新的一条测试记录（测试项目、测试人员、结果等）
 */
const AddTestForm = ({ macAddress, onClose, onSave }) => {
  const { theme } = useTheme();
  // 表单状态
  const [formData, setFormData] = useState({
    macAddress: macAddress,
    testItem: '',
    tester: '',
    startTime: new Date().toLocaleString('zh-CN'),
    endTime: new Date().toLocaleString('zh-CN'),
    result: '',
    record: '',
    associatedStore: ''
  });

  // 处理表单提交
  const handleSubmit = (e) => {
    e.preventDefault(); // 阻止默认的表单刷新行为
    // 简单的非空验证
    if (!formData.testItem || !formData.tester || !formData.result) {
      return;
    }
    onSave(formData); // 调用父组件传入的保存函数
    onClose(); // 关闭模态框
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-900">添加测试记录 - {macAddress}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">测试项目 *</label>
            <input type="text" value={formData.testItem} onChange={(e) => setFormData({ ...formData, testItem: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">测试人员 *</label>
            <input type="text" value={formData.tester} onChange={(e) => setFormData({ ...formData, tester: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">测试结果 *</label>
            <select value={formData.result} onChange={(e) => setFormData({ ...formData, result: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" required>
              <option value="">请选择</option>
              <option value="通过">通过</option>
              <option value="失败">失败</option>
              <option value="待定">待定</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">测试记录</label>
            <textarea value={formData.record} onChange={(e) => setFormData({ ...formData, record: e.target.value })} rows="4" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${theme.primaryBg} ${theme.primaryHover}`}>保存记录</button>
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">取消</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * RobotTestRecordManager: 机器人测试记录主页面
 * 包含搜索、过滤、导入、分组展示测试列表等综合功能。
 */
const RobotTestRecordManager = () => {
  const navigate = useNavigate();
  const { theme, themeKey } = useTheme();

  // 状态定义
  const [testRecords, setTestRecords] = useState([]); // 存储所有测试记录
  const [searchTerm, setSearchTerm] = useState(''); // 搜索关键字
  const [sortBy, setSortBy] = useState('latest'); // 排序方式
  const [showImportModal, setShowImportModal] = useState(false); // 控制导入模态框
  const [showExportModal, setShowExportModal] = useState(false); // 控制导出模态框
  const [importMacAddress, setImportMacAddress] = useState(''); // 当前正在导入的 MAC 地址
  const [isImporting, setIsImporting] = useState(false); // 导入加载状态
  const [editingRecord, setEditingRecord] = useState(null); // 当前正在编辑的记录
  const [currentUser] = useState({ name: '管理员', uid: 'admin' }); // 模拟当前登录用户
  const [showAddTestModal, setShowAddTestModal] = useState(false); // 控制“添加测试”表单的模态框
  const [addTestMacAddress, setAddTestMacAddress] = useState(''); // 当前要添加测试记录的设备 MAC

  // 根据 MAC 地址对测试记录进行分组，这样同一台机器的多次测试会被聚合在一起
  const getGroupedRecords = () => {
    const groups = {};
    testRecords.forEach(record => {
      // 简单的搜索过滤（过滤 MAC 地址、测试人员、测试项目或测试结果）
      if (searchTerm) {
          const s = searchTerm.toLowerCase();
          if (!record.macAddress.toLowerCase().includes(s) &&
              !record.tester.toLowerCase().includes(s) &&
              !(record.testItem || '').toLowerCase().includes(s) &&
              !(record.result || '').toLowerCase().includes(s)) {
              return; // 不符合搜索条件则跳过
          }
      }
      
      if (!groups[record.macAddress]) {
        groups[record.macAddress] = [];
      }
      groups[record.macAddress].push(record);
    });
    return groups;
  };

  // 随机生成唯一 ID，用于列表渲染的 key
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

  // 格式化用户输入的 MAC 地址 (例如 001122334455 -> 00:11:22:33:44:55)
  const formatMacAddress = (mac) => {
    const cleaned = mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    const formatted = cleaned.match(/.{1,2}/g)?.join(':') || cleaned;
    return formatted.substring(0, 17);
  };

  // 模拟一个需要等待 1.5 秒的网络异步请求
  const simulateImport = async (macAddress) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            macAddress: formatMacAddress(macAddress),
            source: '研发部',
            sourceTime: new Date().toLocaleString('zh-CN')
          }
        });
      }, 1500);
    });
  };

  // 处理从弹窗发起的导入动作
  const handleImport = async () => {
    if (!importMacAddress.trim()) return;
    setIsImporting(true);
    try {
      const result = await simulateImport(importMacAddress);
      if (result.success) {
        // 创建一条初始空测试记录
        const newRecord = {
          id: generateId(),
          macAddress: result.data.macAddress,
          source: result.data.source,
          sourceTime: result.data.sourceTime,
          tester: currentUser.name,
          testItem: '',
          startTime: new Date().toLocaleString('zh-CN'),
          endTime: new Date().toLocaleString('zh-CN'),
          result: '',
          record: '',
          associatedStore: ''
        };
        // 加到记录数组的最前面
        setTestRecords(prev => [newRecord, ...prev]);
        setShowImportModal(false);
        setImportMacAddress('');
      }
    } catch (error) {
      console.error('导入失败:', error);
    } finally {
      setIsImporting(false);
    }
  };

  // 计算测试消耗的时长字符串
  const getTestDuration = (startTime, endTime) => {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diff = end - start;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${days}天${hours}小时${minutes}分`;
    } catch (e) {
      return '计算错误';
    }
  };
  
  // 处理保存新记录
  const handleSaveTest = (formData) => {
      const newRecord = { ...formData, id: generateId(), source: '手动添加' };
      setTestRecords(prev => [newRecord, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* 顶部导航 */}
      <nav className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <Home size={20} />
          </button>
          <div className="h-6 w-px bg-slate-200"></div>
          <h1 className="font-bold text-slate-700 flex items-center gap-2">
            <div className={`p-1 rounded-lg ${themeKey === 'slate' ? 'bg-slate-700 text-white' : `${theme.primaryBg} text-white`}`}>
              <Package size={16} />
            </div>
            <span className="hidden sm:inline">机器人测试记录管理</span>
          </h1>
        </div>
        <div className="flex items-center gap-3"><ThemeSwitcher /></div>
      </nav>

      <main className="max-w-7xl mx-auto w-full p-6 lg:p-12 space-y-8">
        {/* 顶部搜索与操作栏 */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <input type="text" placeholder="搜索 MAC地址、测试人员、测试项目、测试结果..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-3 pl-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
              </div>
            </div>
            <div className="flex gap-2">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300">
                <option value="latest">按最新测试时间</option>
                <option value="mac">按 MAC 地址</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowImportModal(true)} className={`px-4 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${theme.primaryBg} ${theme.primaryHover}`}>
                <Upload size={16} /><span className="hidden sm:inline">导入新设备</span>
              </button>
              <button onClick={() => setShowExportModal(true)} disabled={testRecords.length === 0} className={`px-4 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:shadow-none ${theme.primaryBg} ${theme.primaryHover}`}>
                <Download size={16} /><span className="hidden sm:inline">导出</span>
              </button>
            </div>
          </div>
        </div>

        {/* 导入设备模态框 */}
        {showImportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowImportModal(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-6">导入设备信息</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">设备 SN/MAC 码</label>
                    <input type="text" placeholder="输入设备 MAC 地址" value={importMacAddress} onChange={(e) => setImportMacAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 font-mono" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleImport} disabled={!importMacAddress.trim() || isImporting} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:shadow-none ${theme.primaryBg} ${theme.primaryHover} ${isImporting ? 'opacity-70 cursor-wait' : ''}`}>
                      {isImporting ? '导入中...' : '确认导入'}
                    </button>
                    <button onClick={() => { setShowImportModal(false); setImportMacAddress(''); }} className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">取消</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 如果没有任何记录，显示空状态引导用户添加 */}
        {testRecords.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <div className="w-32 h-32 bg-slate-200/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package size={60} />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">暂无测试记录</h3>
            <p className="text-sm max-w-md mx-auto mb-6">开始添加新的机器人设备，或直接导入数据</p>
            <button onClick={() => setShowImportModal(true)} className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${theme.primaryBg} ${theme.primaryHover}`}>添加新机器</button>
          </div>
        )}

        {/* 测试列表区域：按 MAC 地址分组展示 */}
        {testRecords.length > 0 && (
          <div className="space-y-6">
            {Object.entries(getGroupedRecords()).map(([macAddress, records]) => {
              // 取同一台机器中最新的一条记录作为卡片显示的摘要
              const latestRecord = [...records].sort((a, b) => new Date(b.endTime) - new Date(a.endTime))[0];
              const groupStats = {
                total: records.length,
                passed: records.filter(r => r.result === '通过').length,
                failed: records.filter(r => r.result === '失败').length,
                pending: records.filter(r => r.result === '待定').length
              };

              return (
                <div key={macAddress} className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* 卡片头部 */}
                  <div className="p-6 border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${theme.bgLight} ${theme.textAccent}`}>
                              <HardDrive size={16} />
                            </div>
                            <span className="font-mono text-lg font-bold text-slate-900">{macAddress}</span>
                            <button onClick={() => navigator.clipboard.writeText(macAddress)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors">
                              <Copy size={14} />
                            </button>
                          </div>
                          <span className="text-sm text-slate-500">({groupStats.total} 条记录)</span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-2"><span className="text-slate-400">来源:</span><span className="font-medium">{latestRecord.source}</span></div>
                          <div className="flex items-center gap-2"><span className="text-slate-400">最新测试:</span><span className="font-medium">{latestRecord.endTime}</span></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-slate-500 text-right">
                          <div>通过: {groupStats.passed}</div>
                          <div>失败: {groupStats.failed}</div>
                          <div>待定: {groupStats.pending}</div>
                        </div>
                        {/* 唤出添加单条记录表单的按钮 */}
                        <button onClick={() => { setAddTestMacAddress(macAddress); setShowAddTestModal(true); }} className="px-3 py-2 text-sm font-bold text-white rounded-lg transition-colors bg-green-600 hover:bg-green-700">添加此机器的测试</button>
                      </div>
                    </div>
                  </div>

                  {/* 该机器对应的历史测试记录明细 */}
                  <div className="divide-y divide-slate-200">
                    {records.map((record) => (
                      <div key={record.id} className="p-6 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                              <span className="text-sm font-bold text-slate-900">{record.testItem || '未指定项目'}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${record.result === '通过' ? 'bg-green-100 text-green-700' : record.result === '失败' ? 'bg-red-100 text-red-700' : record.result === '待定' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'}`}>
                                {record.result || '未测试'}
                              </span>
                              <span className="text-xs text-slate-400">耗时: {getTestDuration(record.startTime, record.endTime)}</span>
                            </div>
                            <div className="text-sm text-slate-600 space-y-1">
                              <div className="flex gap-4">
                                <span>测试人员: {record.tester}</span>
                                <span>完成时间: {record.endTime}</span>
                              </div>
                              {record.record && (
                                <div className="mt-2 p-3 bg-slate-100 rounded-lg whitespace-pre-wrap font-mono text-xs">
                                  {record.record}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => { if (window.confirm('确定要删除这条记录吗？')) { setTestRecords(prev => prev.filter(r => r.id !== record.id)); } }} className="p-2 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      
      {/* 挂载 AddTestForm 子组件 */}
      {showAddTestModal && (
          <AddTestForm 
              macAddress={addTestMacAddress} 
              onClose={() => setShowAddTestModal(false)} 
              onSave={handleSaveTest} 
          />
      )}
    </div>
  );
};

export default RobotTestRecordManager;
