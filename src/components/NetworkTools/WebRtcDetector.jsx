import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, Monitor, RefreshCw, Loader2, Globe, ExternalLink, Info, AlertCircle, CheckCircle } from 'lucide-react';

const STUN_SERVERS = [
  // ── 国内（6个）
  { url: 'stun:stun.miwifi.com',             name: '小米路由器', category: '国内' },
  { url: 'stun:39.107.142.158',              name: 'Bilibili',   category: '国内' },
  { url: 'stun:stun.qq.com',                name: 'Tencent QQ', category: '国内' },
  { url: 'stun:stun.douyucdn.cn',            name: '斗鱼直播',   category: '国内' },
  { url: 'stun:stun.hitv.com',              name: '芒果 TV',    category: '国内' },
  { url: 'stun:stun.chat.bilibili.com:3478', name: 'Bilibili 备', category: '国内' },
  // ── 国际（14个）
  { url: 'stun:stun.l.google.com:19302',          name: 'Google',      category: '国际' },
  { url: 'stun:stun1.l.google.com:19302',         name: 'Google',      category: '国际' },
  { url: 'stun:stun2.l.google.com:19302',         name: 'Google',      category: '国际' },
  { url: 'stun:stun3.l.google.com:19302',         name: 'Google',      category: '国际' },
  { url: 'stun:global.stun.twilio.com:3478',       name: 'Twilio',      category: '国际' },
  { url: 'stun:stun.cloudflare.com:3478',          name: 'Cloudflare',  category: '国际' },
  { url: 'stun:stun.nextcloud.com:3478',           name: 'Nextcloud',   category: '国际' },
  { url: 'stun:stun.ekiga.net',                    name: 'Ekiga',       category: '国际' },
  { url: 'stun:stun.stunprotocol.org:3478',        name: 'StunProtocol',category: '国际' },
  { url: 'stun:stun.voip.blackberry.com:3478',     name: 'BlackBerry',  category: '国际' },
  { url: 'stun:stun.sipnet.ru:3478',               name: 'SIPnet',      category: '国际' },
  { url: 'stun:stun.services.mozilla.com',         name: 'Mozilla',     category: '国际' },
  { url: 'stun:stun.zoho.com:3478',                name: 'Zoho',        category: '国际' },
  { url: 'stun:stun.hot-chilli.net:3478',          name: 'Hot Chilli',  category: '国际' },
];

const WebRtcDetector = ({ theme }) => {
  const [results, setResults] = useState({});
  const [hostIps, setHostIps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [httpIp, setHttpIp] = useState(null);

  // 获取 HTTP 出口 IP（用于和 WebRTC 比对）
  const fetchHttpIp = useCallback(async () => {
    try {
      const r = await fetch('https://api.ipify.org?format=json');
      const d = await r.json();
      setHttpIp(d.ip);
    } catch { setHttpIp('获取失败'); }
  }, []);

  const testStun = (server) => {
    return new Promise((resolve) => {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: server.url }] });
      let resolved = false;

      const finish = async (status, ip = null, error = null) => {
        if (resolved) return;
        resolved = true;
        pc.close();
        if (status === 'success' && ip) {
          try {
            const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,isp&lang=zh-CN`);
            const d = await r.json();
            resolve({ status: 'success', ip, location: d.status === 'success' ? `${d.country} ${d.city} (${d.isp})` : '未知归属地' });
          } catch {
            resolve({ status: 'success', ip, location: '查询归属地失败' });
          }
        } else {
          resolve({ status: 'error', error: error || 'STUN 连接失败' });
        }
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

  const detectAll = useCallback(async () => {
    setLoading(true);
    setResults({});
    setHostIps([]);
    await Promise.all([
      fetchHttpIp(),
      ...STUN_SERVERS.map(async s => {
        const r = await testStun(s);
        setResults(prev => ({ ...prev, [s.url]: r }));
      }),
    ]);
    setLoading(false);
  }, [fetchHttpIp]);

  useEffect(() => { detectAll(); }, [detectAll]);

  const successResults = Object.values(results).filter(r => r.status === 'success');
  const srflxIps = [...new Set(successResults.map(r => r.ip))];
  const hasPublicLeak = srflxIps.some(ip => !ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('172.'));

  // HTTP vs WebRTC 对比
  const webrtcPublicIps = srflxIps.filter(ip => !ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('172.'));
  const isRealLeak = httpIp && webrtcPublicIps.length > 0 && !webrtcPublicIps.includes(httpIp);

  return (
    <div className="space-y-5">
      <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${hasPublicLeak ? 'bg-amber-500' : 'bg-emerald-500'} text-white`}>
              {hasPublicLeak ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
            </div>
            <span className="text-sm font-bold text-slate-700">WebRTC (UDP) IP 查询</span>
            <span className="text-[10px] font-bold text-slate-400 ml-1">20 个 STUN 服务器</span>
          </div>
          <button onClick={detectAll} disabled={loading} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${loading ? 'bg-slate-50 text-slate-400' : `${theme.primaryBg} text-white shadow-sm hover:shadow-md`}`}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {loading ? '检测中...' : '重新检测'}
          </button>
        </div>

        <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
          <p className="text-xs text-slate-500">WebRTC 默认使用 UDP 协议，通过 STUN 服务器可检测浏览器发送 UDP 流量时所用的真实 IP，即使在使用 VPN 时也可能泄露。</p>
        </div>

        {/* ── HTTP vs WebRTC 真实 IP 泄露对比卡片 ── */}
        {!loading && Object.keys(results).length > 0 && (
          <div className={`px-6 py-4 border-b ${isRealLeak ? 'bg-red-50 border-red-100' : hasPublicLeak ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <div className="flex items-start gap-3">
              {isRealLeak ? <ShieldAlert size={20} className="text-red-600 shrink-0 mt-0.5" /> :
               hasPublicLeak ? <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" /> :
               <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className={`text-sm font-bold mb-2 ${isRealLeak ? 'text-red-700' : hasPublicLeak ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {isRealLeak
                    ? '🚨 确认泄露：WebRTC 暴露了与 HTTP 出口不同的真实 IP'
                    : hasPublicLeak
                    ? '⚠️ WebRTC 检测到公网 IP（与 HTTP 出口一致，未额外泄露）'
                    : '✅ WebRTC 未泄露公网 IP（所有 STUN 请求均无 srflx 候选）'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white/70 rounded-xl p-3 border border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">HTTP 出口 IP（你的代理/直连 IP）</p>
                    <p className="text-sm font-mono font-black text-slate-700">{httpIp || '获取中...'}</p>
                  </div>
                  <div className={`rounded-xl p-3 border ${isRealLeak ? 'bg-red-100/60 border-red-200' : 'bg-white/70 border-slate-200'}`}>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">WebRTC 检测到的公网 IP</p>
                    <p className={`text-sm font-mono font-black ${isRealLeak ? 'text-red-600' : 'text-slate-700'}`}>
                      {webrtcPublicIps.length > 0 ? webrtcPublicIps.join(', ') : '无'}
                    </p>
                  </div>
                </div>
                {isRealLeak && (
                  <p className="text-xs text-red-600 mt-2">你的代理未拦截 WebRTC UDP 流量，攻击者可通过 WebRTC 获取你未经代理的真实 IP 地址。建议在代理客户端中开启"拦截 WebRTC 泄漏"选项。</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 本地候选者 */}
        {hostIps.length > 0 && (
          <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/30">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">本地网卡 IP（Host Candidate）</p>
            <div className="flex flex-wrap gap-2">
              {hostIps.map(ip => (
                <span key={ip} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-600">{ip}</span>
              ))}
            </div>
          </div>
        )}

        {/* STUN 测试结果表 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">STUN 服务器</th>
                <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">提供商</th>
                <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">检测 IP</th>
                <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">地理位置</th>
              </tr>
            </thead>
            <tbody>
              {/* 国内组 */}
              <tr className="bg-blue-50/40">
                <td colSpan={4} className="px-5 py-1.5 text-[9px] font-black text-blue-500 uppercase tracking-widest">国内服务器</td>
              </tr>
              {STUN_SERVERS.filter(s => s.category === '国内').map(server => <StunRow key={server.url} server={server} result={results[server.url]} httpIp={httpIp} />)}
              {/* 国际组 */}
              <tr className="bg-purple-50/40 border-t border-slate-100">
                <td colSpan={4} className="px-5 py-1.5 text-[9px] font-black text-purple-500 uppercase tracking-widest">国际服务器</td>
              </tr>
              {STUN_SERVERS.filter(s => s.category === '国际').map(server => <StunRow key={server.url} server={server} result={results[server.url]} httpIp={httpIp} />)}
            </tbody>
          </table>
        </div>

        {/* WebRTC 知识区 */}
        <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Monitor size={160} /></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Info size={18} className="text-blue-400" />
              <h3 className="text-base font-black">WebRTC 泄露原理与防护</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed">
              <div className="space-y-2">
                <p>• <strong>STUN</strong> 用于 NAT 穿越，浏览器通过它获取公网 IP。</p>
                <p>• <strong>srflx</strong> 候选者暴露公网 IP，<strong>host</strong> 暴露局域网 IP。</p>
                <p>• 即使使用 VPN，WebRTC 的 UDP 流量可能绕过隧道，直接暴露真实出口 IP。</p>
              </div>
              <div className="space-y-2">
                <p>• <strong>Chrome</strong>：安装 <em>WebRTC Leak Prevent</em> 扩展，或在设置中限制 WebRTC。</p>
                <p>• <strong>Firefox</strong>：<code className="bg-slate-700 px-1 rounded">about:config</code> → <code className="bg-slate-700 px-1 rounded">media.peerconnection.enabled = false</code></p>
                <p>• <strong>代理客户端</strong>：开启「拦截 UDP / WebRTC 泄漏」选项（如 Clash、Surge 等）。</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 数据来源 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">数据来源</p>
            <div className="flex gap-3">
              <span className="text-xs font-bold text-slate-500">ip-api.com <span className="text-slate-300">(IP 地理反查)</span></span>
              <span className="text-xs font-bold text-slate-500">api.ipify.org <span className="text-slate-300">(HTTP IP)</span></span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">权威验证</p>
            <div className="flex gap-3">
              {[{ name: 'BrowserLeaks/WebRTC', url: 'https://browserleaks.com/webrtc' }, { name: 'IPLeak.net', url: 'https://ipleak.net' }].map(l => (
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

const StunRow = ({ server, result, httpIp }) => {
  const isLoading = !result;
  const isError = result?.status === 'error';
  const isSuccess = result?.status === 'success';
  // 高亮：WebRTC IP 与 HTTP IP 不同则标红
  const isLeak = isSuccess && httpIp && result.ip !== httpIp &&
    !result.ip.startsWith('10.') && !result.ip.startsWith('192.168.') && !result.ip.startsWith('172.');

  return (
    <tr className={`group hover:bg-slate-50/80 transition-colors border-b border-slate-50 ${isLeak ? 'bg-red-50/30' : ''}`}>
      <td className="px-5 py-3.5">
        <span className="text-xs font-mono text-slate-500">{server.url.replace('stun:', '')}</span>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-center gap-1.5">
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${server.category === '国内' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>{server.category}</span>
          <span className="text-xs text-slate-500">{server.name}</span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        {isLoading ? <div className="h-4 w-28 bg-slate-100 animate-pulse rounded" /> :
         isError ? <span className="text-xs font-mono text-red-300">{result.error}</span> : (
           <div className="flex items-center gap-2">
             <Globe size={11} className={server.category === '国内' ? 'text-blue-400' : 'text-purple-400'} />
             <span className={`text-sm font-mono font-bold ${isLeak ? 'text-red-600' : 'text-slate-700'}`}>{result.ip}</span>
             {isLeak && <span className="text-[8px] font-black text-red-500 bg-red-100 px-1 py-0.5 rounded">泄露</span>}
           </div>
         )}
      </td>
      <td className="px-5 py-3.5">
        {isLoading ? <div className="h-4 w-36 bg-slate-100 animate-pulse rounded" /> :
         isError ? <span className="text-xs text-slate-300">—</span> :
         <span className="text-xs font-medium text-slate-600">{result.location}</span>}
      </td>
    </tr>
  );
};

export default WebRtcDetector;
