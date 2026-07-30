import React, { useMemo, useState } from 'react';
import { Check, Clipboard, Copy, FileText, HardDrive, Network, Search, Terminal, Workflow, X } from 'lucide-react';
import AdbCommandCard from './AdbCommandCard';
import ExecutionHistory from './ExecutionHistory';
import DangerConfirmModal from './DangerConfirmModal';
import { ADB_SECTIONS, DEVICE_SPECIFIC_INFO, LOG_FILTER_KEYWORDS, TEST_SUMMARY, TROUBLESHOOTING_FLOWS } from '../../config/adbData';

const tabItems = [
  { id: 'commands', label: '命令库', icon: Terminal },
  { id: 'flows', label: '排障流程', icon: Workflow },
  { id: 'data', label: '设备资料', icon: HardDrive },
];

export default function AdbWorkspace({
  theme, commands, output, outputRef, customCommand, setCustomCommand, onExecute, onFillTerminal,
  onExecuteStream, isRunning, history, onClearOutput, onClearHistory, activePanel, setActivePanel,
  connectionInput, setConnectionInput, portInput, setPortInput, connectedDevice, connecting,
  agentBaseUrl, agentDetecting, onDetect, handleConnect, handleDisconnect, devices, refreshDevices, refreshingDevices, dangerCommand, setDangerCommand,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [copiedKey, setCopiedKey] = useState('');

  const categories = useMemo(() => ['全部', ...new Set(commands.map((command) => command.category))], [commands]);
  const filteredReferences = commands.filter((command) => {
    const matchesCategory = selectedCategory === '全部' || command.category === selectedCategory;
    const term = searchQuery.trim().toLowerCase();
    return matchesCategory && (!term || `${command.name} ${command.description} ${command.build()}`.toLowerCase().includes(term));
  });

  const copyCommand = async (command, key) => {
    await navigator.clipboard.writeText(command);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(''), 1200);
  };

  const outputLine = (line) => (
    <div key={`${line.time}-${line.data}`} className="whitespace-pre-wrap break-all">
      <span className="text-slate-400 select-none mr-2">[{line.time}]</span>{line.data}
    </div>
  );

  const renderCommands = () => (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索命令、描述或分类" className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white/80 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <button key={category} type="button" onClick={() => setSelectedCategory(category)} className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${selectedCategory === category ? `${theme.primaryBg} text-white border-transparent` : 'bg-white/70 text-slate-500 border-slate-200 hover:border-slate-300'}`}>{category}</button>
          ))}
        </div>
      </div>
      {filteredReferences.length > 0 ? (
        categories.filter((category) => category !== '全部').map((category) => {
          const commands = filteredReferences.filter((command) => command.category === category);
          if (commands.length === 0) return null;
          return (
            <section key={category} className="space-y-2">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-800"><span className={`w-1 h-5 rounded-full ${theme.primaryBg}`} />{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{commands.map((command) => <AdbCommandCard key={command.id} command={command} onFillTerminal={onFillTerminal} isExecuting={isRunning} />)}</div>
            </section>
          );
        })
      ) : <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">未找到匹配命令</div>}
    </div>
  );

  const renderFlows = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {TROUBLESHOOTING_FLOWS.map((flow) => { const Icon = flow.icon; return <article key={flow.id} className="rounded-xl border border-slate-200 bg-white/70 p-4"><div className="flex items-center gap-2 mb-3"><Icon size={17} className="text-orange-500" /><h3 className="font-semibold text-slate-700">{flow.title}</h3></div><div className="space-y-3 border-l-2 border-orange-100 pl-4">{flow.steps.map((step, index) => <div key={`${flow.id}-${index}`} className="flex items-start justify-between gap-2"><div><code className="text-xs text-slate-700 break-all">{step.cmd}</code><p className="mt-1 text-xs text-slate-400">{step.desc}</p></div><button type="button" onClick={() => copyCommand(step.cmd, `${flow.id}-${index}`)} className="shrink-0 p-1 text-slate-400 hover:text-blue-600" title="复制命令">{copiedKey === `${flow.id}-${index}` ? <Check size={15} /> : <Copy size={15} />}</button></div>)}</div></article>; })}
      </div>
      <section className="rounded-xl border border-slate-200 bg-white/70 p-4"><h3 className="font-semibold text-slate-700">日志关键词</h3><div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">{LOG_FILTER_KEYWORDS.map(({ keyword, desc }) => <button key={keyword} type="button" onClick={() => copyCommand(`adb logcat | grep -i "${keyword}"`, `log-${keyword}`)} className="rounded-lg bg-slate-50 px-3 py-2 text-left hover:bg-blue-50"><code className="text-xs text-purple-600">{keyword}</code><span className="block mt-1 text-[11px] text-slate-400">{desc}</span></button>)}</div></section>
    </div>
  );

  const renderData = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <article className="rounded-xl border border-slate-200 bg-white/70 p-4"><p className="text-xs text-slate-400">测试命令</p><strong className="mt-1 block text-2xl text-slate-800">{TEST_SUMMARY.totalCommands}</strong></article>
        <article className="rounded-xl border border-slate-200 bg-white/70 p-4"><p className="text-xs text-slate-400">已验证</p><strong className="mt-1 block text-2xl text-emerald-600">{TEST_SUMMARY.totalPassed}</strong></article>
        <article className="rounded-xl border border-slate-200 bg-white/70 p-4"><p className="text-xs text-slate-400">待确认</p><strong className="mt-1 block text-2xl text-amber-600">{TEST_SUMMARY.totalUntested}</strong></article>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{DEVICE_SPECIFIC_INFO.map((info) => { const Icon = info.icon; return <article key={info.id} className="rounded-xl border border-slate-200 bg-white/70 p-4"><div className="flex items-center gap-2 font-semibold text-slate-700"><Icon size={17} className="text-cyan-500" />{info.title}</div>{info.items ? <div className="mt-3 space-y-2">{info.items.map((item) => <div key={item.name} className="text-xs"><code className="text-cyan-600">{item.name}</code><span className="ml-2 text-slate-500">{item.desc}</span></div>)}</div> : <pre className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">{info.text}</pre>}</article>; })}</div>
    </div>
  );

  return (
    <div className="space-y-5">
      <style>{'button[title="复制完整命令"] span { display: none; }'}</style>
      <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm shadow-lg shadow-slate-300/30 overflow-hidden lg:h-[calc(100dvh-6rem)]" style={{ backgroundColor: theme.panelTint }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4"><div><h2 className="text-lg font-bold text-slate-900">机器人现场运维平台</h2><p className="mt-1 text-sm text-slate-600">连接设备、选择命令、在终端确认后执行</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${agentBaseUrl ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{agentBaseUrl ? '代理服务已连接' : '等待本地代理'}</span></div>
        {!agentBaseUrl && <div className="flex flex-col gap-3 border-b border-blue-100 bg-blue-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-800">现场连接助手未运行</p><p className="mt-1 text-xs text-slate-600">请先启动“现场连接助手”，网页会自动完成配对，不需要输入 Token。</p></div><div className="flex shrink-0 gap-2"><a href="https://github.com/ShiinaMayuri123/Online_Tools/releases/download/v1.0.0/Pudu.-Windows-x64.zip" target="_blank" rel="noreferrer" className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">下载连接助手</a><button type="button" onClick={onDetect} disabled={agentDetecting} className="rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">{agentDetecting ? '检测中...' : '重新检测'}</button></div></div>}
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-white/50 p-4 sm:flex-row sm:items-end"><label className="min-w-0 flex-1 text-xs font-medium text-slate-500">设备 IP<input value={connectionInput} onChange={(event) => setConnectionInput(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs text-slate-700 outline-none focus:border-blue-400" placeholder="192.168.1.100" /></label><label className="w-full sm:w-28 text-xs font-medium text-slate-500">ADB 端口<input value={portInput} onChange={(event) => setPortInput(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs text-slate-700 outline-none focus:border-blue-400" placeholder="5555" /></label><button type="button" onClick={connectedDevice ? () => handleDisconnect(connectedDevice) : handleConnect} disabled={connecting || refreshingDevices || (!connectedDevice && !connectionInput)} className={`rounded-md px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 ${connectedDevice ? 'bg-rose-500 hover:bg-rose-600' : `${theme.primaryBg} ${theme.primaryHover}`}`}>{connecting ? '连接中...' : refreshingDevices && connectedDevice ? '处理中...' : connectedDevice ? '断开连接' : '建立连接'}</button><button type="button" onClick={refreshDevices} disabled={refreshingDevices || agentDetecting} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50">{refreshingDevices ? '刷新中...' : '刷新设备'}</button></div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-5">
          <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-slate-50/70 shadow-sm lg:col-span-2 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white/70 px-3 py-2.5"><div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Terminal size={16} className="text-blue-500" />实时终端</div><span className="text-[11px] text-slate-400">{connectedDevice || '未连接设备'}</span></div>
            <div ref={outputRef} className="min-h-[18rem] flex-1 overflow-y-auto bg-slate-50 px-3 py-3 font-mono text-xs leading-relaxed text-slate-600">{output.length ? output.map(outputLine) : <div className="flex h-full items-center justify-center text-slate-400">等待终端输出...</div>}</div>
            <div className="border-t border-slate-200 bg-white/70 p-3"><div className="flex gap-2"><input value={customCommand} onChange={(event) => setCustomCommand(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && onExecute(customCommand)} className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs text-slate-700 outline-none focus:border-blue-400" placeholder="输入命令" /><button type="button" onClick={() => onExecute(customCommand)} disabled={isRunning} className={`rounded-md px-3 py-2 text-xs font-semibold text-white ${theme.primaryBg}`}>执行</button></div><div className="mt-2 flex justify-between text-[11px] text-slate-400"><span>执行历史 {history.length} 条</span><button type="button" onClick={onClearOutput} className="hover:text-slate-700">清空输出</button></div></div>
            <div className="border-t border-slate-200 bg-white/60"><ExecutionHistory history={history} onClearHistory={onClearHistory} /></div>
          </div>
          <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white/70 shadow-sm lg:col-span-3 overflow-hidden">
            <div className="flex overflow-x-auto border-b border-slate-200">{tabItems.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setActivePanel(activePanel === id ? '' : id)} className={`min-w-[33.333%] border-b-2 px-3 py-3.5 text-base font-bold transition-colors ${activePanel === id ? `border-current ${theme.textAccent} bg-white` : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}><span className="inline-flex items-center gap-2"><Icon size={17} />{label}</span></button>)}</div>
            {activePanel ? <div className="min-h-0 flex-1 overflow-y-auto p-4">{activePanel === 'commands' && renderCommands()}{activePanel === 'flows' && renderFlows()}{activePanel === 'data' && renderData()}</div> : <div className="flex min-h-[320px] flex-1 items-center justify-center px-5 text-center text-sm text-slate-400"><div><X className="mx-auto mb-2 text-slate-300" size={22} /><p>选择一个运维模块开始</p></div></div>}
          </div>
        </div>
      </section>
      {dangerCommand && <DangerConfirmModal isOpen onClose={() => setDangerCommand(null)} onConfirm={() => { onExecute(dangerCommand.builtCmd, dangerCommand.command); setDangerCommand(null); }} command={dangerCommand.command} builtCmd={dangerCommand.builtCmd} />}
    </div>
  );
}
