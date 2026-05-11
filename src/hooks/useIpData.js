import { useState, useEffect, useCallback, useMemo } from 'react';

// ── 工具函数 ────────────────────────────────────────────────────────────────
const fetchWithTimeout = (url, timeout = 5000) => {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeout);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(id));
};

// ── 多源 IP 一致性校验 ──────────────────────────────────────────────────────
const CONSISTENCY_SOURCES = [
  { id: 'ipify', label: 'ipify.org', url: 'https://api.ipify.org?format=json', parse: d => d.ip },
  { id: 'ipapi', label: 'ip-api.com', url: 'http://ip-api.com/json/?fields=8192', parse: d => d.query },
  { id: 'ipwho', label: 'ipwho.is', url: 'https://ipwho.is/', parse: d => d.ip },
  { id: 'cf', label: 'Cloudflare', url: 'https://1.1.1.1/cdn-cgi/trace', parse: (_, text) => { const m = text.match(/ip=(.*)\n/); return m ? m[1].trim() : null; }, isText: true },
];

// ── 风险评分计算 ─────────────────────────────────────────────────────────────
const calcRiskScore = (ipApi, ipWho) => {
  const sec = ipWho?.security || {};
  const isTor = sec.tor ?? false;
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

  return {
    score,
    isTor,
    proxyA,
    proxyB,
    proxyBoth,
    proxyAny,
    isVpn,
    hostingA,
    hostingB,
    hostingAny,
    isAnonymous,
    isMobile,
    browserTz,
    ipTz,
    tzMismatch,
  };
};

// ── 客户端信息 ──────────────────────────────────────────────────────────────
const getClientInfo = () => {
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
};

// ── 主 Hook ─────────────────────────────────────────────────────────────────
const useIpData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ipApi, setIpApi] = useState(null);
  const [ipWho, setIpWho] = useState(null);
  const [mainData, setMainData] = useState(null);
  const [consistency, setConsistency] = useState({});

  const clientInfo = useMemo(() => getClientInfo(), []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIpApi(null);
    setIpWho(null);
    setMainData(null);
    setConsistency({});

    try {
      // 1. 获取本机 IP（ipify 为主，ip-api 为备用）
      let ip = '';
      try {
        const res = await fetchWithTimeout('https://api.ipify.org?format=json', 3000);
        const { ip: fetchedIp } = await res.json();
        ip = fetchedIp;
      } catch {
        try {
          const res = await fetchWithTimeout('http://ip-api.com/json/?fields=query', 3000);
          const { query } = await res.json();
          ip = query;
        } catch {
          throw new Error('无法获取本机 IP');
        }
      }

      // 2. 并发请求：ipinfo.io + ip-api.com + ipwho.is
      const [ipinfoRes, ipapiRes, ipwhoRes] = await Promise.allSettled([
        fetchWithTimeout('https://ipinfo.io/json', 4000).then(r => r.ok ? r.json() : null),
        fetchWithTimeout(`http://ip-api.com/json/${ip}?fields=66846719&lang=zh-CN`, 5000).then(r => r.json()),
        fetchWithTimeout(`https://ipwho.is/${ip}?security=1`, 5000).then(r => r.json()),
      ]);

      // 3. 处理 ipinfo.io 数据
      const ipinfo = ipinfoRes.status === 'fulfilled' ? ipinfoRes.value : null;
      const ipapi = ipapiRes.status === 'fulfilled' && ipapiRes.value?.status === 'success' ? ipapiRes.value : null;
      const ipwho = ipwhoRes.status === 'fulfilled' && ipwhoRes.value?.success ? ipwhoRes.value : null;

      if (ipapi) setIpApi(ipapi);
      if (ipwho) setIpWho(ipwho);

      // 4. 构建主数据（ipinfo 为主，ip-api 为备用）
      if (ipinfo) {
        setMainData(ipinfo);
      } else if (ipapi) {
        setMainData({
          ip: ipapi.query,
          city: ipapi.city,
          region: ipapi.regionName,
          country: ipapi.countryCode,
          loc: `${ipapi.lat},${ipapi.lon}`,
          org: ipapi.isp || ipapi.org || '',
          timezone: ipapi.timezone,
          postal: ipapi.zip,
          hostname: ipapi.reverse || '',
        });
      } else {
        throw new Error('无法获取 IP 详情');
      }

      // 5. 多源一致性校验
      const results = {};
      await Promise.all(
        CONSISTENCY_SOURCES.map(async src => {
          try {
            const res = await fetchWithTimeout(src.url, 5000);
            const val = src.isText ? src.parse(null, await res.text()) : src.parse(await res.json());
            results[src.id] = val || '失败';
          } catch {
            results[src.id] = '失败';
          }
        })
      );
      setConsistency(results);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { (async () => { await fetchAll(); })(); }, [fetchAll]);

  // ── 派生数据 ──────────────────────────────────────────────────────────────
  const ip = mainData?.ip || ipApi?.query || ipWho?.ip || '';
  const country = mainData?.country || ipApi?.countryCode || ipWho?.country_code || '';
  const city = mainData?.city || ipApi?.city || ipWho?.city || '';
  const region = mainData?.region || ipApi?.regionName || ipWho?.region || '';
  const org = mainData?.org || ipApi?.isp || ipWho?.connection?.isp || '';
  const asn = ipApi?.as || (ipWho?.connection?.asn ? `AS${ipWho.connection.asn}` : '');
  const hostname = mainData?.hostname || ipApi?.reverse || ipWho?.connection?.domain || '';
  const timezone = mainData?.timezone || ipApi?.timezone || ipWho?.timezone?.id || '';
  const postal = mainData?.postal || ipApi?.zip || ipWho?.postal || '';
  const loc = mainData?.loc || (ipApi?.lat ? `${ipApi.lat},${ipApi.lon}` : '') || '';
  const countryCode = country || '';
  const flagEmoji = countryCode ? String.fromCodePoint(...[...countryCode.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0))) : '';

  // 网络类型
  let networkType = '标准 ISP';
  if (ipApi?.hosting || ipWho?.security?.hosting) networkType = '数据中心';
  if (ipApi?.mobile || ipWho?.security?.mobile) networkType = '移动网络';

  // 隐私标签
  let privacyTag = '纯净 IP';
  if (ipApi?.proxy || ipWho?.security?.proxy) privacyTag = '代理/VPN';
  if (ipWho?.security?.tor) privacyTag = 'Tor 出口';

  // 风险评分
  const risk = calcRiskScore(ipApi, ipWho);

  // 一致性结果
  const consistencyIps = Object.values(consistency).filter(v => v && v !== '失败');
  const uniqueIps = [...new Set(consistencyIps)];
  const consistencyDone = Object.keys(consistency).length === CONSISTENCY_SOURCES.length;
  const isConsistent = consistencyDone && uniqueIps.length === 1 && consistencyIps.length === CONSISTENCY_SOURCES.length;
  const isPartial = consistencyDone && uniqueIps.length > 1;
  const hasFailure = consistencyDone && Object.values(consistency).some(v => v === '失败');

  // 地理位置文本
  const locationText = ipApi
    ? `${ipApi.country}, ${ipApi.regionName}, ${ipApi.city}`
    : `${city}, ${region}, ${countryCode}`;

  return {
    // 状态
    loading,
    error,
    refetch: fetchAll,

    // 基本信息
    ip,
    country,
    city,
    region,
    org,
    asn,
    hostname,
    timezone,
    postal,
    loc,
    countryCode,
    flagEmoji,
    locationText,
    networkType,
    privacyTag,

    // 风险评分
    risk,

    // 客户端信息
    clientInfo,

    // 多源一致性
    consistency,
    consistencyIps,
    uniqueIps,
    consistencyDone,
    isConsistent,
    isPartial,
    hasFailure,

    // 原始数据（供特殊用途）
    ipApi,
    ipWho,
    mainData,
  };
};

export default useIpData;
