import { useState } from 'react';
import { Globe, Loader2, Copy, Check, MapPin, Wifi, Clock, Building2, Server } from 'lucide-react';
import ToolLayout from '../components/common/ToolLayout';
import useClipboard from '../hooks/useClipboard';
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
  const { copiedKey, copy } = useClipboard();

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

  const FIELD_ICONS = {
    'IP 地址': Server,
    '国家': Globe,
    '地区': MapPin,
    '城市': Building2,
    'ISP': Wifi,
    '时区': Clock,
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
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
        {/* 查询按钮 */}
        <div className="text-center">
          <button
            onClick={handleLookup}
            disabled={loading}
            className={`px-8 py-3 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-60 ${theme.primaryBg} ${theme.primaryHover}`}
          >
            {loading ? <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> 查询中...</span> : '查询我的 IP'}
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center animate-in fade-in duration-200">{error}</div>
        )}

        {/* 空状态 */}
        {!ipInfo && !loading && !error && (
          <div className="text-center py-16 text-slate-400">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe size={36} className="text-slate-300" />
            </div>
            <p className="text-sm">点击上方按钮查询你的公网 IP 信息</p>
          </div>
        )}

        {/* 结果展示 */}
        {ipInfo && (
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            {fields.map((f, i) => {
              const Icon = FIELD_ICONS[f.label] || Globe;
              return (
                <div key={f.label} className={`flex items-center justify-between px-5 py-4 group hover:bg-slate-50 transition-colors ${i < fields.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <div className="flex items-center gap-3">
                    <Icon size={16} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{f.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-slate-900">{f.value || '-'}</span>
                    {f.value && (
                      <button
                        onClick={() => copy(f.value, f.label)}
                        className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all"
                        title="复制"
                      >
                        {copiedKey === f.label ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default IpLookup;
