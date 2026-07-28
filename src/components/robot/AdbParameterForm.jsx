import React from 'react';
import { Upload, CheckSquare, Square } from 'lucide-react';

/**
 * 动态 ADB 参数表单组件
 * 根据 command.params 数据模型自动构建交互式表单元素
 */
export default function AdbParameterForm({ params = [], paramValues = {}, onChange }) {
  if (!params || params.length === 0) {
    return (
      <div className="text-xs text-slate-500 italic py-1">
        该命令无需额外参数，可直接执行
      </div>
    );
  }

  return (
    <div className="space-y-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
      {params.filter(Boolean).map((p) => {
        if (!p || !p.key) return null;
        const value = paramValues[p.key] !== undefined ? paramValues[p.key] : p.default;

        return (
          <div key={p.key} className="flex flex-col space-y-1">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>
                {p.label}
                {p.required && <span className="text-rose-400 ml-1">*</span>}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">key: {p.key}</span>
            </label>

            {/* 1. 文本输入框 */}
            {p.type === 'text' && (
              <input
                type="text"
                value={value || ''}
                placeholder={p.placeholder || ''}
                onChange={(e) => onChange(p.key, e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950/80 border border-slate-700/60 rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono transition-colors"
              />
            )}

            {/* 2. 本地/设备文件选择模拟框 */}
            {p.type === 'file' && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={value || ''}
                  placeholder={p.placeholder || '路径或选取文件'}
                  onChange={(e) => onChange(p.key, e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-slate-950/80 border border-slate-700/60 rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
                <label className="cursor-pointer px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-300 flex items-center gap-1 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  <span>浏览</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        onChange(p.key, e.target.files[0].name);
                      }
                    }}
                  />
                </label>
              </div>
            )}

            {/* 3. 下拉单选框 */}
            {p.type === 'select' && (
              <select
                value={value || ''}
                onChange={(e) => onChange(p.key, e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950/80 border border-slate-700/60 rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              >
                {p.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

            {/* 4. 单个布尔复选框 */}
            {p.type === 'checkbox' && (
              <label className="inline-flex items-center gap-2 cursor-pointer pt-0.5">
                <input
                  type="checkbox"
                  checked={!!value}
                  onChange={(e) => onChange(p.key, e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs text-slate-300">{p.placeholder || '启用该标志项'}</span>
              </label>
            )}

            {/* 5. 多选组合框 (checkbox_group) */}
            {p.type === 'checkbox_group' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {p.options?.map((opt) => {
                  const currentArr = Array.isArray(value) ? value : [];
                  const isChecked = currentArr.includes(opt.value);

                  const handleToggle = () => {
                    let nextArr;
                    if (isChecked) {
                      nextArr = currentArr.filter((v) => v !== opt.value);
                    } else {
                      nextArr = [...currentArr, opt.value];
                    }
                    onChange(p.key, nextArr);
                  };

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={handleToggle}
                      className={`flex items-center gap-1.5 text-left px-2 py-1.5 rounded border text-xs transition-colors ${
                        isChecked
                          ? 'bg-blue-950/60 border-blue-600/70 text-blue-300'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
