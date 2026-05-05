import { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import ToolLayout from '../components/common/ToolLayout';
import { useTheme } from '../contexts/ThemeContext';

/**
 * 查看当前 IP 工具页面
 * 功能：通过公共 API 获取当前设备的公网 IP 及其地理位置信息。
 */
const IpLookup = () => {
  const { theme } = useTheme();
  const [ipInfo, setIpInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async () => {
    setLoading(true);
    setError('');
    setIpInfo(null);
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error('请求失败');
      const data = await res.json();
      setIpInfo(data);
    } catch (e) {
      setError('获取 IP 信息失败，请稍后重试。(' + e.message + ')');
    } finally {
      setLoading(false);
    }
  };

  const fields = ipInfo ? [
    { label: 'IP 地址', value: ipInfo.ip },
    { label: '国家', value: `${ipInfo.country_name} (${ipInfo.country_code})` },
    { label: '地区', value: ipInfo.region },
    { label: '城市', value: ipInfo.city },
    { label: 'ISP', value: ipInfo.org },
    { label: '时区', value: ipInfo.timezone },
  ] : [];

  return (
    <ToolLayout title="查看当前 IP" icon={<Globe size={14} strokeWidth={2.5} />}>
      <div className="space-y-6">
        {/* 查询按钮 */}
        <div className="text-center">
          <button
            onClick={handleLookup}
            disabled={loading}
            className={`px-6 py-2.5 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-60 ${theme.primaryBg} ${theme.primaryHover}`}
          >
            {loading ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> 查询中...</span> : '查询我的 IP'}
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">{error}</div>
        )}

        {/* 结果展示 */}
        {ipInfo && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {fields.map((f, i) => (
              <div key={f.label} className={`flex items-center justify-between px-5 py-3.5 ${i < fields.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{f.label}</span>
                <span className="text-sm font-mono font-semibold text-slate-900">{f.value || '-'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default IpLookup;