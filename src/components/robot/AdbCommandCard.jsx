import React, { useState, useEffect } from 'react';
import { Play, Copy, Check, Shield, AlertTriangle, Info } from 'lucide-react';
import AdbParameterForm from './AdbParameterForm';
import DangerConfirmModal from './DangerConfirmModal';

/**
 * 动态 ADB 命令卡片组件
 * 封装命令描述、参数交互表单、动态生成的实际命令构建、危险防范及执行/复制操作
 */
export default function AdbCommandCard({ command, onExecute, isExecuting }) {
  const [paramValues, setParamValues] = useState({});
  const [copied, setCopied] = useState(false);
  const [isDangerModalOpen, setIsDangerModalOpen] = useState(false);

  // 初始化默认参数
  useEffect(() => {
    if (command?.params) {
      const initial = {};
      command.params.forEach((p) => {
        if (p.default !== undefined) {
          initial[p.key] = p.default;
        }
      });
      setParamValues(initial);
    }
  }, [command]);

  const handleParamChange = (key, value) => {
    setParamValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // 动态构建最终产生的完整 ADB 命令
  const builtCommand = command.build ? command.build(paramValues) : '';

  const handleCopy = () => {
    if (!builtCommand) return;
    navigator.clipboard.writeText(builtCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunClick = () => {
    if (command.danger === 'high') {
      setIsDangerModalOpen(true);
    } else {
      executeNow();
    }
  };

  const executeNow = () => {
    onExecute(command, builtCommand, paramValues);
  };

  // 风险 badge 样式控制
  const getDangerBadge = (danger) => {
    switch (danger) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/80 flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-400" /> 高危
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/80 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> 中危
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/80 flex items-center gap-1">
            <Shield className="w-3 h-3 text-blue-400" /> 低危
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
            常规
          </span>
        );
    }
  };

  return (
    <>
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 hover:border-slate-700/80 transition-all shadow-md flex flex-col justify-between space-y-3">
        {/* 卡片头部 */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>{command.name}</span>
            </h3>
            {getDangerBadge(command.danger)}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
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
        <div className="space-y-2 pt-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3 text-blue-400" /> 生成的 ADB 命令预览:
            </span>
            <button
              onClick={handleCopy}
              className="hover:text-slate-200 transition-colors flex items-center gap-1 text-slate-400"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>复制</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-950 px-3 py-2 rounded-lg font-mono text-xs text-emerald-400/90 border border-slate-800/80 overflow-x-auto whitespace-nowrap scrollbar-none">
            {builtCommand || <span className="text-slate-600 italic">命令生成中...</span>}
          </div>

          <button
            onClick={handleRunClick}
            disabled={isExecuting}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              command.danger === 'high'
                ? 'bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-500/50 shadow-md shadow-rose-950/50'
                : command.danger === 'medium'
                ? 'bg-amber-600/80 hover:bg-amber-600 text-white border border-amber-500/50'
                : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/50 shadow-md shadow-blue-950/30'
            } ${isExecuting ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isExecuting ? '命令执行中...' : '发送到终端执行'}</span>
          </button>
        </div>
      </div>

      {/* 危险命令二次确认弹窗 */}
      <DangerConfirmModal
        isOpen={isDangerModalOpen}
        onClose={() => setIsDangerModalOpen(false)}
        onConfirm={executeNow}
        command={command}
        builtCmd={builtCommand}
      />
    </>
  );
}
