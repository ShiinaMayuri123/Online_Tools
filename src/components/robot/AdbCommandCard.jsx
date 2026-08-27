import React, { useState } from 'react';
import { Copy, Check, Shield, AlertTriangle, Info, ClipboardPaste } from 'lucide-react';
import AdbParameterForm from './AdbParameterForm';

const getDefaultParamValues = (command) => Object.fromEntries(
  (command?.params || [])
    .filter((param) => param.default !== undefined)
    .map((param) => [param.key, param.default])
);

/**
 * 动态 ADB 命令卡片组件
 * 封装命令描述、参数交互表单、动态生成的实际命令构建、危险防范及执行/复制操作
 */
export default function AdbCommandCard({ command, onFillTerminal, isExecuting }) {
  const [paramValues, setParamValues] = useState(() => getDefaultParamValues(command));
  const [copied, setCopied] = useState(false);

  const handleParamChange = (key, value) => {
    setParamValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // 动态构建最终产生的完整 ADB 命令 (带安全捕获保护)
  const builtCommand = React.useMemo(() => {
    if (!command || typeof command.build !== 'function') return '';
    try {
      return command.build(paramValues || {}) || '';
    } catch (e) {
      console.error('Failed to build ADB command:', e);
      return '';
    }
  }, [command, paramValues]);

  const isReady = (command.params || []).every((param) => !param.required || String(paramValues[param.key] ?? '').trim());

  const handleCopy = () => {
    if (!builtCommand) return;
    navigator.clipboard.writeText(builtCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFillTerminal = () => {
    if (builtCommand && onFillTerminal) onFillTerminal(command, builtCommand, paramValues);
  };

  // 风险 badge 样式控制
  const getDangerBadge = (danger) => {
    switch (danger) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-400" /> 高危
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> 中危
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1">
            <Shield className="w-3 h-3 text-blue-400" /> 低危
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
            常规
          </span>
        );
    }
  };

  return (
    <>
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-all shadow-md shadow-slate-200/60 flex flex-col justify-between space-y-3">
        {/* 卡片头部 */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>{command.name}</span>
            </h3>
            {getDangerBadge(command.danger)}
          </div>
          <p className="text-[13px] text-slate-600 leading-relaxed mb-3">
            {command.description}
          </p>

          {/* 参数交互表单 */}
          <AdbParameterForm
            params={command.params}
            paramValues={paramValues}
            onChange={handleParamChange}
          />
        </div>

        {/* 动态命令预览与操作栏 */}
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3 text-blue-500" /> 命令预览
            </span>
            <button onClick={handleCopy} title="复制完整命令" aria-label="复制完整命令" className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-400">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>复制</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-50 px-3 py-2 rounded-lg font-mono text-xs text-slate-600 border border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
            {builtCommand || <span className="text-slate-400 italic">请补充参数</span>}
          </div>

          <button
            onClick={handleFillTerminal}
            disabled={isExecuting || !isReady}
            className={`w-full py-2.5 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 shadow-sm'
            } ${isExecuting || !isReady ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>填入终端</span>
          </button>
        </div>
      </div>

    </>
  );
}
