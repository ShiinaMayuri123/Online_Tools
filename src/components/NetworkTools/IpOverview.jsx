import React from 'react';
import {
  ShieldCheck, ShieldAlert, AlertTriangle, RefreshCw, Loader2,
  Globe, MapPin, Building2, Server, Network, Hash, Cpu, Mail,
  Monitor, Smartphone, Ghost, MapPinned, CheckCircle, XCircle, Minus,
} from 'lucide-react';

// ── 结论横幅 ────────────────────────────────────────────────────────────────
export const ConclusionBanner = ({ risk }) => {
  const { score } = risk;
  let level, text, icon;
  if (score >= 60) {
    level = 'danger';
    text = '检测到高风险特征：代理/Tor/数据中心';
    icon = <ShieldAlert size={16} />;
  } else if (score >= 30) {
    level = 'warning';
    text = '检测到中等风险特征：可能存在代理或机房';
    icon = <AlertTriangle size={16} />;
  } else {
    level = 'safe';
    text = '你的 IP 是纯净的住宅/移动网络出口';
    icon = <ShieldCheck size={16} />;
  }

  const styles = {
    safe: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    danger: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border ${styles[level]}`}>
      {icon}
      <span className="text-base font-bold">{text}</span>
    </div>
  );
};

// ── 关键指标卡片 ────────────────────────────────────────────────────────────
const MetricCard = ({ label, value, icon, color = 'text-slate-700' }) => (
  <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-4 shadow-md hover:shadow-lg transition-all duration-300">
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-slate-400">{icon}</span>
      <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
    <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
  </div>
);

export const MetricCards = ({ risk, networkType, scoreColor }) => (
  <div className="grid grid-cols-2 gap-3">
    <MetricCard label="风险评分" value={`${risk.score}/100`} icon={<ShieldCheck size={14} />} color={scoreColor} />
    <MetricCard label="连接类型" value={networkType} icon={<Globe size={14} />} color="text-slate-700" />
    <MetricCard label="代理/VPN" value={risk.proxyAny ? '检测到' : '未检测'} icon={<ShieldAlert size={14} />} color={risk.proxyAny ? 'text-amber-500' : 'text-emerald-500'} />
    <MetricCard label="Tor" value={risk.isTor ? '检测到' : '未检测'} icon={<AlertTriangle size={14} />} color={risk.isTor ? 'text-red-500' : 'text-emerald-500'} />
  </div>
);

// ── 详情行 ──────────────────────────────────────────────────────────────────
const DetailRow = ({ icon, label, value, subValue, color = 'text-slate-500' }) => (
  <div className="flex items-center gap-3 py-3 border-b border-slate-100/50 last:border-0">
    <div className={`shrink-0 ${color}`}>{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-base font-bold text-slate-700 truncate">{value || '—'}</p>
      {subValue && <p className="text-sm font-mono text-slate-400 mt-0.5">{subValue}</p>}
    </div>
  </div>
);

// ── 评分因子 ────────────────────────────────────────────────────────────────
const ScoreFactors = ({ risk }) => {
  const factors = [
    { label: 'TOR', active: risk.isTor, pts: 70 },
    { label: '双源代理', active: risk.proxyBoth, pts: 50 },
    { label: '单源代理', active: risk.proxyAny && !risk.proxyBoth, pts: 30 },
    { label: 'VPN', active: risk.isVpn, pts: 25 },
    { label: '数据中心', active: risk.hostingAny, pts: 20 },
    { label: '匿名', active: risk.isAnonymous && !risk.proxyAny && !risk.isVpn, pts: 15 },
    { label: '时区错位', active: risk.tzMismatch, pts: 10 },
    { label: '移动网络', active: risk.isMobile, pts: -5 },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {factors.map(f => (
        <div
          key={f.label}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-bold ${
            f.active
              ? f.pts > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
              : 'bg-slate-50 text-slate-300'
          }`}
        >
          {f.active ? (f.pts > 0 ? <XCircle size={14} /> : <CheckCircle size={14} />) : <Minus size={14} />}
          {f.label}
          <span className="font-mono">{f.pts > 0 ? `+${f.pts}` : f.pts}</span>
        </div>
      ))}
    </div>
  );
};

// ── 一致性校验 ──────────────────────────────────────────────────────────────
export const ConsistencyCheck = ({ consistency, consistencyDone, isConsistent, isPartial, hasFailure }) => {
  const sources = [
    { id: 'ipify', label: 'ipify.org' },
    { id: 'ipapi', label: 'ip-api.com' },
    { id: 'ipwho', label: 'ipwho.is' },
    { id: 'cf', label: 'Cloudflare' },
  ];

  const uniqueIps = [...new Set(Object.values(consistency).filter(v => v && v !== '失败'))];

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-md overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100/50 flex items-center gap-3">
        {!consistencyDone ? (
          <Loader2 size={16} className="animate-spin text-slate-400" />
        ) : isConsistent ? (
          <CheckCircle size={16} className="text-emerald-500" />
        ) : isPartial ? (
          <AlertTriangle size={16} className="text-amber-500" />
        ) : (
          <ShieldCheck size={16} className="text-slate-400" />
        )}
        <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">多源一致性校验</span>
        {consistencyDone && (
          <span className={`text-sm px-2 py-0.5 rounded-full font-bold ${
            isConsistent ? 'bg-emerald-100 text-emerald-600' :
            isPartial ? 'bg-amber-100 text-amber-600' :
            'bg-slate-100 text-slate-500'
          }`}>
            {isConsistent ? '一致' : isPartial ? '不一致' : '部分失败'}
          </span>
        )}
      </div>
      <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {sources.map(src => {
          const ip = consistency[src.id];
          const isLoading = !ip;
          const isFail = ip === '失败';
          const isDiff = consistencyDone && ip && !isFail && uniqueIps.length > 1 && ip !== uniqueIps[0];
          return (
            <div key={src.id}>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-0.5">{src.label}</p>
              {isLoading ? (
                <div className="h-5 w-24 bg-slate-100 animate-pulse rounded" />
              ) : isFail ? (
                <span className="text-sm text-slate-300">请求失败</span>
              ) : (
                <span className={`text-sm font-mono font-bold ${isDiff ? 'text-amber-600' : 'text-slate-700'}`}>{ip}</span>
              )}
            </div>
          );
        })}
      </div>
      {consistencyDone && hasFailure && (
        <div className="px-5 pb-3">
          <p className="text-sm text-slate-400">部分来源请求失败，结果仅供参考</p>
        </div>
      )}
    </div>
  );
};

// ── IP 详情卡片 ─────────────────────────────────────────────────────────────
export const IpDetailCard = ({ ipData, scoreColor, scoreBarColor, score, advice }) => {
  const {
    ip, locationText, flagEmoji, countryCode, city,
    org, asn, hostname, timezone, postal, loc,
    networkType, privacyTag, risk, clientInfo, ipApi,
  } = ipData;

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg overflow-hidden">
      {/* IP 大字展示 */}
      <div className="px-5 py-4 border-b border-slate-100/50">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-1 rounded-lg text-sm font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">主地址</span>
          <ShieldCheck size={14} className="text-emerald-500" />
          <span className="text-sm font-bold text-slate-400">连接已建立</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-mono font-black text-slate-900 tracking-tighter break-all mb-3">{ip}</h1>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <MapPin size={16} className="text-blue-500" />
            <span className="text-sm font-bold text-slate-600">{flagEmoji} {locationText}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <Cpu size={16} className="text-indigo-500" />
            <span className="text-sm font-bold text-slate-600">{timezone}</span>
          </div>
          {postal && (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <Mail size={16} className="text-teal-500" />
              <span className="text-sm font-bold text-slate-600">邮编: {postal}</span>
            </div>
          )}
        </div>
      </div>

      {/* 详细信息 */}
      <div className="px-5 py-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailRow icon={<Building2 size={18} />} label="运营商 / ISP" value={org} subValue={asn} color="text-amber-500" />
          <DetailRow icon={<Server size={18} />} label="主机名" value={hostname || '无反向 DNS'} color="text-violet-500" />
          <DetailRow icon={<Ghost size={18} />} label="网络类型" value={networkType} subValue={privacyTag} color="text-rose-500" />
          <DetailRow icon={<Network size={18} />} label="ASN / 组织" value={ipApi?.as || asn || '—'} subValue={ipApi?.org || org || '—'} color="text-blue-500" />
          <DetailRow icon={<MapPinned size={18} />} label="坐标" value={loc || '—'} subValue={`${city}, ${countryCode}`} color="text-emerald-500" />
          <DetailRow icon={<Hash size={18} />} label="国家代码" value={`${flagEmoji} ${countryCode}`} subValue={ipApi?.country || countryCode} color="text-cyan-500" />
        </div>
      </div>

      {/* 风险评分仪表盘 */}
      <div className="px-5 py-4 border-t border-slate-100/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">风险评分</span>
          <span className={`text-2xl font-mono font-black ${scoreColor}`}>{score}/100</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${scoreBarColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex justify-between text-sm font-bold text-slate-300 mt-1">
          <span>0 低风险</span><span>30</span><span>60</span><span>100 高风险</span>
        </div>
      </div>

      {/* 评分因子明细 */}
      <div className="px-5 py-3 border-t border-slate-100/50">
        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">评分因子明细</p>
        <ScoreFactors risk={risk} />
      </div>

      {/* 安全建议 + 客户端环境 */}
      <div className="border-t border-slate-100/50 grid grid-cols-1 sm:grid-cols-2">
        <div className={`px-5 py-3 ${score >= 30 ? 'bg-amber-50/50' : 'bg-emerald-50/50'} sm:rounded-bl-2xl`}>
          <p className={`text-sm font-bold uppercase tracking-wider mb-2 ${score >= 30 ? 'text-amber-500' : 'text-emerald-500'}`}>安全建议</p>
          <ul className="space-y-2">
            {advice.map((text, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                {score >= 30 ? (
                  <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                )}
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="px-5 py-3 border-t sm:border-t-0 sm:border-l border-slate-100/50">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">客户端环境</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Globe size={20} className="text-blue-500" />
              <div><p className="text-sm text-slate-400 font-bold">浏览器</p><p className="text-base font-bold text-slate-700">{clientInfo.browser}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <Monitor size={20} className="text-indigo-500" />
              <div><p className="text-sm text-slate-400 font-bold">操作系统</p><p className="text-base font-bold text-slate-700">{clientInfo.os}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <Smartphone size={20} className="text-emerald-500" />
              <div><p className="text-sm text-slate-400 font-bold">设备类型</p><p className="text-base font-bold text-slate-700">{clientInfo.device}</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── 数据来源 ────────────────────────────────────────────────────────────────
export const DataSources = ({ refetch }) => (
  <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-md p-5 flex flex-col justify-between">
    <div>
      <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">数据来源</p>
      <div className="space-y-2">
        <a href="https://ipinfo.io" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
          <span className="w-2 h-2 rounded-full bg-indigo-300"></span> IPinfo.io
        </a>
        <a href="http://ip-api.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
          <span className="w-2 h-2 rounded-full bg-indigo-300"></span> ip-api.com
        </a>
        <a href="https://ipwho.is" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
          <span className="w-2 h-2 rounded-full bg-indigo-300"></span> ipwho.is
        </a>
      </div>
    </div>
    <button onClick={refetch} className="mt-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
      <RefreshCw size={13} /> 刷新数据
    </button>
  </div>
);

// ── 加载/错误状态 ───────────────────────────────────────────────────────────
export const IpLoadingState = () => (
  <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-md p-12 flex flex-col items-center justify-center min-h-[50vh]">
    <Loader2 className="animate-spin text-slate-300 mb-4" size={48} />
    <p className="text-lg text-slate-400 font-medium">正在获取出口 IP 详情...</p>
  </div>
);

export const IpErrorState = ({ error, refetch }) => (
  <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-md p-12 flex flex-col items-center justify-center min-h-[50vh]">
    <ShieldAlert className="text-red-400 mb-4" size={48} />
    <p className="text-lg text-red-500 font-medium mb-4">{error}</p>
    <button onClick={refetch} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-base font-bold transition-colors flex items-center gap-2">
      <RefreshCw size={16} /> 重新尝试
    </button>
  </div>
);

// ── 默认导出（兼容旧用法）──────────────────────────────────────────────────
const IpOverview = ({ ipData }) => {
  const { loading, error, refetch, risk, networkType } = ipData;

  if (loading) return <IpLoadingState />;
  if (error) return <IpErrorState error={error} refetch={refetch} />;

  const { score } = risk;
  let scoreColor = 'text-emerald-500';
  let scoreBarColor = 'bg-emerald-500';
  if (score >= 60) { scoreColor = 'text-red-500'; scoreBarColor = 'bg-red-500'; }
  else if (score >= 30) { scoreColor = 'text-amber-500'; scoreBarColor = 'bg-amber-500'; }

  let advice = [];
  if (score >= 60) {
    advice = ['此 IP 被多个来源标记为高风险，建议避免用于任何敏感操作。', '金融、账号登录等操作可能触发强验证或被直接拦截。'];
  } else if (score >= 30) {
    advice = ['IP 具有代理/机房特征，部分网站可能触发 CAPTCHA 验证。', '建议切换至家庭宽带或移动数据网络以提升可信度。'];
  } else {
    advice = ['此 IP 未命中已知代理、TOR 或机房特征，为干净的住宅/移动网络出口。', '建议定期检查异常流量，保持路由器固件更新。'];
  }

  return (
    <div className="space-y-5">
      <ConclusionBanner risk={risk} />
      <MetricCards risk={risk} networkType={networkType} scoreColor={scoreColor} />
      <IpDetailCard ipData={ipData} scoreColor={scoreColor} scoreBarColor={scoreBarColor} score={score} advice={advice} />
      <ConsistencyCheck {...ipData} />
      <DataSources refetch={refetch} />
    </div>
  );
};

export default IpOverview;
