import { useState } from 'react';
import { Braces, Copy, Check, Trash2 } from 'lucide-react';
import ToolLayout from '../components/common/ToolLayout';
import { useTheme } from '../contexts/ThemeContext';

/**
 * JsonFormatter: JSON 格式化工具页面
 * 功能：JSON 美化（带缩进）、压缩（单行）、语法校验、一键复制。
 */
const JsonFormatter = () => {
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [indent, setIndent] = useState(2); // 缩进空格数，默认 2

  // 格式化 JSON（美化）
  const handleFormat = () => {
    setError('');
    if (!input.trim()) { setError('请输入 JSON 内容'); return; }
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
    } catch (e) {
      setError(`JSON 解析错误: ${e.message}`);
      setOutput('');
    }
  };

  // 压缩 JSON（单行）
  const handleMinify = () => {
    setError('');
    if (!input.trim()) { setError('请输入 JSON 内容'); return; }
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
    } catch (e) {
      setError(`JSON 解析错误: ${e.message}`);
      setOutput('');
    }
  };

  // 复制结果
  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 清空所有内容
  const handleClear = () => { setInput(''); setOutput(''); setError(''); };

  return (
    <ToolLayout title="JSON 格式化" icon={<Braces size={14} strokeWidth={2.5} />}>
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-sm p-6 ring-1 ring-slate-900/5">
        {/* 操作栏 */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <button onClick={handleFormat} className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all ${theme.primaryBg} ${theme.primaryHover}`}>
            美化
          </button>
          <button onClick={handleMinify} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all">
            压缩
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs text-slate-500 font-medium">缩进:</label>
            <select value={indent} onChange={(e) => setIndent(Number(e.target.value))} className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
              <option value={2}>2 空格</option>
              <option value={4}>4 空格</option>
              <option value={1}>Tab</option>
            </select>
          </div>
          <button onClick={handleClear} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="清空">
            <Trash2 size={16} />
          </button>
        </div>

        {/* 输入区 */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">输入 JSON</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='{"name": "Antigravity", "type": "toolbox"}'
            className="w-full h-48 p-4 text-sm font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-slate-300 placeholder:text-slate-300"
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-medium">
            {error}
          </div>
        )}

        {/* 输出区 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">输出结果</label>
            {output && (
              <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors">
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? '已复制' : '复制'}
              </button>
            )}
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="格式化结果将显示在这里..."
            className="w-full h-48 p-4 text-sm font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-xl resize-y focus:outline-none placeholder:text-slate-300"
          />
        </div>
      </div>
    </ToolLayout>
  );
};

export default JsonFormatter;
