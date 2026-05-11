import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, ShieldAlert, AlertCircle, RefreshCw, Loader2,
  Globe, Info, CheckCircle, XCircle,
} from 'lucide-react';

// ── STUN 服务器列表 ─────────────────────────────────────────────────────────
const STUN_SERVERS = [
  { url: 'stun:stun.miwifi.com', name: '小米路由器', category: '国内' },
  { url: 'stun:39.107.142.158', name: 'Bilibili', category: '国内' },
  { url: 'stun:stun.chat.bilibili.com:3478', name: 'Bilibili 备', category: '国内' },
  { url: 'stun:stun.l.google.com:19302', name: 'Google', category: '国际' },
  { url: 'stun:stun1.l.google.com:19302', name: 'Google', category: '国际' },
  { url: 'stun:stun2.l.google.com:19302', name: 'Google', category: '国际' },
  { url: 'stun:stun3.l.google.com:19302', name: 'Google', category: '国际' },
  { url: 'stun:global.stun.twilio.com:3478', name: 'Twilio', category: '国际' },
  { url: 'stun:stun.cloudflare.com:3478', name: 'Cloudflare', category: '国际' },
  { url: 'stun:stun.nextcloud.com:3478', name: 'Nextcloud', category: '国际' },
  { url: 'stun:stun.ekiga.net', name: 'Ekiga', category: '国际' },
  { url: 'stun:stun.stunprotocol.org:3478', name: 'StunProtocol', category: '国际' },
  { url: 'stun:stun.voip.blackberry.com:3478', name: 'BlackBerry', category: '国际' },
  { url: 'stun:stun.sipnet.ru:3478', name: 'SIPnet', category: '国际' },
  { url: 'stun:stun.hot-chilli.net:3478', name: 'Hot Chilli', category: '国际' },
];

// ── STUN 测试行 ─────────────────────────────────────────────────────────────
const StunRow = ({ server, result, httpIp }) => {
  const isLoading = !result;
  const isError = result?.status === 'error';
  const isSuccess = result?.status === 'success';
  const isLeak = isSuccess && httpIp && result.ip !== httpIp &&
    !result.ip.startsWith('10.') && !result.ip.startsWith('192.168.') && !result.ip.startsWith('172.');

  return (
    <tr className={`group hover:bg-slate-50/80 transition-colors border-b border-slate-50 ${isLeak ? 'bg-red-50/30' : ''}`}>
      <td className="px-4 py-2.5">
        <span className="text-sm font-mono text-slate-500">{server.url.replace('stun:', '')}</span>
      </td>
      <td className="px-4 py-2.5 text-left">
        <div className="flex items-center gap-1.5">
          <span className={`px-1.5 py-0.5 rounded text-sm font-black ${server.category === '国内' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>{server.category}</span>
          <span className="text-sm text-slate-500">{server.name}</span>
        </div>
      </td>
      <td className="px-4 py-2.5">
        {isLoading ? <div className="h-5 w-28 bg-slate-100 animate-pulse rounded" /> :
         isError ? <span className="text-sm font-mono text-red-300">{result.error}</span> : (
           <div className="flex items-center gap-2">
             <Globe size={13} className={server.category === '国内' ? 'text-blue-400' : 'text-purple-400'} />
             <span className={`text-sm font-mono font-bold ${isLeak ? 'text-red-600' : 'text-slate-700'}`}>{result.ip}</span>
             {isLeak && <span className="text-sm font-black text-red-500 bg-red-100 px-1.5 py-0.5 rounded">泄露</span>}
           </div>
         )}
      </td>
      <td className="px-4 py-2.5">
        {isLoading ? <div className="h-5 w-36 bg-slate-100 animate-pulse rounded" /> :
         isError ? <span className="text-sm text-slate-300">—</span> :
         result.location === null
           ? <div className="h-5 w-36 bg-slate-100 animate-pulse rounded" />
           : <span className="text-sm font-medium text-slate-600">{result.location}</span>}
      </td>
    </tr>
  );
};

// ── 主组件 ──────────────────────────────────────────────────────────────────
const LeakDetection = ({ ipData }) => {
  const { ip: httpIp, locationText, org } = ipData;

  const [results, setResults] = useState({});
  const [hostIps, setHostIps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dnsResult, setDnsResult] = useState(null);

  const testStun = (server) => {
    return new Promise((resolve) => {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: server.url }] });
      let resolved = false;

      const finish = (status, ip = null, error = null) => {
        if (resolved) return;
        resolved = true;
        pc.close();
        resolve(status === 'success' && ip ? { status: 'success', ip, location: null } : { status: 'error', error: error || 'STUN 连接失败' });
      };

      const timer = setTimeout(() => finish('error', null, '超时'), 5000);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          const str = e.candidate.candidate;
          if (e.candidate.type === 'srflx') {
            const v4 = str.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
            const v6 = !v4 && str.match(/\b([0-9a-f]{1,4}(?::[0-9a-f]{0,4}){2,7})\b/i);
            const ip = v4 ? v4[1] : (v6 ? v6[1] : null);
            if (ip) { clearTimeout(timer); finish('success', ip); }
          } else if (e.candidate.type === 'host') {
            const m = str.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
            if (m) setHostIps(prev => prev.includes(m[1]) ? prev : [...prev, m[1]]);
          }
        } else {
          if (!resolved) { clearTimeout(timer); finish('error', null, '未返回 srflx candidate'); }
        }
      };

      pc.createDataChannel('');
      pc.createOffer().then(o => pc.setLocalDescription(o)).catch(() => finish('error', null, 'Offer 创建失败'));
    });
  };

  const fetchLocations = async (rawResults) => {
    const uniqueIps = [...new Set(
      Object.values(rawResults).filter(r => r.status === 'success' && r.ip).map(r => r.ip)
    )];
    const locationMap = {};
    for (const ip of uniqueIps) {
      try {
        const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp&lang=zh-CN`);
        const d = await r.json();
        locationMap[ip] = d.status === 'success' ? `${d.country} ${d.regionName} ${d.city}（${d.isp}）` : '未知归属地';
      } catch { locationMap[ip] = '查询失败'; }
      await new Promise(res => setTimeout(res, 120));
    }
    return locationMap;
  };

  const detectDns = useCallback(async () => {
    try {
      const res = await fetch('https://dns.google/resolve?name=ipleak.net&type=A', { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      const dnsIp = data.Answer?.[0]?.data || null;
      setDnsResult({ ip: dnsIp, status: 'ok' });
    } catch {
      setDnsResult({ ip: null, status: 'error' });
    }
  }, []);

  const detectAll = useCallback(async () => {
    setLoading(true);
    setResults({});
    setHostIps([]);
    setDnsResult(null);

    const stunResults = await Promise.all(STUN_SERVERS.map(s => testStun(s)));
    const rawMap = {};
    STUN_SERVERS.forEach((s, i) => { rawMap[s.url] = stunResults[i]; });
    setResults({ ...rawMap });

    const locationMap = await fetchLocations(rawMap);
    setResults(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(url => {
        const r = updated[url];
        if (r.status === 'success' && r.ip && locationMap[r.ip]) {
          updated[url] = { ...r, location: locationMap[r.ip] };
        }
      });
      return updated;
    });

    await detectDns();
    setLoading(false);
  }, [detectDns]);

  useEffect(() => { (async () => { await detectAll(); })(); }, [detectAll]);

  const successResults = Object.values(results).filter(r => r.status === 'success');
  const srflxIps = [...new Set(successResults.map(r => r.ip))];
  const webrtcPublicIps = srflxIps.filter(ip => !ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('172.'));
  const hasPublicLeak = webrtcPublicIps.length > 0;
  const isRealLeak = httpIp && webrtcPublicIps.length > 0 && !webrtcPublicIps.includes(httpIp);
  const isDnsLeak = dnsResult?.ip && httpIp && dnsResult.ip !== httpIp;
  const hasAnyLeak = isRealLeak || isDnsLeak;

  return (
    <div className="space-y-5">
      {/* 泄露状态总结 */}
      <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border ${
        hasAnyLeak ? 'bg-red-50 border-red-200 text-red-700' :
        hasPublicLeak ? 'bg-amber-50 border-amber-200 text-amber-700' :
        'bg-emerald-50 border-emerald-200 text-emerald-700'
      }`}>
        {loading ? <Loader2 size={18} className="animate-spin" /> :
         hasAnyLeak ? <ShieldAlert size={18} /> :
         hasPublicLeak ? <AlertCircle size={18} /> :
         <ShieldCheck size={18} />}
        <div>
          <span className="text-base font-bold">
            {loading ? '正在检测泄露...' :
             hasAnyLeak ? '检测到 IP 泄露' :
             hasPublicLeak ? 'WebRTC 检测到公网 IP（与 HTTP 出口一致）' :
             '未检测到 IP 泄露'}
          </span>
          {!loading && (
            <p className="text-sm opacity-70 mt-0.5">
              {hasAnyLeak ? 'WebRTC 或 DNS 暴露了你的真实 IP，建议检查代理配置' :
               hasPublicLeak ? '公网 IP 与 HTTP 出口一致，未发现额外泄露' :
               'HTTP 出口与 WebRTC 检测结果一致，网络环境安全'}
            </p>
          )}
        </div>
      </div>

      {/* HTTP vs WebRTC 对比 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-md p-5 min-h-[160px] flex flex-col justify-center items-center text-center">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">HTTP 出口 IP</p>
          <p className="text-2xl font-mono font-black text-slate-800 mb-2">{httpIp || '获取中...'}</p>
          <p className="text-sm text-slate-500">
            {locationText || '地理位置查询中...'}{org ? `（${org}）` : ''}
          </p>
        </div>
        <div className={`bg-white/60 backdrop-blur-md rounded-2xl border shadow-md p-5 min-h-[160px] flex flex-col justify-center items-center text-center ${isRealLeak ? 'border-red-200' : 'border-white/40'}`}>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">WebRTC 检测到的公网 IP</p>
          {webrtcPublicIps.length > 0 ? (
            <div className="space-y-1">
              {webrtcPublicIps.map(ip => {
                const r = Object.values(results).find(res => res && res.ip === ip && res.location);
                const loc = r ? r.location : '解析中...';
                return (
                  <div key={ip}>
                    <p className={`text-2xl font-mono font-black ${isRealLeak ? 'text-red-600' : 'text-slate-800'}`}>{ip}</p>
                    <p className="text-sm text-slate-500">{loc}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-2xl font-mono text-slate-300">无</p>
          )}
        </div>
      </div>

      {/* 一致性判断 */}
      {!loading && httpIp && webrtcPublicIps.length > 0 && (
        <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border text-base font-bold ${
          isRealLeak ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
        }`}>
          {isRealLeak ? <XCircle size={18} /> : <CheckCircle size={18} />}
          {isRealLeak ? 'WebRTC 暴露了与 HTTP 出口不同的真实 IP' : 'WebRTC IP 与 HTTP 出口一致，未额外泄露'}
        </div>
      )}

      {/* DNS 泄露检测 */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-md p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">DNS 泄露检测</span>
          <button onClick={detectDns} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-all">
            <RefreshCw size={14} />
          </button>
        </div>
        {dnsResult ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">DNS 服务器 IP</span>
              <span className="text-sm font-mono font-bold text-slate-700">{dnsResult.ip || '获取失败'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">与出口 IP 一致</span>
              {dnsResult.ip === null ? (
                <span className="text-sm text-slate-300">无法判断</span>
              ) : isDnsLeak ? (
                <span className="text-sm font-bold text-red-500 flex items-center gap-1"><XCircle size={14} /> 不一致</span>
              ) : (
                <span className="text-sm font-bold text-emerald-500 flex items-center gap-1"><CheckCircle size={14} /> 一致</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-300">等待检测...</p>
        )}
      </div>

      {/* 本地候选者 */}
      {hostIps.length > 0 && (
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-md p-4">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">本地网卡 IP（Host Candidate）</p>
          <div className="flex flex-wrap gap-2">
            {hostIps.map(ip => (
              <span key={ip} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-600">{ip}</span>
            ))}
          </div>
        </div>
      )}

      {/* STUN 测试结果表 */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-md overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">STUN 服务器测试结果</span>
            <span className="text-sm font-bold text-slate-300">{STUN_SERVERS.length} 个服务器</span>
            {!loading && Object.keys(results).length > 0 && (
              <span className="text-sm font-bold text-slate-500">
                · {Object.values(results).filter(r => r?.status === 'success' && r.ip && !r.ip.startsWith('10.') && !r.ip.startsWith('192.168.')).length} 个检测到公网 IP
              </span>
            )}
          </div>
          <button
            onClick={detectAll}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${loading ? 'bg-slate-50 text-slate-400' : 'bg-white/40 hover:bg-white border border-white/50 hover:border-slate-300 text-slate-600 hover:text-slate-900 shadow-sm'}`}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {loading ? '检测中...' : '重新检测'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-4 py-2.5 text-sm font-black text-slate-400 uppercase tracking-widest">STUN 服务器</th>
                <th className="px-4 py-2.5 text-sm font-black text-slate-400 uppercase tracking-widest text-left">提供商</th>
                <th className="px-4 py-2.5 text-sm font-black text-slate-400 uppercase tracking-widest">检测 IP</th>
                <th className="px-4 py-2.5 text-sm font-black text-slate-400 uppercase tracking-widest">地理位置</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-blue-50/40">
                <td colSpan={4} className="px-4 py-1.5 text-sm font-black text-blue-500 uppercase tracking-widest">国内服务器</td>
              </tr>
              {STUN_SERVERS.filter(s => s.category === '国内').map(server => (
                <StunRow key={server.url} server={server} result={results[server.url]} httpIp={httpIp} />
              ))}
              <tr className="bg-purple-50/40 border-t border-slate-100">
                <td colSpan={4} className="px-4 py-1.5 text-sm font-black text-purple-500 uppercase tracking-widest">国际服务器</td>
              </tr>
              {STUN_SERVERS.filter(s => s.category === '国际').map(server => (
                <StunRow key={server.url} server={server} result={results[server.url]} httpIp={httpIp} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* WebRTC 知识区 */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-md p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-blue-400" />
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">WebRTC 泄露原理与防护</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-500 leading-relaxed">
          <div className="space-y-2">
            <p>• <strong className="text-slate-700">STUN</strong> 用于 NAT 穿越，浏览器通过它获取公网 IP。</p>
            <p>• <strong className="text-slate-700">srflx</strong> 候选者暴露公网 IP，<strong className="text-slate-700">host</strong> 暴露局域网 IP。</p>
            <p>• 即使使用 VPN，WebRTC 的 UDP 流量可能绕过隧道，直接暴露真实出口 IP。</p>
          </div>
          <div className="space-y-2">
            <p>• <strong className="text-slate-700">Chrome</strong>：安装 WebRTC Leak Prevent 扩展。</p>
            <p>• <strong className="text-slate-700">Firefox</strong>：<code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-sm">media.peerconnection.enabled = false</code></p>
            <p>• <strong className="text-slate-700">代理客户端</strong>：开启「拦截 UDP / WebRTC 泄漏」选项。</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeakDetection;
