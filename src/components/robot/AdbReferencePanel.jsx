import { useState, useMemo } from 'react';
import {
  Terminal, ChevronDown, ChevronRight, Search, X, Copy, Check,
  AlertTriangle, Shield, Info, SearchX, Workflow,
} from 'lucide-react';
import {
  ADB_SECTIONS, TROUBLESHOOTING_FLOWS,
  DEVICE_SPECIFIC_INFO, TEST_SUMMARY, LOG_FILTER_KEYWORDS,
} from '../../config/adbData';
import useClipboard from '../../hooks/useClipboard';
import { useTheme } from '../../hooks/useTheme';

/** 状态标签 */
const StatusBadge = ({ status }) => {
  if (!status) return null;
  const map = {
    ok: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '可用' },
    root: { bg: 'bg-amber-100', text: 'text-amber-700', label: '需root' },
    untested: { bg: 'bg-slate-100', text: 'text-slate-500', label: '未测试' },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-bold ${s.bg} ${s.text}`}>
      <span className="w-2 h-2 rounded-full bg-current" />
      {s.label}
    </span>
  );
};

/** 风险标签 */
const RiskBadge = ({ risk, consequence }) => {
  if (!risk) return null;
  const map = {
    low: { bg: 'bg-green-100', text: 'text-green-700', icon: Shield, label: '低风险' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertTriangle, label: '中风险' },
    high: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle, label: '高风险' },
  };
  const r = map[risk];
  if (!r) return null;
  const Icon = r.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-bold ${r.bg} ${r.text}`}
      title={consequence || undefined}
    >
      <Icon size={14} />
      {r.label}
    </span>
  );
};

/** 可折叠子区块 */
const CollapsibleBlock = ({ title, icon: Icon, iconColor, count, isOpen, onToggle, children }) => (
  <div className="border border-slate-200 rounded-xl overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center gap-2.5">
        {Icon && <Icon size={18} className={iconColor || 'text-slate-500'} />}
        <span className="text-base font-bold text-slate-700">{title}</span>
        {count !== undefined && <span className="text-base text-slate-400 font-mono">{count}</span>}
      </div>
      <ChevronDown
        size={20}
        className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
    {isOpen && <div className="px-5 pb-5 space-y-4 animate-in fade-in duration-200">{children}</div>}
  </div>
);

const AdbReferencePanel = ({ defaultOpen = false }) => {
  const { theme } = useTheme();
  const { copiedKey, copy } = useClipboard();

  const [showPanel, setShowPanel] = useState(defaultOpen);
  const [adbSearch, setAdbSearch] = useState('');
  const [activeSection, setActiveSection] = useState('all');
  const [showTestSummary, setShowTestSummary] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [showDeviceInfo, setShowDeviceInfo] = useState(false);
  const [showLogKeywords, setShowLogKeywords] = useState(false);

  // 命令过滤
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

  const totalCommands = ADB_SECTIONS.reduce((sum, s) => sum + s.commands.length, 0);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200 shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 折叠按钮 */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
            <Terminal size={18} />
          </div>
          <span className="text-base sm:text-lg font-bold text-slate-800">ADB 命令参考</span>
          <span className="text-sm text-slate-400 font-mono">{totalCommands} 条命令</span>
        </div>
        <ChevronDown
          size={20}
          className={`text-slate-400 transition-transform duration-200 ${showPanel ? 'rotate-180' : ''}`}
        />
      </button>

      {showPanel && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 animate-in fade-in duration-200">

          {/* 搜索 + 分类标签 */}
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索命令或描述..."
                value={adbSearch}
                onChange={(e) => setAdbSearch(e.target.value)}
                className="w-full px-4 py-3 pl-11 pr-10 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
                className={`px-4 py-2.5 rounded-lg text-base font-bold whitespace-nowrap transition-all ${
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
                    className={`px-4 py-2.5 rounded-lg text-base font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                      activeSection === String(i)
                        ? `${theme.primaryBg} text-white shadow-md`
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon size={16} />
                    {section.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 测试总结 */}
          <CollapsibleBlock
            title="测试总结"
            icon={Info}
            iconColor="text-blue-500"
            count={`${TEST_SUMMARY.totalPassed}/${TEST_SUMMARY.totalCommands} 可用`}
            isOpen={showTestSummary}
            onToggle={() => setShowTestSummary(!showTestSummary)}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-3 font-bold text-slate-600">分类</th>
                    <th className="text-center px-4 py-3 font-bold text-slate-600">总数</th>
                    <th className="text-center px-4 py-3 font-bold text-emerald-600">可用</th>
                    <th className="text-center px-4 py-3 font-bold text-amber-600">需root</th>
                    <th className="text-center px-4 py-3 font-bold text-slate-400">未测试</th>
                  </tr>
                </thead>
                <tbody>
                  {TEST_SUMMARY.categories.map((cat, i) => (
                    <tr key={cat.name} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="px-4 py-2.5 font-medium text-slate-700">{cat.name}</td>
                      <td className="text-center px-4 py-2.5 font-mono text-slate-600">{cat.total}</td>
                      <td className="text-center px-4 py-2.5 font-mono text-emerald-600">{cat.passed}</td>
                      <td className="text-center px-4 py-2.5 font-mono text-amber-600">{cat.root || '-'}</td>
                      <td className="text-center px-4 py-2.5 font-mono text-slate-400">{cat.untested || '-'}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td className="px-4 py-3 text-slate-800">总计</td>
                    <td className="text-center px-4 py-3 font-mono text-slate-800">{TEST_SUMMARY.totalCommands}</td>
                    <td className="text-center px-4 py-3 font-mono text-emerald-700">{TEST_SUMMARY.totalPassed}</td>
                    <td className="text-center px-4 py-3 font-mono text-amber-700">{TEST_SUMMARY.totalRoot}</td>
                    <td className="text-center px-4 py-3 font-mono text-slate-500">{TEST_SUMMARY.totalUntested}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-slate-400">
              测试设备：{TEST_SUMMARY.deviceModel} / Android {TEST_SUMMARY.androidVersion} / {TEST_SUMMARY.testDate}
            </p>
          </CollapsibleBlock>

          {/* 命令列表 */}
          <div className="max-h-[50vh] overflow-y-auto space-y-4 sm:space-y-5">
            {filteredAdbSections.length > 0 ? (
              filteredAdbSections.map(section => {
                const Icon = section.icon;
                return (
                  <div key={section.title}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon size={18} className="text-slate-400" />
                      <h3 className="text-base font-bold text-slate-500 uppercase tracking-wider">{section.title}</h3>
                      <span className="text-base text-slate-300">{section.commands.length}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {section.commands.map(({ cmd, desc, status, output, risk, consequence }) => (
                        <div
                          key={cmd}
                          className={`bg-slate-50 hover:bg-slate-100 rounded-xl p-5 transition-colors ${
                            risk === 'high' ? 'border-l-2 border-red-400' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <code className="text-base font-mono text-slate-700 break-all leading-relaxed">{cmd}</code>
                              </div>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <p className="text-base text-slate-400">{desc}</p>
                                <StatusBadge status={status} />
                                <RiskBadge risk={risk} consequence={consequence} />
                              </div>
                              {output && (
                                <p className="text-sm text-slate-400 mt-2 font-mono">→ {output}</p>
                              )}
                            </div>
                            <button
                              onClick={() => copy(cmd, `cmd-${cmd}`)}
                              className={`p-2.5 rounded-lg transition-all shrink-0 ${
                                copiedKey === `cmd-${cmd}`
                                  ? 'text-green-500 bg-green-50'
                                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
                              }`}
                              title="复制命令"
                            >
                              {copiedKey === `cmd-${cmd}` ? <Check size={18} /> : <Copy size={18} />}
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

          {/* 日志过滤关键词 */}
          <CollapsibleBlock
            title="日志过滤关键词"
            icon={Search}
            iconColor="text-purple-500"
            count={LOG_FILTER_KEYWORDS.length}
            isOpen={showLogKeywords}
            onToggle={() => setShowLogKeywords(!showLogKeywords)}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {LOG_FILTER_KEYWORDS.map(({ keyword, desc }) => {
                const cmd = `adb shell logcat | grep -i "${keyword}"`;
                return (
                  <div key={keyword} className="bg-slate-50 hover:bg-slate-100 rounded-xl p-4 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <code className="text-base font-mono text-purple-600">{keyword}</code>
                        <p className="text-sm text-slate-400 mt-0.5">{desc}</p>
                      </div>
                      <button
                        onClick={() => copy(cmd, `log-${keyword}`)}
                        className={`p-2 rounded-lg transition-all shrink-0 ${
                          copiedKey === `log-${keyword}`
                            ? 'text-green-500'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                        title="复制命令"
                      >
                        {copiedKey === `log-${keyword}` ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleBlock>

          {/* 故障排查流程 */}
          <CollapsibleBlock
            title="现场故障排查流程"
            icon={Workflow}
            iconColor="text-orange-500"
            count={TROUBLESHOOTING_FLOWS.length}
            isOpen={showTroubleshooting}
            onToggle={() => setShowTroubleshooting(!showTroubleshooting)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TROUBLESHOOTING_FLOWS.map(flow => {
                const Icon = flow.icon;
                return (
                  <div key={flow.id} className="border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Icon size={18} className="text-orange-500" />
                      <span className="text-base font-bold text-slate-700">{flow.title}</span>
                    </div>
                    <div className="space-y-3 border-l-2 border-slate-200 pl-4 ml-1">
                      {flow.steps.map((step, i) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[19px] top-1.5 w-3.5 h-3.5 rounded-full bg-orange-100 border-2 border-orange-400" />
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <code className="text-base font-mono text-slate-700 break-all">{step.cmd}</code>
                              <p className="text-sm text-slate-400 mt-0.5">{step.desc}</p>
                            </div>
                            <button
                              onClick={() => copy(step.cmd, `ts-${flow.id}-${i}`)}
                              className={`p-2 rounded-lg transition-all shrink-0 ${
                                copiedKey === `ts-${flow.id}-${i}`
                                  ? 'text-green-500'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                              title="复制命令"
                            >
                              {copiedKey === `ts-${flow.id}-${i}` ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleBlock>

          {/* 设备特定信息 */}
          <CollapsibleBlock
            title="设备特定信息"
            icon={Info}
            iconColor="text-cyan-500"
            count={DEVICE_SPECIFIC_INFO.length}
            isOpen={showDeviceInfo}
            onToggle={() => setShowDeviceInfo(!showDeviceInfo)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DEVICE_SPECIFIC_INFO.map(info => {
                const Icon = info.icon;
                return (
                  <div key={info.id} className="border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon size={18} className="text-cyan-500" />
                      <span className="text-base font-bold text-slate-700">{info.title}</span>
                    </div>
                    {info.items ? (
                      <div className="space-y-2">
                        {info.items.map(item => (
                          <div key={item.name} className="flex items-start gap-2">
                            <span className="text-sm font-mono text-cyan-600 shrink-0">{item.name}</span>
                            <span className="text-sm text-slate-500">{item.desc}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <pre className="text-sm text-slate-500 whitespace-pre-wrap leading-relaxed">{info.text}</pre>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleBlock>

        </div>
      )}
    </div>
  );
};

export default AdbReferencePanel;
