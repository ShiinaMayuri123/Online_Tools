import React from 'react';
import { History, CheckCircle2, XCircle, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * ADB 命令执行历史记录面板
 * 保存时间、操作指令、完整参数串、执行状态、耗时及响应结果
 */
export default function ExecutionHistory({ history = [], onClearHistory }) {
  const [expandedId, setExpandedId] = React.useState(null);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (!history || history.length === 0) {
    return (
      <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-6 text-center">
        <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-xs text-slate-400">暂无命令执行历史记录</p>
        <p className="text-[11px] text-slate-500 mt-1">在面板中触发任何 ADB 命令后，其记录与运行耗时将自动在此显示</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-200">命令执行历史记录</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {history.length} 条
          </span>
        </div>
        <button
          onClick={onClearHistory}
          className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>清空记录</span>
        </button>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
        {history.map((item) => {
          const isExpanded = expandedId === item.id;
          const isSuccess = item.status === 'success';

          return (
            <div
              key={item.id}
              className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5 space-y-1.5 transition-colors hover:border-slate-700/60"
            >
              <div className="flex items-center justify-between text-xs cursor-pointer" onClick={() => toggleExpand(item.id)}>
                <div className="flex items-center gap-2 overflow-hidden">
                  {isSuccess ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-200 truncate">{item.name || item.commandId}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                    {item.category || '通用'}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono text-slate-400">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {item.duration != null ? `${item.duration}ms` : '-'}
                  </span>
                  <span className="text-slate-500 font-mono">{item.timestamp}</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </div>

              <div className="font-mono text-xs text-amber-300/90 bg-black/40 px-2 py-1 rounded truncate">
                {item.fullCmd}
              </div>

              {isExpanded && (
                <div className="pt-2 mt-2 border-t border-slate-800 text-xs space-y-1 animate-fadeIn">
                  {item.output && (
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold mb-1">执行输出:</div>
                      <pre className="bg-slate-900 p-2 rounded text-[11px] font-mono text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                        {item.output}
                      </pre>
                    </div>
                  )}
                  {item.error && (
                    <div>
                      <div className="text-[10px] text-rose-400 font-semibold mb-1">错误消息:</div>
                      <pre className="bg-rose-950/40 p-2 rounded text-[11px] font-mono text-rose-300 border border-rose-900/40 max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                        {item.error}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
