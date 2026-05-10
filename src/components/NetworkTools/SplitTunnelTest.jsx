import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, Loader2, Globe, Navigation, ExternalLink, CheckCircle, AlertCircle, Target, BarChart2 } from 'lucide-react';

// ── 站点数据 ────────────────────────────────────────────────────────────────
// precision: 'native' = 🎯 A类原生接口（直达目标公司基础设施）
//            'ref'    = 📊 B类参考接口（第三方 API 代测）
const SITES = [
  // ── 国内（6个）
  { id: 'baidu',    name: '百度',     category: '国内', icon: 'https://www.baidu.com/favicon.ico',       testUrl: 'https://api.ip.sb/geoip',               precision: 'ref' },
  { id: 'ali',      name: '阿里巴巴', category: '国内', icon: 'https://www.alibaba.com/favicon.ico',      testUrl: 'https://api.ipify.org?format=json',      precision: 'ref' },
  { id: 'bili',     name: '哔哩哔哩', category: '国内', icon: 'https://www.bilibili.com/favicon.ico',    testUrl: 'https://api4.ipify.org?format=json',     precision: 'ref' },
  { id: 'tencent',  name: '腾讯视频', category: '国内', icon: 'https://v.qq.com/favicon.ico',            testUrl: 'https://api.ip.sb/geoip',               precision: 'ref' },
  { id: 'netease',  name: '网易',     category: '国内', icon: 'https://www.163.com/favicon.ico',         testUrl: 'https://api4.my-ip.io/ip.json',          precision: 'ref' },
  { id: 'jd',       name: '京东',     category: '国内', icon: 'https://www.jd.com/favicon.ico',          testUrl: 'https://api.ipify.org?format=json',      precision: 'ref' },

  // ── 国际（14个）
  { id: 'cf',       name: 'Cloudflare',   category: '国际', icon: 'https://www.cloudflare.com/favicon.ico',  testUrl: 'https://1.1.1.1/cdn-cgi/trace',         precision: 'native' },
  { id: 'cfcdn',    name: 'Cloudflare CDN', category: '国际', icon: 'https://www.cloudflare.com/favicon.ico', testUrl: 'https://cloudflare.com/cdn-cgi/trace',  precision: 'native' },
  { id: 'aws',      name: 'Amazon AWS',   category: '国际', icon: 'https://aws.amazon.com/favicon.ico',       testUrl: 'https://checkip.amazonaws.com/',        precision: 'native' },
  { id: 'google',   name: 'Google',       category: '国际', icon: 'https://www.google.com/favicon.ico',       testUrl: 'https://api.ipify.org?format=json',     precision: 'ref' },
  { id: 'youtube',  name: 'YouTube',      category: '国际', icon: 'https://www.youtube.com/favicon.ico',      testUrl: 'https://api64.ipify.org?format=json',  precision: 'ref' },
  { id: 'ms',       name: 'Microsoft',    category: '国际', icon: 'https://www.microsoft.com/favicon.ico',    testUrl: 'https://api.ip.sb/geoip',               precision: 'ref' },
  { id: 'github',   name: 'GitHub',       category: '国际', icon: 'https://github.com/favicon.ico',           testUrl: 'https://api4.my-ip.io/ip.json',         precision: 'ref' },
  { id: 'netflix',  name: 'Netflix',      category: '国际', icon: 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico', testUrl: 'https://icanhazip.com', precision: 'ref' },
  { id: 'discord',  name: 'Discord',      category: '国际', icon: 'https://discord.com/favicon.ico',          testUrl: 'https://api.ip.sb/geoip',               precision: 'ref' },
  { id: 'x',        name: 'X / Twitter',  category: '国际', icon: 'https://abs.twimg.com/favicons/twitter.2.ico', testUrl: 'https://api.ip.sb/geoip',            precision: 'ref' },
  { id: 'steam',    name: 'Steam',        category: '国际', icon: 'https://store.steampowered.com/favicon.ico', testUrl: 'https://api.ipify.org?format=json',    precision: 'ref' },
  { id: 'openai',   name: 'OpenAI',       category: '国际', icon: 'https://openai.com/favicon.ico',           testUrl: 'https://icanhazip.com',                 precision: 'ref' },
  { id: 'tg',       name: 'Telegram',     category: '国际', icon: 'https://telegram.org/favicon.ico',         testUrl: 'https://api4.my-ip.io/ip.json',         precision: 'ref' },
  { id: 'meta',     name: 'Meta / IG',    category: '国际', icon: 'https://www.instagram.com/favicon.ico',    testUrl: 'https://api.ip.sb/geoip',               precision: 'ref' },
];

// ── 延迟四级颜色 ─────────────────────────────────────────────────────────────
const getLatencyStyle = (ms) => {
  if (ms < 100) return { dot: 'bg-emerald-500', text: 'text-emerald-600', label: '极快' };
  if (ms < 300) return { dot: 'bg-yellow-400', text: 'text-yellow-600', label: '良好' };
  if (ms < 600) return { dot: 'bg-orange-400', text: 'text-orange-600', label: '一般' };
  return { dot: 'bg-red-500', text: 'text-red-500', label: '慢' };
};

// ── IP 解析 ──────────────────────────────────────────────────────────────────
const parseIp = async (site, res) => {
  if (site.testUrl.includes('trace')) {
    const text = await res.text();
    const m = text.match(/ip=(.*)\n/);
    return m ? m[1].trim() : '未知';
  }
  if (site.testUrl.includes('icanhazip') || site.testUrl.includes('checkip.amazonaws')) {
    const text = await res.text();
    return text.trim();
  }
  const data = await res.json();
  return data.ip || data.query || data.origin || '未知';
};

// ── 主组件 ───────────────────────────────────────────────────────────────────
const SplitTunnelTest = ({ theme }) => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const testSite = async (site) => {
    const t0 = performance.now();
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 7000);
      const res = await fetch(site.testUrl, { signal: ctrl.signal });
      clearTimeout(tid);
      const duration = Math.round(performance.now() - t0);
      const ip = await parseIp(site, res);
      setResults(prev => ({ ...prev, [site.id]: { status: 'ok', ip, location: null, duration } }));
    } catch {
      setResults(prev => ({ ...prev, [site.id]: { status: 'err', duration: Math.round(performance.now() - t0) } }));
    }
  };

  // 批量串行查询物理地址（去重 IP，防止 ip-api.com 限流）
  const fetchLocations = async (siteResults) => {
    const uniqueIps = [...new Set(
      Object.values(siteResults)
        .filter(r => r?.status === 'ok' && r.ip && r.ip !== '未知')
        .map(r => r.ip)
    )];
    const locationMap = {};
    for (const ip of uniqueIps) {
      try {
        const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp&lang=zh-CN`);
        const d = await r.json();
        locationMap[ip] = d.status === 'success'
          ? `${d.country} ${d.regionName} ${d.city}（${d.isp}）`
          : '保留/局域网地址';
      } catch { locationMap[ip] = '接口限流'; }
      await new Promise(res => setTimeout(res, 120));
    }
    return locationMap;
  };

  const runAll = useCallback(async () => {
    setLoading(true);
    setResults({});
    // 第一阶段：并发获取所有站点 IP
    await Promise.all(SITES.map(testSite));
    // 第二阶段：串行批量查询物理地址
    setResults(prev => {
      const snap = { ...prev };
      fetchLocations(snap).then(locationMap => {
        setResults(current => {
          const updated = { ...current };
          Object.keys(updated).forEach(id => {
            const r = updated[id];
            if (r?.status === 'ok' && r.ip && locationMap[r.ip] !== undefined) {
              updated[id] = { ...r, location: locationMap[r.ip] };
            }
          });
          return updated;
        });
      });
      return snap;
    });
    setLoading(false);
  }, []);

  useEffect(() => { runAll(); }, [runAll]);

  // 分流结论分析
  const cnOk = SITES.filter(s => s.category === '国内').map(s => results[s.id]).filter(r => r?.status === 'ok');
  const intlOk = SITES.filter(s => s.category === '国际').map(s => results[s.id]).filter(r => r?.status === 'ok');
  const cnIps = [...new Set(cnOk.map(r => r.ip))];
  const intlIps = [...new Set(intlOk.map(r => r.ip))];
  const allDone = Object.keys(results).length === SITES.length;
  const isSplit = allDone && cnIps.length > 0 && intlIps.length > 0 && !cnIps.some(ip => intlIps.includes(ip));

  return (
    <div className="space-y-5">
      <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500 text-white"><Activity size={16} /></div>
            <span className="text-sm font-bold text-slate-700">网站分流测试</span>
            <span className="text-[10px] font-bold text-slate-400 ml-1">20 个站点</span>
          </div>
          <button onClick={runAll} disabled={loading} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${loading ? 'bg-slate-50 text-slate-400' : `${theme.primaryBg} text-white shadow-sm hover:shadow-md`}`}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {loading ? '检测中...' : '重新检测'}
          </button>
        </div>

        {/* 精度说明条 */}
        <div className="px-6 py-3 bg-slate-50/60 border-b border-slate-100 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Target size={12} className="text-emerald-600" />
            <span><strong className="text-emerald-600">原生</strong> — 请求直达目标公司基础设施（高置信度）</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <BarChart2 size={12} className="text-slate-400" />
            <span><strong className="text-slate-400">参考</strong> — 通过第三方 API 代测（有效但非直连）</span>
          </div>
        </div>

        {/* 分流结论摘要 */}
        {allDone && (
          <div className={`px-6 py-4 border-b flex items-start gap-3 ${isSplit ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
            {isSplit ? <CheckCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />}
            <div>
              <p className={`text-sm font-bold ${isSplit ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isSplit ? '✅ 分流配置正确：国内与国际出口 IP 不同' : '⚠️ 分流未生效：国内与国际出口 IP 相同或无法判断'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                国内出口: {cnIps.slice(0, 3).join(', ') || '—'} · 国际出口: {intlIps.slice(0, 3).join(', ') || '—'}
                {(cnIps.length > 3 || intlIps.length > 3) && ' …'}
              </p>
            </div>
          </div>
        )}

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[28%]">目标站点</th>
                <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[22%]">探测 IP</th>
                <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[37%]">物理地址关联</th>
                <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-[13%]">延迟</th>
              </tr>
            </thead>
            <tbody>
              {/* 国内站点组 */}
              <tr className="bg-blue-50/40">
                <td colSpan={4} className="px-5 py-1.5 text-[9px] font-black text-blue-500 uppercase tracking-widest">国内站点</td>
              </tr>
              {SITES.filter(s => s.category === '国内').map(site => (
                <SiteRow key={site.id} site={site} result={results[site.id]} />
              ))}
              {/* 国际站点组 */}
              <tr className="bg-purple-50/40 border-t border-slate-100">
                <td colSpan={4} className="px-5 py-1.5 text-[9px] font-black text-purple-500 uppercase tracking-widest">国际站点</td>
              </tr>
              {SITES.filter(s => s.category === '国际').map(site => (
                <SiteRow key={site.id} site={site} result={results[site.id]} />
              ))}
            </tbody>
          </table>
        </div>

        {/* 分流小知识 */}
        <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Globe size={180} /></div>
          <div className="relative z-10 flex items-start gap-4">
            <Navigation size={22} className="text-blue-400 shrink-0 mt-1" />
            <div>
              <h3 className="text-base font-black mb-3">分流小知识</h3>
              <div className="space-y-2 text-xs text-slate-300 leading-relaxed max-w-3xl">
                <p>• <strong>什么是分流？</strong> 代理客户端根据域名规则集，将"国内"流量走直连，"国际"流量走代理节点出口。</p>
                <p>• <strong>如何判断是否成功？</strong> 国内站点显示中国 IP，国际站点显示代理出口 IP（通常为境外），两者不同即为分流成功。</p>
                <p>• <strong>精度说明（重要）：</strong> 🎯 原生接口请求直达目标公司服务器（如 Cloudflare trace），结果高度可信。📊 参考接口通过第三方 API 代测，可信度略低但仍有效反映分流状态。</p>
                <p>• <strong>IP 不一致？</strong> 多个国际站点显示不同 IP 可能是代理使用了多出口/负载均衡策略，属正常现象。</p>
                <p>• <strong>测试失败？</strong> 部分 API 可能限流或 CORS 策略变化，不代表对应网站无法访问。</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 数据来源 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">测试接口</p>
            <div className="flex flex-wrap gap-3">
              {['api.ipify.org', 'api4.ipify.org', 'api.ip.sb', '1.1.1.1/trace', 'checkip.amazonaws.com', 'icanhazip.com', 'api4.my-ip.io'].map(s => (
                <span key={s} className="text-[10px] font-mono font-bold text-slate-400">{s}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">参考站点</p>
            <div className="flex gap-3">
              {[{ name: 'ip.skk.moe', url: 'https://ip.skk.moe' }, { name: 'IPLeak.net', url: 'https://ipleak.net' }].map(l => (
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

const SiteRow = ({ site, result }) => {
  const isLoading = !result;
  const isError = result?.status === 'err';
  const latency = result?.duration;
  const ls = latency !== undefined ? getLatencyStyle(latency) : null;

  return (
    <tr className="group hover:bg-slate-50/80 transition-colors border-b border-slate-50">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 shadow-sm p-1 flex items-center justify-center shrink-0">
            <img src={site.icon} alt={site.name} className="w-full h-full object-contain grayscale-[0.4] group-hover:grayscale-0 transition-all" onError={e => { e.target.style.display = 'none'; }} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-sm font-bold text-slate-700 leading-none">{site.name}</p>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${site.category === '国内' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>{site.category}</span>
            </div>
            <div className="flex items-center gap-1">
              {site.precision === 'native'
                ? <span className="flex items-center gap-0.5 text-[8px] font-black text-emerald-600"><Target size={8} />原生</span>
                : <span className="flex items-center gap-0.5 text-[8px] font-black text-slate-400"><BarChart2 size={8} />参考</span>
              }
            </div>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        {isLoading ? <div className="h-4 w-28 bg-slate-100 animate-pulse rounded" /> :
          isError ? <span className="text-xs font-bold text-red-400">超时/拦截</span> :
          <span className="text-sm font-mono font-bold text-slate-700 break-all group-hover:text-slate-900 transition-colors">{result.ip}</span>}
      </td>
      <td className="px-5 py-3.5">
        {isLoading ? <div className="h-4 w-40 bg-slate-100 animate-pulse rounded" /> :
          isError ? <span className="text-xs text-slate-300">—</span> :
          result.location === null
            ? <div className="h-4 w-40 bg-slate-100 animate-pulse rounded" />
            : <span className="text-xs font-medium text-slate-600 group-hover:text-slate-800 transition-colors">{result.location}</span>}
      </td>
      <td className="px-5 py-3.5 text-right">
        {isLoading ? <div className="h-4 w-14 bg-slate-100 animate-pulse rounded ml-auto" /> : (
          <div className="flex items-center justify-end gap-1.5">
            {ls && <div className={`w-2 h-2 rounded-full shrink-0 ${ls.dot}`} />}
            <div className="text-right">
              <span className={`text-xs font-mono font-black ${ls ? ls.text : 'text-slate-400'}`}>{latency}ms</span>
              {ls && <p className={`text-[8px] font-bold ${ls.text} leading-none mt-0.5`}>{ls.label}</p>}
            </div>
          </div>
        )}
      </td>
    </tr>
  );
};

export default SplitTunnelTest;
