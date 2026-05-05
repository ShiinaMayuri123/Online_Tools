import { useState } from 'react';
import { Hash, Copy, Check } from 'lucide-react';
import ToolLayout from '../components/common/ToolLayout';
import { useTheme } from '../contexts/ThemeContext';

/**
 * 进制转换工具页面
 * 功能：在二进制、八进制、十进制、十六进制之间互相转换。
 */
const BaseConverter = () => {
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [fromBase, setFromBase] = useState(10);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const BASES = [
    { value: 2, label: '二进制 (BIN)' },
    { value: 8, label: '八进制 (OCT)' },
    { value: 10, label: '十进制 (DEC)' },
    { value: 16, label: '十六进制 (HEX)' },
  ];

  const handleConvert = () => {
    setError('');
    if (!input.trim()) { setError('请输入数值'); return; }
    try {
      const decimal = parseInt(input, fromBase);
      if (isNaN(decimal)) throw new Error('无效输入');
      setResults({
        bin: decimal.toString(2),
        oct: decimal.toString(8),
        dec: decimal.toString(10),
        hex: decimal.toString(16).toUpperCase(),
      });
    } catch {
      setError('输入的数值与所选进制不匹配');
      setResults(null);
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <ToolLayout title="进制转换" icon={<Hash size={14} strokeWidth={2.5} />}>
      <div className="space-y-5">
        {/* 输入区 */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">输入数值</label>
          <div className="flex gap-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="输入要转换的数值..."
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <button onClick={handleConvert} className={`px-5 py-2 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow-md transition-all ${theme.primaryBg} ${theme.primaryHover}`}>
              转换
            </button>
          </div>

          {/* 进制选择 */}
          <div className="flex flex-wrap gap-2">
            {BASES.map(b => (
              <button key={b.value} onClick={() => setFromBase(b.value)} className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${fromBase === b.value ? `${theme.primaryBg} text-white` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}

        {/* 转换结果 */}
        {results && (
          <div className="space-y-3">
            {[
              { key: 'bin', label: '二进制 (BIN)', value: results.bin },
              { key: 'oct', label: '八进制 (OCT)', value: results.oct },
              { key: 'dec', label: '十进制 (DEC)', value: results.dec },
              { key: 'hex', label: '十六进制 (HEX)', value: results.hex },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl">
                <div>
                  <div className="text-xs font-bold text-slate-400 mb-1">{item.label}</div>
                  <div className="text-lg font-mono font-bold text-slate-900">{item.value}</div>
                </div>
                <button onClick={() => handleCopy(item.value, item.key)} className={`flex items-center gap-1 text-xs font-bold ${theme.textAccent}`}>
                  {copied === item.key ? <><Check size={12} /> 已复制</> : <><Copy size={12} /> 复制</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default BaseConverter;