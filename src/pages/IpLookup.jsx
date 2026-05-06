import { useState, useCallback } from 'react';
import {
  Globe, Loader2, Copy, Check, MapPin, Wifi, Clock, Building2, Server,
  ShieldCheck, ShieldAlert, Monitor, RefreshCw, CopyCheck, ChevronDown,
} from 'lucide-react';
import ToolLayout from '../components/common/ToolLayout';
import useClipboard from '../hooks/useClipboard';
import { useTheme } from '../contexts/ThemeContext';

// 多源 IP 查询 API 配置
const IP_APIS = [
  {
    id: 'ipapi',
    name: 'ipapi.co',
    url: 'https://ipapi.co/json/',
    parse: (data) => ({
      ip: data.ip,
      country: data.country_name,
      region: data.region,
      city: data.city,
      isp: data.org,
      timezone: data.timezone,
    }),
  },
  {
    id: 'ipapi-com',
    name: 'ip-api.com',
    url: 'http://ip-api.com/json?fields=status,message,country,regionName,city,isp,timezone,query',
    parse: (data) => ({
      ip: data.query,
      country: data.country,
      region: data.regionName,
      city: data.city,
      isp: data.isp,
      timezone: data.timezone,
    }),
  },
  {
    id: 'ipinfo',
    name: 'ipinfo.io',
    url: 'https://ipinfo.io/json',
    parse: (data) => ({
      ip: data.ip,
      country: data.country,
      region: data.region,
      city: data.city,
      isp: data.org,
      timezone: data.timezone,
    }),
  },
  {
    id: 'ipify',
    name: 'ipify',
    url: 'https://api.ipify.org?format=json',
    parse: (data) => ({ ip: data.ip }),
  },
  {
    id: 'httpbin',
    name: 'httpbin',
    url: 'https://httpbin.org/ip',
    parse: (data) => ({ ip: data.origin }),
  },
];

// 单个 API 查询（带超时）
const fetchWithTimeout = async (url, timeout = 5000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

// WebRTC 获取本地 IP
const getLocalIPs = () => new Promise((resolve) => {
  const ips = new Set();
  const pc = new RTCPeerConnection({ iceServers: [] });
  pc.createDataChannel('');
  pc.createOffer().then(offer => pc.setLocalDescription(offer));
  pc.onicecandidate = (e) => {
    if (!e.candidate) {
      pc.close();
      resolve([...ips]);
      return;
    }
    const match = e.candidate.candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
    if (match) ips.add(match[0]);
  };
  setTimeout(() => { pc.close(); resolve([...ips]); }, 3000);
});

const IpLookup = () => {
  const { theme } = useTheme();
  const [results, setResults] = useState([]);
  const [localIps, setLocalIps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedApi, setExpandedApi] = useState(null);
  const { copiedKey, copy } = useClipboard();

  const handleLookup = useCallback(async () => {
    setLoading(true);
    setResults([]);
    setLocalIps([]);

    // 并发：多源 IP 查询 + WebRTC 本地 IP
    const [apiResults, local] = await Promise.all([
      Promise.allSettled(
        IP_APIS.map(async (api) => {
          const data = await fetchWithTimeout(api.url);
          return { ...api.parse(data), _source: api.name };
        })
      ),
      getLocalIPs(),
    ]);

    const parsed = apiResults.map((r, i) => {
      if (r.status === 'fulfilled') {
        return { api: IP_APIS[i], data: r.value, error: null };
      }
      const msg = r.reason?.name === 'AbortError' ? '请求超时' : r.reason?.message || '未知错误';
      return { api: IP_APIS[i], data: null, error: msg };
    });

    setResults(parsed);
    setLocalIps(local);
    setLoading(false);
  }, []);

  // 一致性分析
  const successResults = results.filter(r => r.data && r.data.ip);
  const failCount = results.length - successResults.length;
  const uniqueIps = [...new Set(successResults.map(r => r.data.ip))];
  const isConsistent = uniqueIps.length === 1 && successResults.length > 1;

  // 汇总信息（取第一个成功且有完整数据的结果）
  const summary = successResults.find(r => r.data.country)?.data;

  // 复制全部结果
  const handleCopyAll = () => {
    const lines = [
      '=== IP 一致性查询结果 ===',
      `查询时间: ${new Date().toLocaleString('zh-CN')}`,
      '',
      '--- 一致性状态 ---',
      successResults.length > 0
        ? `状态: ${isConsistent ? '✅ 所有源 IP 一致' : '⚠️ IP 不一致'}`
        : '状态: ❌ 所有查询失败',
      uniqueIps.length > 0 ? `IP: ${uniqueIps.join(', ')}` : '',
      `成功: ${successResults.length}/${results.length}  失败: ${failCount}/${results.length}`,
      '',
      '--- 各源详细结果 ---',
      ...results.map(r =>
        r.data
          ? `${r.api.name}: ${r.data.ip}${r.data.city ? ` (${r.data.city})` : ''}`
          : `${r.api.name}: 失败 - ${r.error}`
      ),
    ];
    if (localIps.length > 0) {
      lines.push('', '--- WebRTC 本地 IP ---', `局域网: ${localIps.join(', ')}`);
    }
    copy(lines.join('\n'), 'all');
  };

  return (
    <ToolLayout title="IP 一致性查询" icon={<Globe size={14} strokeWidth={2.5} />}>
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-500">
        {/* 查询按钮 */}
        <div className="text-center">
          <button
            onClick={handleLookup}
            disabled={loading}
            className={`px-8 py-3 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-60 flex items-center gap-2 mx-auto ${theme.primaryBg} ${theme.primaryHover}`}
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> 查询中...</>
            ) : (
              <><RefreshCw size={16} /> 一键查询</>
            )}
          </button>
          <p className="text-xs text-slate-400 mt-2">同时查询 5 个源，自动比对 IP 一致性</p>
        </div>

        {/* 空状态 */}
        {results.length === 0 && !loading && (
          <div className="text-center py-16 text-slate-400">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe size={36} className="text-slate-300" />
            </div>
            <p className="text-sm">点击上方按钮开始多源 IP 一致性查询</p>
            <p className="text-xs text-slate-300 mt-1">支持检测代理/VPN 状态</p>
          </div>
        )}

        {/* 加载中 */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 size={32} className="animate-spin mx-auto text-slate-400" />
            <p className="text-sm text-slate-400 mt-3">正在查询 5 个 IP 源...</p>
          </div>
        )}

        {/* 一致性状态栏 */}
        {results.length > 0 && !loading && (
          <div className={`p-4 rounded-xl border shadow-sm animate-in fade-in duration-300 ${
            successResults.length === 0
              ? 'bg-red-50 border-red-200'
              : isConsistent
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-3">
              {successResults.length === 0 ? (
                <ShieldAlert size={20} className="text-red-500 shrink-0" />
              ) : isConsistent ? (
                <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert size={20} className="text-amber-600 shrink-0" />
              )}
              <div>
                <p className={`text-sm font-bold ${
                  successResults.length === 0 ? 'text-red-700'
                    : isConsistent ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {successResults.length === 0
                    ? '所有查询均失败'
                    : isConsistent
                      ? `所有源 IP 一致: ${uniqueIps[0]}`
                      : `IP 不一致 (${uniqueIps.length} 个不同 IP)`}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  成功: {successResults.length}/{results.length}{'  '}
                  失败: {failCount}/{results.length}
                  {uniqueIps.length > 1 && (
                    <span className="ml-2">— 各源返回: {uniqueIps.join(' / ')}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* WebRTC 本地 IP */}
        {localIps.length > 0 && !loading && (
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-md p-4 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-100">
            <div className="flex items-center gap-2 mb-2">
              <Monitor size={15} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">WebRTC 本地 IP</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {localIps.map(ip => (
                <span key={ip} className="font-mono text-sm font-semibold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                  {ip}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">局域网地址，与公网 IP 不同是正常的</p>
          </div>
        )}

        {/* 汇总信息卡片 */}
        {summary && !loading && (
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 delay-200">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">IP 概览</span>
              <button
                onClick={handleCopyAll}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  copiedKey === 'all'
                    ? 'bg-green-50 text-green-600'
                    : `hover:bg-slate-50 ${theme.textAccent}`
                }`}
              >
                {copiedKey === 'all' ? <><CopyCheck size={12} /> 已复制</> : <><Copy size={12} /> 复制全部</>}
              </button>
            </div>
            {[
              { icon: Server, label: 'IP 地址', value: summary.ip },
              summary.country && { icon: Globe, label: '国家', value: summary.country },
              summary.region && { icon: MapPin, label: '地区', value: summary.region },
              summary.city && { icon: Building2, label: '城市', value: summary.city },
              summary.isp && { icon: Wifi, label: 'ISP', value: summary.isp },
              summary.timezone && { icon: Clock, label: '时区', value: summary.timezone },
            ].filter(Boolean).map((f, i) => (
              <div key={f.label} className={`flex items-center justify-between px-5 py-3 group hover:bg-slate-50 transition-colors ${i < 5 ? 'border-b border-slate-50' : ''}`}>
                <div className="flex items-center gap-2.5">
                  <f.icon size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{f.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-semibold text-slate-900">{f.value}</span>
                  <button
                    onClick={() => copy(f.value, f.label)}
                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all"
                  >
                    {copiedKey === f.label ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 各源详细结果 */}
        {results.length > 0 && !loading && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-300">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">各源查询详情</h3>
            {results.map((r, i) => (
              <div key={r.api.id} className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedApi(expandedApi === r.api.id ? null : r.api.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {r.data ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                    )}
                    <span className="text-sm font-bold text-slate-700">{r.api.name}</span>
                    {r.data && (
                      <span className="text-xs font-mono text-slate-400">{r.data.ip}</span>
                    )}
                    {r.error && (
                      <span className="text-xs text-red-400">{r.error}</span>
                    )}
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${expandedApi === r.api.id ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedApi === r.api.id && (
                  <div className="px-4 pb-3 animate-in fade-in duration-200">
                    {r.data ? (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        {r.data.ip && (
                          <div><span className="text-slate-400">IP:</span> <span className="font-mono font-semibold text-slate-700">{r.data.ip}</span></div>
                        )}
                        {r.data.country && (
                          <div><span className="text-slate-400">国家:</span> <span className="text-slate-700">{r.data.country}</span></div>
                        )}
                        {r.data.region && (
                          <div><span className="text-slate-400">地区:</span> <span className="text-slate-700">{r.data.region}</span></div>
                        )}
                        {r.data.city && (
                          <div><span className="text-slate-400">城市:</span> <span className="text-slate-700">{r.data.city}</span></div>
                        )}
                        {r.data.isp && (
                          <div className="col-span-2"><span className="text-slate-400">ISP:</span> <span className="text-slate-700">{r.data.isp}</span></div>
                        )}
                        {r.data.timezone && (
                          <div><span className="text-slate-400">时区:</span> <span className="text-slate-700">{r.data.timezone}</span></div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-red-500">查询失败: {r.error}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default IpLookup;
