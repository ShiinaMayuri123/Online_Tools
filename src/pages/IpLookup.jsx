import React, { useState } from 'react';
import { Globe, Shield } from 'lucide-react';
import ToolLayout from '../components/common/ToolLayout';
import useIpData from '../hooks/useIpData';
import {
  ConclusionBanner, IpDetailCard,
  ConsistencyCheck, DataSources, IpLoadingState, IpErrorState,
} from '../components/NetworkTools/IpOverview';
import LeakDetection from '../components/NetworkTools/LeakDetection';

const TABS = [
  { id: 'overview', label: 'IP 概览', icon: Globe },
  { id: 'leak', label: '泄露检测', icon: Shield },
];

const IpLookup = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const ipData = useIpData();
  const { loading, error, refetch, risk } = ipData;

  const contentClass = "pt-20 sm:pt-24 pb-16 px-[5%] w-full max-w-[90vw] mx-auto relative z-10 flex-grow";

  if (loading) {
    return (
      <ToolLayout title="网络环境探测" icon={<Globe size={14} strokeWidth={2.5} />} contentClassName={contentClass}>
        <IpLoadingState />
      </ToolLayout>
    );
  }

  if (error) {
    return (
      <ToolLayout title="网络环境探测" icon={<Globe size={14} strokeWidth={2.5} />} contentClassName={contentClass}>
        <IpErrorState error={error} refetch={refetch} />
      </ToolLayout>
    );
  }

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
    <ToolLayout
      title="网络环境探测"
      icon={<Globe size={14} strokeWidth={2.5} />}
      contentClassName={contentClass}
    >
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* 结论横幅 */}
        <ConclusionBanner risk={risk} />

        {/* Tab 导航 */}
        <div className="flex gap-1 p-1 bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-md">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 内容 */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <IpDetailCard ipData={ipData} scoreColor={scoreColor} scoreBarColor={scoreBarColor} score={score} advice={advice} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ConsistencyCheck {...ipData} />
              <DataSources refetch={refetch} />
            </div>
          </div>
        )}

        {activeTab === 'leak' && (
          <LeakDetection ipData={ipData} />
        )}
      </div>
    </ToolLayout>
  );
};

export default IpLookup;
