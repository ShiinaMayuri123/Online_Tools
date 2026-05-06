import { useState } from 'react';
import { Hash, Copy, Check, ArrowRight } from 'lucide-react';
import ToolLayout from '../components/common/ToolLayout';
import useClipboard from '../hooks/useClipboard';
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
  const { copiedKey, copy } = useClipboard();

  const BASES = [
    { value: 2, label: '二进制 (BIN)', placeholder: '例: 1010' },
    { value: 8, label: '八进制 (OCT)', placeholder: '例: 755' },
    { value: 10, label: '十进制 (DEC)', placeholder: '例: 255' },
    { value: 16, label: '十六进制 (HEX)', placeholder: '例: FF' },
  ];

  const handleConvert = () => {
    setError('');
    if (!input.trim()) { setError('请输入数值'); return; }
    try {
      const bigintValue = BigInt((fromBase === 10 ? '' : '0') + input.trim());
      if (bigintValue < 0n) throw new Error('暂不支持负数');
      const hexStr = bigintValue.toString(16).toUpperCase();
      setResults({
        bin: bigintValue.toString(2),
        oct: bigintValue.toString(8),
        dec: bigintValue.toString(10),
        hex: hexStr,
      });
    } catch {
      setError('输入的数值与所选进制不匹配');
      setResults(null);
    }
  };

  const handleCopy = (text, key) => copy(text, key);

  return (
    <ToolLayout title="进制转换" icon={<Hash size={14} strokeWidth={2.5} />}>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
        {/* 输入区 */}
        <div className="p-5 sm:p-6 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-md space-y-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">输入数值</label>
          <div className="flex gap-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConvert()}
              placeholder={BASES.find(b => b.value === fromBase)?.placeholder || '输入要转换的数值...'}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200 transition-shadow"
            />
            <button
              onClick={handleConvert}
              className={`px-5 py-2.5 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-1.5 ${theme.primaryBg} ${theme.primaryHover}`}
            >
              转换 <ArrowRight size={14} />
            </button>
          </div>

          {/* 进制选择 */}
          <div className="flex flex-wrap gap-2">
            {BASES.map(b => (
              <button
                key={b.value}
                onClick={() => setFromBase(b.value)}
                className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  fromBase === b.value
                    ? `${theme.primaryBg} text-white shadow-lg`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm animate-in fade-in duration-200">{error}</div>
        )}

        {/* 转换结果 */}
        {results && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {[
              { key: 'bin', label: '二进制 (BIN)', value: results.bin },
              { key: 'oct', label: '八进制 (OCT)', value: results.oct },
              { key: 'dec', label: '十进制 (DEC)', value: results.dec },
              { key: 'hex', label: '十六进制 (HEX)', value: results.hex },
            ].map(item => (
              <div
                key={item.key}
                className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div>
                  <div className="text-xs font-bold text-slate-400 mb-1">{item.label}</div>
                  <div className="text-lg font-mono font-bold text-slate-900 break-all">{item.value}</div>
                </div>
                <button
                  onClick={() => handleCopy(item.value, item.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    copiedKey === item.key
                      ? 'bg-green-50 text-green-600'
                      : `hover:bg-slate-50 ${theme.textAccent}`
                  }`}
                >
                  {copiedKey === item.key ? <><Check size={12} /> 已复制</> : <><Copy size={12} /> 复制</>}
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
