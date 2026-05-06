import { useState, useCallback, useMemo } from 'react';
import {
  Globe, Loader2, Copy, Check, MapPin, Wifi, Clock, Building2, Server,
  ShieldCheck, ShieldAlert, Monitor, RefreshCw, CopyCheck, ChevronDown,
  Fingerprint, Network, ExternalLink, Scan, Droplets, Map,
} from 'lucide-react';
import ToolLayout from '../components/common/ToolLayout';
import useClipboard from '../hooks/useClipboard';
import { useTheme } from '../contexts/ThemeContext';

// 常见地名中英文映射
const REGION_MAP = {
  // 中国省份
  'Beijing': '北京', 'Shanghai': '上海', 'Tianjin': '天津', 'Chongqing': '重庆',
  'Guangdong': '广东', 'Zhejiang': '浙江', 'Jiangsu': '江苏', 'Fujian': '福建',
  'Shandong': '山东', 'Henan': '河南', 'Sichuan': '四川', 'Hubei': '湖北',
  'Hunan': '湖南', 'Hebei': '河北', 'Anhui': '安徽', 'Jiangxi': '江西',
  'Liaoning': '辽宁', 'Heilongjiang': '黑龙江', 'Jilin': '吉林', 'Shanxi': '山西',
  'Shaanxi': '陕西', 'Yunnan': '云南', 'Guizhou': '贵州', 'Gansu': '甘肃',
  'Hainan': '海南', 'Qinghai': '青海', 'Xinjiang': '新疆', 'Tibet': '西藏',
  'Ningxia': '宁夏', 'Guangxi': '广西', 'Inner Mongolia': '内蒙古', 'Nei Mongol': '内蒙古',
  'Hong Kong': '香港', 'Macau': '澳门', 'Taiwan': '台湾',
  // 其他常见国家/地区
  'United States': '美国', 'United Kingdom': '英国', 'Japan': '日本', 'Korea': '韩国',
  'South Korea': '韩国', 'Singapore': '新加坡', 'Thailand': '泰国', 'Vietnam': '越南',
  'Malaysia': '马来西亚', 'Indonesia': '印度尼西亚', 'Philippines': '菲律宾',
  'India': '印度', 'Australia': '澳大利亚', 'Canada': '加拿大', 'Germany': '德国',
  'France': '法国', 'Russia': '俄罗斯', 'Brazil': '巴西', 'Netherlands': '荷兰',
  'Sweden': '瑞典', 'Switzerland': '瑞士', 'Spain': '西班牙', 'Italy': '意大利',
  'Mexico': '墨西哥', 'Turkey': '土耳其', 'Poland': '波兰', 'Norway': '挪威',
};

// 地名翻译：优先查映射表，未命中则返回原文
const translate = (text) => {
  if (!text) return text;
  return REGION_MAP[text] || text;
};

// 多源 IP 查询 API 配置（全部支持 CORS，优先返回 IPv4）
const IP_APIS = [
  {
    id: 'ipify',
    name: 'ipify',
    website: 'https://www.ipify.org/',
    url: 'https://api.ipify.org?format=json',
    parse: (data) => ({ ip: data.ip }),
  },
  {
    id: 'ipapi-com',
    name: 'ip-api.com',
    website: 'https://ip-api.com/',
    url: 'https://ip-api.com/json?fields=status,message,country,regionName,city,isp,timezone,query&lang=zh-CN',
    parse: (data) => ({
      ip: data.query, country: translate(data.country), region: translate(data.regionName),
      city: translate(data.city), isp: data.isp, timezone: data.timezone,
    }),
  },
  {
    id: 'httpbin',
    name: 'httpbin',
    website: 'https://httpbin.org/',
    url: 'https://httpbin.org/ip',
    parse: (data) => ({ ip: data.origin }),
  },
  {
    id: 'bigdatacloud',
    name: 'BigDataCloud',
    website: 'https://www.bigdatacloud.com/',
    url: 'https://api.bigdatacloud.net/data/client-ip',
    parse: (data) => ({ ip: data.ipString }),
  },
  {
    id: 'ipsb',
    name: 'ip.sb',
    website: 'https://ip.sb/',
    url: 'https://api.ip.sb/geoip',
    parse: (data) => ({
      ip: data.ip, country: translate(data.country), region: translate(data.region),
      city: translate(data.city), isp: data.isp || data.organization, timezone: data.timezone,
    }),
  },
  {
    id: 'ifconfig',
    name: 'ifconfig.me',
    website: 'https://ifconfig.me/',
    url: 'https://ifconfig.me/all.json',
    parse: (data) => ({ ip: data.ip_addr }),
  },
  {
    id: 'jsonip',
    name: 'jsonip.com',
    website: 'https://jsonip.com/',
    url: 'https://jsonip.com',
    parse: (data) => ({ ip: data.ip }),
  },
  {
    id: 'ipwhois',
    name: 'ipwho.is',
    website: 'https://ipwho.is/',
    url: 'https://ipwho.is/?lang=zh',
    parse: (data) => ({
      ip: data.ip, country: translate(data.country), region: translate(data.region),
      city: translate(data.city), isp: data.connection?.isp, timezone: data.timezone?.id,
    }),
  },
  {
    id: 'seeip',
    name: 'seeip.org',
    website: 'https://seeip.org/',
    url: 'https://api.seeip.org/jsonip',
    parse: (data) => ({ ip: data.ip }),
  },
  {
    id: 'wtfismyip',
    name: 'WTF Is My IP',
    website: 'https://wtfismyip.com/',
    url: 'https://wtfismyip.com/json',
    parse: (data) => ({
      ip: data.YourFuckingIPAddress, country: translate(data.YourFuckingCountry),
      city: translate(data.YourFuckingCity), isp: data.YourFuckingISP,
    }),
  },
];

// 带超时的 fetch
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
    if (!e.candidate) { pc.close(); resolve([...ips]); return; }
    const match = e.candidate.candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
    if (match) ips.add(match[0]);
  };
  setTimeout(() => { pc.close(); resolve([...ips]); }, 3000);
});

/**
 * IP 标准化：统一格式后再比较
 * - IPv4-mapped IPv6 (::ffff:1.2.3.4) → IPv4 (1.2.3.4)
 * - 去除首尾空白和端口号
 * - IPv6 统一小写
 */
const normalizeIp = (ip) => {
  if (!ip) return ip;
  let s = ip.trim();
  // 去除端口号：仅处理 IPv4:port 和 [IPv6]:port，避免误伤裸 IPv6 地址
  if (s.startsWith('[')) {
    const m = s.match(/^\[(.+)\]:(\d+)$/);
    if (m) s = m[1];
  } else {
    const parts = s.split(':');
    if (parts.length === 2 && /^\d+$/.test(parts[1])) {
      s = parts[0];
    }
  }
  // IPv4-mapped IPv6: ::ffff:1.2.3.4 → 1.2.3.4
  const v4mapped = s.match(/^::[fF]{4}:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4mapped) return v4mapped[1];
  // ::1 是 IPv6 loopback，不算 IPv4
  // IPv6 统一小写
  if (s.includes(':')) return s.toLowerCase();
  return s;
};

/**
 * 比较两个 IP 的地理位置是否一致（城市级匹配）
 * 用于判断 IPv4/IPv6 指向同一物理地址的情况
 */
const isSameLocation = (geo1, geo2) => {
  if (!geo1 || !geo2) return false;
  if (!geo1.country || !geo2.country) return false;
  if (geo1.country !== geo2.country) return false;
  if (geo1.city && geo2.city) return geo1.city === geo2.city;
  if (geo1.region && geo2.region) return geo1.region === geo2.region;
  return true;
};

/**
 * 多数投票算法：确定真实出口 IP
 * 返回 { realIp, realGeo, realGroup, minority, geoConsistent, ipGroups }
 */
const analyzeConsensus = (successResults) => {
  if (successResults.length === 0) return null;

  // 按标准化后的 IP 分组（但显示原始 IP）
  const ipGroups = {};
  successResults.forEach(r => {
    const ip = normalizeIp(r.data.ip);
    if (!ipGroups[ip]) ipGroups[ip] = [];
    ipGroups[ip].push(r);
  });

  // 按票数排序
  const sorted = Object.entries(ipGroups).sort((a, b) => b[1].length - a[1].length);
  const [realIp, realGroup] = sorted[0];

  // 从多数派中取最完整的地理信息
  const realGeo = realGroup.find(r => r.data.country)?.data || realGroup[0].data;

  // 将少数派拆分为：真正差异 vs 地理位置一致（仅 IP 格式不同）
  const trueMinority = [];
  const geoConsistent = [];

  sorted.slice(1).forEach(([ip, group]) => {
    const minorityGeo = group.find(r => r.data.country)?.data;
    if (minorityGeo && realGeo && isSameLocation(realGeo, minorityGeo)) {
      geoConsistent.push([ip, group]);
    } else {
      trueMinority.push([ip, group]);
    }
  });

  return { realIp, realGeo, realGroup, minority: trueMinority, geoConsistent, ipGroups: sorted };
};

const IpLookup = () => {
  const { theme } = useTheme();
  const [results, setResults] = useState([]);
  const [localIps, setLocalIps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: IP_APIS.length });
  const [expandedApi, setExpandedApi] = useState(null);
  const { copiedKey, copy } = useClipboard();

  const handleLookup = useCallback(async () => {
    setLoading(true);
    setResults([]);
    setLocalIps([]);
    setProgress({ done: 0, total: IP_APIS.length });

    // 并行：本地 IP 检测 + 各 API 查询（渐进式更新）
    const localPromise = getLocalIPs().then(ips => { setLocalIps(ips); });

    const tempResults = new Array(IP_APIS.length).fill(null);
    let doneCount = 0;

    const apiPromises = IP_APIS.map(async (api, index) => {
      try {
        const data = await fetchWithTimeout(api.url);
        tempResults[index] = { api, data: api.parse(data), error: null };
      } catch (e) {
        const msg = e.name === 'AbortError' ? '请求超时' : e.message || '未知错误';
        tempResults[index] = { api, data: null, error: msg };
      }
      doneCount++;
      setProgress(prev => ({ ...prev, done: doneCount }));
      setResults([...tempResults]);
    });

    await Promise.all(apiPromises);
    await localPromise;
    setLoading(false);
  }, []);

  // 分析数据
  const successResults = useMemo(() => results.filter(r => r && r.data && r.data.ip), [results]);
  const consensus = useMemo(() => analyzeConsensus(successResults), [successResults]);
  const isConsistent = consensus && consensus.minority.length === 0 && successResults.length > 1;
  const hasProxy = consensus && consensus.minority.length > 0;

  // 复制全部
  const handleCopyAll = () => {
    const lines = ['=== IP 一致性查询结果 ===', `时间: ${new Date().toLocaleString('zh-CN')}`, ''];
    if (consensus) {
      lines.push(`真实出口 IP: ${consensus.realIp}`);
      if (consensus.realGeo.city) lines.push(`位置: ${consensus.realGeo.city}, ${consensus.realGeo.region}, ${consensus.realGeo.country}`);
      if (consensus.realGeo.isp) lines.push(`ISP: ${consensus.realGeo.isp}`);
      lines.push('');
    }
    if (hasProxy) {
      lines.push('--- 可能的代理/VPN 泄漏 ---');
      consensus.minority.forEach(([ip, group]) => {
        lines.push(`${ip}: ${group.map(r => r.api.name).join(', ')}`);
      });
      lines.push('');
    }
    if (consensus && consensus.geoConsistent.length > 0) {
      lines.push('--- IP 格式不同但位置一致 ---');
      consensus.geoConsistent.forEach(([ip, group]) => {
        lines.push(`${ip}: ${group.map(r => r.api.name).join(', ')}`);
      });
      lines.push('');
    }
    lines.push('--- 各源详情 ---');
    results.filter(Boolean).forEach(r => {
      lines.push(r.data ? `${r.api.name}: ${r.data.ip}` : `${r.api.name}: 失败 - ${r.error}`);
    });
    if (localIps.length > 0) lines.push('', `本地 IP: ${localIps.join(', ')}`);
    copy(lines.join('\n'), 'all');
  };

  return (
    <ToolLayout title="IP 一致性查询" icon={<Globe size={14} strokeWidth={2.5} />}>
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-500">

        {/* 查询按钮 */}
        <div className="text-center">
          <button
            onClick={handleLookup}
            disabled={loading}
            className={`px-8 py-3 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-60 flex items-center gap-2 mx-auto ${theme.primaryBg} ${theme.primaryHover}`}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> 查询中...</> : <><RefreshCw size={16} /> 一键查询</>}
          </button>
          <p className="text-xs text-slate-400 mt-1.5">多源并发查询，多数投票确定真实出口 IP</p>
        </div>

        {/* 空状态 */}
        {results.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-400">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Globe size={28} className="text-slate-300" />
            </div>
            <p className="text-sm">点击按钮开始查询</p>
            <p className="text-xs text-slate-300 mt-0.5">检测代理/VPN · 确定真实出口 IP</p>
          </div>
        )}

        {/* 查询进度 */}
        {loading && (
          <div className="text-center py-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Loader2 size={16} className="animate-spin text-slate-400" />
              <span className="text-sm font-bold text-slate-600">
                {progress.done}/{progress.total} 已完成
              </span>
            </div>
            <div className="w-48 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${theme.primaryBg}`}
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ===== 核心：真实出口 IP Hero 卡片 ===== */}
        {consensus && results.length > 1 && (
          <div className={`relative overflow-hidden rounded-2xl border shadow-md animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            hasProxy ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
          }`}>
            {/* 装饰色条 */}
            <div className={`absolute top-0 left-0 w-1 h-full ${hasProxy ? 'bg-amber-400' : 'bg-emerald-400'}`} />

            <div className="p-4 sm:p-5 pl-5 sm:pl-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Fingerprint size={16} className={hasProxy ? 'text-amber-600' : 'text-emerald-600'} />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">真实出口 IP</span>
                    {isConsistent && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">全部一致</span>
                    )}
                    {hasProxy && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">检测到差异</span>
                    )}
                  </div>
                  <p className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 tracking-tight">{consensus.realIp}</p>
                  {consensus.realGeo.city && (
                    <p className="text-sm text-slate-600 mt-1.5 flex items-center gap-1.5">
                      <MapPin size={13} className="text-slate-400" />
                      {[consensus.realGeo.city, consensus.realGeo.region, consensus.realGeo.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {consensus.realGeo.isp && (
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <Wifi size={12} />
                      {consensus.realGeo.isp}
                    </p>
                  )}
                  {consensus.realGeo.timezone && (
                    <p className="text-xs text-slate-400 mt-2">{consensus.realGeo.timezone}</p>
                  )}
                </div>

                {/* 状态图标 */}
                <div className={`p-2.5 rounded-xl ${hasProxy ? 'bg-amber-100' : 'bg-emerald-100'} shrink-0`}>
                  {hasProxy ? (
                    <ShieldAlert size={22} className="text-amber-600" />
                  ) : (
                    <ShieldCheck size={22} className="text-emerald-600" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== 代理/VPN 差异警告 ===== */}
        {hasProxy && (
          <div className="bg-white/80 backdrop-blur-sm border border-amber-200 rounded-xl shadow-sm p-3 animate-in fade-in duration-300 delay-100">
            <div className="flex items-center gap-2 mb-2">
              <Network size={14} className="text-amber-500" />
              <span className="text-xs font-bold text-amber-700">检测到代理/VPN 差异</span>
            </div>
            <div className="space-y-1.5">
              {consensus.minority.map(([ip, group]) => (
                <div key={ip} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-amber-700">{ip}</span>
                  <span className="text-amber-500">{group.map(r => r.api.name).join(', ')}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">少数源返回了不同 IP，可能是代理/VPN 泄漏了真实地址</p>
          </div>
        )}

        {/* ===== IP 格式不同但位置一致 ===== */}
        {consensus && consensus.geoConsistent.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-xl shadow-sm p-3 animate-in fade-in duration-300 delay-100">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={14} className="text-blue-500" />
              <span className="text-xs font-bold text-blue-700">IP 格式不同但位置一致</span>
            </div>
            <div className="space-y-1.5">
              {consensus.geoConsistent.map(([ip, group]) => (
                <div key={ip} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-blue-700">{ip}</span>
                  <span className="text-blue-500">{group.map(r => r.api.name).join(', ')}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">这些 IP 地址格式不同但指向同一地理位置，可能是 IPv4/IPv6 地址差异</p>
          </div>
        )}

        {/* ===== 紧凑摘要栏 ===== */}
        {results.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 animate-in fade-in duration-300 delay-150">
            {/* WebRTC */}
            {localIps.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Monitor size={12} className="text-slate-400" />
                本地: {localIps.map((ip, i) => <span key={ip} className="font-mono">{i > 0 && ', '}{ip}</span>)}
              </div>
            )}
            {/* 复制按钮 */}
            <button
              onClick={handleCopyAll}
              disabled={loading}
              className={`ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-40 ${
                copiedKey === 'all' ? 'bg-green-50 text-green-600' : `hover:bg-slate-100 ${theme.textAccent}`
              }`}
            >
              {copiedKey === 'all' ? <><CopyCheck size={12} /> 已复制</> : <><Copy size={12} /> 复制全部</>}
            </button>
          </div>
        )}

        {/* ===== 各源详情（可折叠，仅显示成功的源） ===== */}
        {successResults.length > 0 && (
          <div className="space-y-1.5 animate-in fade-in duration-300 delay-200">
            {successResults.map((r) => {
              const normalizedIp = normalizeIp(r.data.ip);
              const isReal = consensus && normalizedIp === consensus.realIp;
              const isMinority = consensus && consensus.minority.some(([ip]) => ip === normalizedIp);
              const isGeoConsistent = consensus && consensus.geoConsistent.some(([ip]) => ip === normalizedIp);
              return (
                <div key={r.api.id} className={`bg-white/80 backdrop-blur-sm border rounded-xl shadow-sm overflow-hidden transition-colors ${
                  isMinority ? 'border-amber-200' : isGeoConsistent ? 'border-blue-200' : 'border-slate-200'
                }`}>
                  <button
                    onClick={() => setExpandedApi(expandedApi === r.api.id ? null : r.api.id)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isMinority ? (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      ) : isGeoConsistent ? (
                        <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      )}
                      <a
                        href={r.api.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm font-bold text-slate-700 shrink-0 hover:underline hover:text-slate-900 inline-flex items-center gap-1"
                      >
                        {r.api.name}
                        <ExternalLink size={10} className="text-slate-300" />
                      </a>
                      <span className="text-xs font-mono text-slate-400 truncate">{r.data.ip}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isReal && <span className="text-[10px] font-bold text-emerald-600">真实</span>}
                      {isMinority && <span className="text-[10px] font-bold text-amber-600">差异</span>}
                      {isGeoConsistent && <span className="text-[10px] font-bold text-blue-600">位置一致</span>}
                      <ChevronDown
                        size={14}
                        className={`text-slate-400 transition-transform duration-200 ${expandedApi === r.api.id ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>
                  {expandedApi === r.api.id && (
                    <div className="px-3.5 pb-2.5 animate-in fade-in duration-200">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div><span className="text-slate-400">IP:</span> <span className="font-mono font-semibold text-slate-700">{r.data.ip}</span></div>
                        {r.data.country && <div><span className="text-slate-400">国家:</span> <span className="text-slate-700">{r.data.country}</span></div>}
                        {r.data.region && <div><span className="text-slate-400">地区:</span> <span className="text-slate-700">{r.data.region}</span></div>}
                        {r.data.city && <div><span className="text-slate-400">城市:</span> <span className="text-slate-700">{r.data.city}</span></div>}
                        {r.data.isp && <div className="col-span-2"><span className="text-slate-400">ISP:</span> <span className="text-slate-700">{r.data.isp}</span></div>}
                        {r.data.timezone && <div><span className="text-slate-400">时区:</span> <span className="text-slate-700">{r.data.timezone}</span></div>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ===== 外部检测工具 ===== */}
        {results.length > 0 && (
          <div className="animate-in fade-in duration-300 delay-300">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mb-2">深入检测</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { name: 'BrowserScan', desc: '浏览器指纹 & IP 泄漏检测', icon: Scan, url: 'https://www.browserscan.net/', color: 'text-blue-600 bg-blue-50' },
                { name: 'BrowserLeaks', desc: 'WebRTC/DNS/IP 泄漏全面检测', icon: Droplets, url: 'https://browserleaks.com/', color: 'text-violet-600 bg-violet-50' },
                { name: 'IP2Location', desc: 'IP 地理位置 & 代理检测', icon: Map, url: 'https://www.ip2location.com/', color: 'text-emerald-600 bg-emerald-50' },
              ].map((tool) => (
                <a
                  key={tool.name}
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 flex items-start gap-3"
                >
                  <div className={`p-2 rounded-lg shrink-0 ${tool.color}`}>
                    <tool.icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-800">{tool.name}</span>
                      <ExternalLink size={11} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{tool.desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default IpLookup;
