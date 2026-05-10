import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Building2, Globe, ShieldCheck, ShieldAlert, Cpu, Network, RefreshCw, Loader2, Server, Ghost, ExternalLink, Mail, Hash, Smartphone, Monitor, MapPinned, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

// ── 多源 IP 一致性校验 ──────────────────────────────────────────────────────
const CONSISTENCY_SOURCES = [
  { id: 'ipify', label: 'ipify.org', url: 'https://api.ipify.org?format=json', parse: d => d.ip },
  { id: 'ipapi', label: 'ip-api.com', url: 'http://ip-api.com/json/?fields=8192', parse: d => d.query },
  { id: 'ipwho', label: 'ipwho.is', url: 'https://ipwho.is/', parse: d => d.ip },
  { id: 'cf', label: 'Cloudflare trace', url: 'https://1.1.1.1/cdn-cgi/trace', parse: (_, text) => { const m = text.match(/ip=(.*)\n/); return m ? m[1].trim() : null; }, isText: true },
];

const IpConsistencyBanner = () => {
  const [results, setResults] = useState({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    Promise.all(
      CONSISTENCY_SOURCES.map(async src => {
        try {
          const res = await fetch(src.url);
          const val = src.isText ? src.parse(null, await res.text()) : src.parse(await res.json());
          setResults(prev => ({ ...prev, [src.id]: val || '失败' }));
        } catch {
          setResults(prev => ({ ...prev, [src.id]: '失败' }));
        }
      })
    ).then(() => setDone(true));
  }, []);

  const ips = Object.values(results).filter(v => v && v !== '失败');
  const uniqueIps = [...new Set(ips)];
  const isConsistent = done && uniqueIps.length === 1 && ips.length === CONSISTENCY_SOURCES.length;
  const hasFailure = done && Object.values(results).some(v => v === '失败');
  const isPartial = done && uniqueIps.length > 1;

  return (
    <div className={`w-full rounded-2xl border overflow-hidden ${isConsistent ? 'border-emerald-200 bg-emerald-50' : isPartial ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <div className="px-5 py-3 flex items-center gap-3 border-b border-inherit">
        {!done ? (
          <Loader2 size={16} className="animate-spin text-slate-400" />
        ) : isConsistent ? (
          <CheckCircle size={16} className="text-emerald-600" />
        ) : isPartial ? (
          <AlertTriangle size={16} className="text-amber-600" />
        ) : (
          <ShieldCheck size={16} className="text-slate-400" />
        )}
        <div>
          <p className={`text-sm font-bold ${isConsistent ? 'text-emerald-700' : isPartial ? 'text-amber-700' : 'text-slate-600'}`}>
            {!done ? '正在进行多源 IP 一致性校验...' :
              isConsistent ? `✅ 四源 IP 一致：${uniqueIps[0]}` :
              isPartial ? `⚠️ 检测到 IP 来源不一致（可能存在代理/负载均衡）` :
              'IP 一致性校验完成'}
          </p>
          {done && hasFailure && <p className="text-[10px] text-slate-400 mt-0.5">部分来源请求失败，结果仅供参考</p>}
        </div>
      </div>
      <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CONSISTENCY_SOURCES.map(src => {
          const ip = results[src.id];
          const isLoading = !ip;
          const isFail = ip === '失败';
          const isDiff = done && ip && !isFail && uniqueIps.length > 1 && ip !== uniqueIps[0];
          return (
            <div key={src.id} className="flex flex-col gap-0.5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{src.label}</p>
              {isLoading ? (
                <div className="h-4 w-24 bg-slate-100 animate-pulse rounded" />
              ) : isFail ? (
                <span className="text-xs font-bold text-slate-300">请求失败</span>
              ) : (
                <span className={`text-xs font-mono font-bold ${isDiff ? 'text-amber-600' : 'text-slate-700'}`}>{ip}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── 主组件 ──────────────────────────────────────────────────────────────────
const IpInfoCard = ({ theme }) => {
  const [data, setData] = useState(null);
  const [cnData, setCnData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchIpInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://ipinfo.io/json');
      if (!response.ok) throw new Error('无法获取 IP 详情');
      const json = await response.json();
      setData(json);
      try {
        const cnRes = await fetch(`http://ip-api.com/json/${json.ip}?fields=66846719&lang=zh-CN`);
        const cnJson = await cnRes.json();
        if (cnJson.status === 'success') setCnData(cnJson);
      } catch (e) { console.warn('中文补充失败', e); }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIpInfo(); }, []);

  const clientInfo = useMemo(() => {
    const ua = navigator.userAgent;
    let browser = '未知浏览器';
    if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome/')) browser = 'Google Chrome';
    else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
    else if (ua.includes('Safari/')) browser = 'Safari';
    let os = '未知系统';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    let device = '桌面设备';
    if (/Mobi|Android|iPhone|iPad/i.test(ua)) device = '移动设备';
    return { browser, os, device };
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="w-full bg-white rounded-2xl p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[50vh] animate-pulse">
          <Loader2 className="animate-spin text-slate-300 mb-4" size={40} />
          <p className="text-slate-400 font-medium">正在获取出口 IP 详情...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full bg-white rounded-2xl p-12 shadow-sm border border-red-100 flex flex-col items-center justify-center min-h-[50vh]">
        <ShieldAlert className="text-red-400 mb-4" size={40} />
        <p className="text-red-500 font-medium mb-4">{error}</p>
        <button onClick={fetchIpInfo} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
          <RefreshCw size={14} /> 重新尝试
        </button>
      </div>
    );
  }

  const [asn, ...orgParts] = (data.org || '').split(' ');
  const orgName = orgParts.join(' ');
  const locationText = cnData ? `${cnData.country}, ${cnData.regionName}, ${cnData.city}` : `${data.city}, ${data.region}, ${data.country}`;
  const countryCode = data.country || '';
  const flagEmoji = countryCode ? String.fromCodePoint(...[...countryCode.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0))) : '';
  let networkType = '标准 ISP';
  if (data.anycast) networkType = 'Anycast 网络';
  else if (cnData?.hosting) networkType = '数据中心托管';
  let privacyTag = '纯净 IP';
  if (cnData?.proxy) privacyTag = '代理/VPN 节点';

  return (
    <div className="space-y-5">
      {/* 多源 IP 一致性校验 */}
      <IpConsistencyBanner />

      {/* 主卡片 */}
      <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden group transition-all hover:shadow-md">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${theme.primaryBg} text-white`}><Globe size={16} /></div>
            <span className="text-sm font-bold text-slate-700">本机 IP 洞察</span>
          </div>
          <button onClick={fetchIpInfo} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-all" title="重新检测">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {/* IP 主展示 */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">主地址</span>
              <div className="flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-400">连接已建立</span>
              </div>
            </div>
            <h1 className="text-5xl sm:text-6xl font-mono font-black text-slate-900 tracking-tighter break-all mb-4">{data.ip}</h1>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <MapPin size={16} className="text-blue-500" />
                <span className="text-sm font-bold text-slate-600">{flagEmoji} {locationText}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <Cpu size={16} className="text-indigo-500" />
                <span className="text-sm font-bold text-slate-600">{data.timezone}</span>
              </div>
              {data.postal && (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                  <Mail size={16} className="text-teal-500" />
                  <span className="text-sm font-bold text-slate-600">邮编: {data.postal}</span>
                </div>
              )}
            </div>
          </div>

          {/* 详细属性网格 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <InfoItem icon={<Building2 size={18} />} label="运营商 / ISP" value={cnData?.isp || orgName || '未知'} subValue={asn} color="text-amber-500" />
            <InfoItem icon={<Server size={18} />} label="主机名 / Hostname" value={data.hostname || '无反向 DNS'} color="text-violet-500" />
            <InfoItem icon={<Ghost size={18} />} label="网络类型 / Privacy" value={networkType} subValue={privacyTag} color="text-rose-500" />
            <InfoItem icon={<Network size={18} />} label="ASN / 组织" value={cnData?.as || asn || '未知'} subValue={cnData?.org || orgName || '未知机构'} color="text-blue-500" />
            <InfoItem icon={<MapPinned size={18} />} label="坐标 / Coordinates" value={data.loc || '未知'} subValue={`${data.city}, ${countryCode}`} color="text-emerald-500" />
            <InfoItem icon={<Hash size={18} />} label="国家代码" value={`${flagEmoji} ${countryCode}`} subValue={cnData?.country || data.country} color="text-cyan-500" />
          </div>

          {/* 客户端环境 */}
          <div className="p-5 bg-gradient-to-r from-slate-50 to-white rounded-2xl border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">客户端环境</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-blue-500" />
                <div><p className="text-[10px] text-slate-400 font-bold">浏览器</p><p className="text-sm font-bold text-slate-700">{clientInfo.browser}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <Monitor size={20} className="text-indigo-500" />
                <div><p className="text-[10px] text-slate-400 font-bold">操作系统</p><p className="text-sm font-bold text-slate-700">{clientInfo.os}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <Smartphone size={20} className="text-emerald-500" />
                <div><p className="text-[10px] text-slate-400 font-bold">设备类型</p><p className="text-sm font-bold text-slate-700">{clientInfo.device}</p></div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部坐标 */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>纬度: {data.loc?.split(',')[0]}</span>
            <span className="w-1 h-1 rounded-full bg-slate-200" />
            <span>经度: {data.loc?.split(',')[1]}</span>
          </div>
          <div className="text-[10px] font-black text-slate-300 italic group-hover:text-slate-400 transition-colors uppercase tracking-widest">数据由 IPINFO.IO 提供</div>
        </div>
      </div>

      {/* 数据来源 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">数据来源</p>
            <div className="flex flex-wrap gap-4">
              {[
                { name: 'IPinfo.io', url: 'https://ipinfo.io', desc: '主 IP 数据' },
                { name: 'ip-api.com', url: 'http://ip-api.com', desc: '中文地理' },
                { name: 'ipwho.is', url: 'https://ipwho.is', desc: '一致性校验' },
                { name: 'Cloudflare', url: 'https://1.1.1.1', desc: '一致性校验' },
              ].map(s => (
                <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
                  {s.name} <span className="text-slate-300 font-normal">({s.desc})</span>
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">权威验证</p>
            <div className="flex flex-wrap gap-3">
              {[
                { name: 'WhatIsMyIP', url: 'https://www.whatismyip.com' },
                { name: 'IPLeak.net', url: 'https://ipleak.net' },
                { name: 'BrowserLeaks', url: 'https://browserleaks.com' },
              ].map(l => (
                <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                  {l.name} <ExternalLink size={9} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ icon, label, value, subValue, color }) => (
  <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 flex items-start gap-4 hover:bg-white hover:shadow-sm transition-all duration-300">
    <div className={`p-2.5 rounded-xl bg-white shadow-sm shrink-0 ${color}`}>{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-black text-slate-800 truncate leading-none mb-1.5">{value}</p>
      {subValue && <p className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100/50 px-1.5 py-0.5 rounded inline-block">{subValue}</p>}
    </div>
  </div>
);

export default IpInfoCard;
