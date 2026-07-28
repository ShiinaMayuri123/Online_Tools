import React from 'react';
import { Terminal, Trash2, Download, Play, History } from 'lucide-react';
import ExecutionHistory from './ExecutionHistory';

/**
 * 独立终端控制台组件 (AdbTerminal)
 * 提供实时 Console 画面输出、自定义命令输入执行、日志导出与历史追溯功能
 */
export default function AdbTerminal({
  output = [],
  onClearOutput,
  customCommand = '',
  setCustomCommand,
  onExecuteCustom,
  onExecuteStream,
  isRunning = false,
  history = [],
  onClearHistory,
  outputRef,
  agentBaseUrl,
}) {
  const outputStyles = {
    command: 'text-blue-400 font-bold',
    stdout: 'text-emerald-300',
    stderr: 'text-amber-300',
    error: 'text-rose-400',
    system: 'text-purple-400',
  };

  const handleExportLog = () => {
    const text = output.map((o) => `[${o.time}] ${o.data}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adb-console-log-${Date.now()}.txt`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* 终端卡片主体 */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        {/* 终端控制台 Header */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-200 block text-xs">
                实时终端控制台
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Console Output Stream
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onClearOutput}
              className="hover:text-slate-200 transition-colors flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-800 text-slate-400 text-xs"
              title="清空控制台日志"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">清空</span>
            </button>
            <button
              onClick={handleExportLog}
              className="hover:text-slate-200 transition-colors flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-800 text-slate-400 text-xs"
              title="导出当前控制台日志文件"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">导出</span>
            </button>
          </div>
        </div>

        {/* 终端画面输出 Log Window */}
        <div
          ref={outputRef}
          className="p-4 h-[320px] overflow-y-auto font-mono text-xs leading-relaxed space-y-1.5 bg-slate-950 scrollbar-thin"
        >
          {output.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs space-y-2 select-none">
              <Terminal className="w-8 h-8 opacity-40" />
              <p>等待操作反馈或点击右侧命令执行...</p>
            </div>
          ) : (
            output.map((line, i) => (
              <div key={i} className={`${outputStyles[line.type] || 'text-slate-300'} whitespace-pre-wrap break-all`}>
                <span className="text-slate-600 select-none mr-2 text-[10px]">[{line.time}]</span>
                {line.data}
              </div>
            ))
          )}
        </div>

        {/* 自定义命令输入行 */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800/90 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>自由 ADB Shell 指令</span>
            <span className="text-[10px] text-slate-500 font-mono">adb shell &lt;cmd&gt;</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' && onExecuteCustom(customCommand)
              }
              placeholder="如：adb shell pm list packages"
              className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={() => onExecuteCustom(customCommand)}
              disabled={isRunning}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 shadow-md shadow-blue-950/40"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>执行</span>
            </button>
            <button
              onClick={() => onExecuteStream(customCommand)}
              disabled={isRunning}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 shadow-md shadow-purple-950/40"
              title="WebSocket 流式实时输出"
            >
              <Terminal className="w-3 h-3" />
              <span>流式</span>
            </button>
          </div>
        </div>
      </div>

      {/* 执行历史追溯模块 */}
      <ExecutionHistory history={history} onClearHistory={onClearHistory} />
    </div>
  );
}
