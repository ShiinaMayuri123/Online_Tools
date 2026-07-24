import React, { useState } from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

/**
 * 危险命令高危确认弹窗 Modal
 * 拦截包含高风险 (danger === 'high') 操作，需手动输入确认词或强提示
 */
export default function DangerConfirmModal({ isOpen, onClose, onConfirm, command, builtCmd }) {
  const [confirmInput, setConfirmInput] = useState('');

  if (!isOpen || !command) return null;

  const requiresInputCode = command.danger === 'high';
  const isInputMatched = !requiresInputCode || confirmInput.trim() === 'DELETE';

  const handleConfirm = () => {
    if (isInputMatched) {
      onConfirm();
      setConfirmInput('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-rose-600/40 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Modal Header */}
        <div className="bg-rose-950/40 px-5 py-4 border-b border-rose-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-400 font-semibold">
            <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
            <span>高风险操作确认</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4">
          <div className="text-sm text-slate-300">
            您即将向终端发送并执行高危 ADB 命令：
          </div>

          {/* 警告卡片 */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-400">
              <span>{command.name}</span>
              <span className="px-2 py-0.5 bg-rose-950 text-rose-300 rounded border border-rose-800/50 uppercase text-[10px]">
                {command.danger} Danger
              </span>
            </div>
            <div className="text-xs text-slate-400">{command.description}</div>
            {command.dangerReason && (
              <div className="text-xs text-rose-400/90 font-medium bg-rose-950/30 p-2 rounded border border-rose-900/40 flex items-start gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                <span>后置影响：{command.dangerReason}</span>
              </div>
            )}
            <div className="mt-2 text-xs font-mono bg-black/60 p-2 rounded text-amber-300 overflow-x-auto">
              {builtCmd}
            </div>
          </div>

          {/* 手动输入确认词（针对 high 级别） */}
          {requiresInputCode && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs text-slate-300 font-medium block">
                确认授权：请在下方输入 <span className="font-mono text-rose-400 font-bold">DELETE</span> 以解锁高危执行：
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="请输入 DELETE"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm font-mono text-rose-300 focus:outline-none focus:border-rose-500"
              />
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-3.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
          >
            取消
          </button>
          <button
            disabled={!isInputMatched}
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isInputMatched
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>确认强行执行</span>
          </button>
        </div>
      </div>
    </div>
  );
}
