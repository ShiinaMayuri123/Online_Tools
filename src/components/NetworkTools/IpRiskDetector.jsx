import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, AlertCircle, Loader2, RefreshCw, ExternalLink, CheckCircle, XCircle, Minus } from 'lucide-react';

// ── 工具函数 ────────────────────────────────────────────────────────────────
const Badge = ({ value, trueLabel = 'True', falseLabel = 'False', unknown = false }) => {
  if (unknown) return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-400">未知</span>;
  return value
    ? <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-600">{trueLabel}</span>
    : <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-600">{falseLabel}</span>;
};

const GridCell = ({ label, value, highlight }) => (
  <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 last:border-0 group hover:bg-slate-50 transition-colors">
    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    <span className={`text-sm font-bold ${highlight ? 'text-indigo-600' : 'text-slate-700'}`}>{value ?? 'N/A'}</span>
  </div>
);

// ── 主组件 ──────────────────────────────────────────────────────────────────
const IpRiskDetector = ({ theme }) => {
  const [ipApi, setIpApi] = useState(null);
  const [ipWho, setIpWho] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    setIpApi(null);
    setIpWho(null);
    try {
      // 先用 ipify 拿 IP，再并发查两个数据源
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipRes.json();

      const [apiData, whoData] = await Promise.allSettled([
        fetch(`http://ip-api.com/json/${ip}?fields=66846719&lang=zh-CN`).then(r => r.json()),
        fetch(`https://ipwho.is/${ip}?security=1`).then(r => r.json()),
      ]);

      if (apiData.status === 'fulfilled' && apiData.value.status === 'success') {
        setIpApi(apiData.value);
      }
      if (whoData.status === 'fulfilled' && whoData.value.success) {
        setIpWho(whoData.value);
      }
      if (!apiData.value?.status && !whoData.value?.success) {
        throw new Error('两个数据源均查询失败');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) {
    return (
      <div className="w-full bg-white rounded-3xl p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-slate-300 mb-4" size={40} />
        <p className="text-slate-400 font-medium text-sm">正在并发查询双源威胁情报...</p>
        <p className="text-slate-300 text-xs mt-1">ip-api.com · ipwho.is</p>
      </div>
    );
  }

  if (error && !ipApi && !ipWho) {
    return (
      <div className="w-full bg-white rounded-3xl p-12 shadow-sm border border-red-100 flex flex-col items-center justify-center min-h-[60vh]">
        <ShieldAlert className="text-red-400 mb-4" size={40} />
        <p className="text-red-500 font-medium text-sm mb-4">{error}</p>
        <button onClick={fetchAll} className="px-5 py-2.5 bg-slate-100 rounded-xl text-sm font-bold text-slate-600 flex items-center gap-2">
          <RefreshCw size={14} /> 重新检测
        </button>
      </div>
    );
  }

  // ── 综合信号计算 ──────────────────────────────────────────────────────────
  const sec = ipWho?.security || {};
  const isTor = sec.tor ?? false;
  // proxy: 两源都确认权重更高
  const proxyA = ipApi?.proxy ?? false;
  const proxyB = sec.proxy ?? false;
  const proxyBoth = proxyA && proxyB;
  const proxyAny = proxyA || proxyB;
  const isVpn = sec.vpn ?? false;
  const hostingA = ipApi?.hosting ?? false;
  const hostingB = sec.hosting ?? false;
  const hostingAny = hostingA || hostingB;
  const isAnonymous = sec.anonymous ?? false;
  const isMobile = ipApi?.mobile ?? false;
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const ipTz = ipApi?.timezone || ipWho?.timezone?.id || '';
  const tzMismatch = ipTz && browserTz !== ipTz;

  let score = 0;
  if (isTor) score += 70;
  if (proxyBoth) score += 50; else if (proxyAny) score += 30;
  if (isVpn) score += 25;
  if (hostingAny) score += 20;
  if (isAnonymous && !proxyAny && !isVpn) score += 15;
  if (tzMismatch) score += 10;
  if (isMobile) score = Math.max(0, score - 5);
  score = Math.min(100, score);

  let riskLevel, headerBg, scoreColor, scoreDark;
  if (score >= 60) { riskLevel = '高风险'; headerBg = 'bg-rose-600'; scoreColor = 'text-rose-500'; scoreDark = 'text-rose-600'; }
  else if (score >= 30) { riskLevel = '中风险'; headerBg = 'bg-amber-500'; scoreColor = 'text-amber-500'; scoreDark = 'text-amber-600'; }
  else { riskLevel = '低风险'; headerBg = 'bg-emerald-500'; scoreColor = 'text-emerald-500'; scoreDark = 'text-emerald-600'; }

  const ip = ipApi?.query || ipWho?.ip || '未知';
  const country = ipApi?.country || ipWho?.country || '—';
  const city = ipApi?.city || ipWho?.city || '—';
  const region = ipApi?.regionName || ipWho?.region || '—';
  const isp = ipApi?.isp || ipWho?.connection?.isp || '—';
  const org = ipApi?.org || ipWho?.connection?.org || '—';
  const asn = ipApi?.as || (ipWho?.connection?.asn ? `AS${ipWho.connection.asn}` : '—');
  const hostname = ipWho?.connection?.domain || '—';
  const zip = ipApi?.zip || ipWho?.postal || 'N/A';
  const lat = ipApi?.lat || ipWho?.latitude;
  const lon = ipApi?.lon || ipWho?.longitude;
  const coords = lat && lon ? `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}` : '—';
  const connType = isMobile ? '移动蜂窝网络' : hostingAny ? '数据中心' : '住宅宽带';

  return (
    <div className="space-y-5">
      {/* ── 主卡片 ── */}
      <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">

        {/* 顶部状态条 */}
        <div className={`${headerBg} px-6 py-3 flex items-center justify-between text-white`}>
          <div className="flex items-center gap-2">
            {score < 30 ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
            <span className="font-black tracking-wide">{riskLevel}</span>
            <span className="text-white/60 text-xs ml-2">欺诈评分 {score}/100</span>
          </div>
          <button onClick={fetchAll} className="text-white/70 hover:text-white transition-colors"><RefreshCw size={15} /></button>
        </div>

        {/* ── IP 信息头部（仿 IPQS 横排） ── */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-wrap items-start gap-x-8 gap-y-2">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">IP 地址</p>
              <p className="text-2xl font-mono font-black text-slate-800">{ip}</p>
            </div>
            <div className="flex flex-wrap gap-6 items-end pb-0.5">
              {[
                { label: '国家', value: country },
                { label: '城市', value: city },
                { label: '省份', value: region },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-sm font-bold text-slate-700">{item.value}</p>
                </div>
              ))}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">VPN</p>
                <Badge value={isVpn} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TOR</p>
                <Badge value={isTor} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">代理</p>
                <Badge value={proxyAny} />
              </div>
            </div>
          </div>
        </div>

        {/* ── 评分条 ── */}
        <div className="px-6 pt-5 pb-3">
          <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
            <span>← 最低风险 (0)</span>
            <span className={`${scoreColor} font-black text-base`}>{score} / 100</span>
            <span>最高风险 (100) →</span>
          </div>
          <div className="w-full h-3 flex rounded-full overflow-hidden bg-slate-100">
            {/* 渐变填充条 */}
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${score}%`,
                background: score < 30
                  ? '#10b981'
                  : score < 60
                    ? `linear-gradient(to right, #10b981, #f59e0b)`
                    : `linear-gradient(to right, #10b981, #f59e0b, #ef4444)`,
              }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-bold text-slate-300 mt-1">
            <span>0 低风险</span><span>30</span><span>60</span><span>100 高风险</span>
          </div>
        </div>

        {/* ── 数据网格（仿 IPQS 表格式） ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-slate-100">
          {/* 左列 */}
          <div className="border-r border-slate-100">
            <GridCell label="欺诈评分" value={<span className={`${scoreColor} font-black text-lg font-mono`}>{score}</span>} />
            <GridCell label="代理 / VPN（双源）" value={<div className="flex gap-1.5 items-center">
              <Badge value={proxyAny} /> {proxyBoth && <span className="text-[9px] text-slate-400">双源确认</span>}
            </div>} />
            <GridCell label="活跃 VPN" value={<Badge value={isVpn} />} />
            <GridCell label="TOR 出口节点" value={<Badge value={isTor} />} />
            <GridCell label="匿名标记" value={<Badge value={isAnonymous} />} />
          </div>
          {/* 中列 */}
          <div className="border-r border-slate-100">
            <GridCell label="时区" value={ipTz || '—'} highlight />
            <GridCell label="时区一致性" value={tzMismatch ? <Badge value={true} trueLabel="不一致 ⚠️" /> : <Badge value={false} falseLabel="一致 ✅" />} />
            <GridCell label="数据中心托管" value={<div className="flex gap-1.5 items-center">
              <Badge value={hostingAny} /> {hostingA && hostingB && <span className="text-[9px] text-slate-400">双源确认</span>}
            </div>} />
            <GridCell label="移动网络" value={<Badge value={isMobile} trueLabel="是" falseLabel="否" />} />
            <GridCell label="连接类型" value={connType} highlight />
          </div>
          {/* 右列 */}
          <div>
            <GridCell label="主机名" value={<span className="font-mono text-xs">{hostname}</span>} />
            <GridCell label="ISP" value={isp} highlight />
            <GridCell label="组织 / Org" value={org} highlight />
            <GridCell label="ASN" value={asn} highlight />
            <GridCell label="邮编" value={zip} />
          </div>
        </div>

        {/* 坐标 */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">坐标</span>
          <span className="text-xs font-mono font-bold text-slate-600">{coords}</span>
        </div>

        {/* ── 评分因子明细 ── */}
        <div className="p-5 border-t border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">评分因子明细</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'TOR', active: isTor, pts: 70 },
              { label: '双源代理', active: proxyBoth, pts: 50 },
              { label: '单源代理', active: proxyAny && !proxyBoth, pts: 30 },
              { label: 'VPN', active: isVpn, pts: 25 },
              { label: '数据中心', active: hostingAny, pts: 20 },
              { label: '匿名', active: isAnonymous && !proxyAny && !isVpn, pts: 15 },
              { label: '时区错位', active: tzMismatch, pts: 10 },
              { label: '移动网络', active: isMobile, pts: -5 },
            ].map(f => (
              <div key={f.label} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold ${
                f.active
                  ? f.pts > 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'bg-slate-50 border-slate-100 text-slate-300'
              }`}>
                {f.active ? (f.pts > 0 ? <XCircle size={12} /> : <CheckCircle size={12} />) : <Minus size={12} />}
                {f.label}
                <span className="font-mono">{f.pts > 0 ? `+${f.pts}` : f.pts}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 安全建议 ── */}
        <div className={`p-5 border-t border-slate-100 ${score >= 30 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2 ${score >= 30 ? 'text-amber-500' : 'text-emerald-500'}">安全建议</p>
          <ul className="space-y-1.5 text-xs text-slate-600">
            {score >= 60 ? (
              <>
                <li className="flex gap-2"><AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />此 IP 被多个来源标记为高风险，建议避免用于任何敏感操作。</li>
                <li className="flex gap-2"><AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />金融、账号登录等操作可能触发强验证或被直接拦截。</li>
              </>
            ) : score >= 30 ? (
              <>
                <li className="flex gap-2"><AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />IP 具有代理/机房特征，部分网站可能触发 CAPTCHA 验证。</li>
                <li className="flex gap-2"><AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />建议切换至家庭宽带或移动数据网络以提升可信度。</li>
              </>
            ) : (
              <>
                <li className="flex gap-2"><ShieldCheck size={13} className="text-emerald-500 shrink-0 mt-0.5" />此 IP 未命中已知代理、TOR 或机房特征，为干净的住宅/移动网络出口。</li>
                <li className="flex gap-2"><ShieldCheck size={13} className="text-emerald-500 shrink-0 mt-0.5" />建议定期检查异常流量，保持路由器固件更新。</li>
              </>
            )}
          </ul>
        </div>

        {/* ── 免责说明 ── */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            ⚠️ 本工具基于开源免费接口（ip-api.com · ipwho.is），不包含商业威胁数据库。实际风险判断可能与商业平台存在差异。
          </p>
        </div>
      </div>

      {/* ── 数据来源 & 权威验证 ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">数据来源（双源并发）</p>
            <div className="flex gap-4">
              <a href="http://ip-api.com" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
                ip-api.com <ExternalLink size={9} />
              </a>
              <a href="https://ipwho.is" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
                ipwho.is <ExternalLink size={9} />
              </a>
              <a href="https://ipify.org" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
                ipify.org <ExternalLink size={9} />
              </a>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">深度对比（权威商业平台）</p>
            <div className="flex flex-wrap gap-3">
              {[
                { name: 'Scamalytics', url: 'https://scamalytics.com' },
                { name: 'AbuseIPDB', url: 'https://www.abuseipdb.com' },
                { name: 'IPQualityScore', url: 'https://www.ipqualityscore.com' },
                { name: 'VirusTotal', url: 'https://www.virustotal.com/gui/home/search' },
              ].map(l => (
                <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-1">
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

export default IpRiskDetector;
