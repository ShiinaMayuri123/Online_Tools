import React, { useState } from 'react';
import { Globe, Shield, AlertTriangle, Activity, Monitor } from 'lucide-react';
import ToolLayout from '../components/common/ToolLayout';
import { useTheme } from '../contexts/ThemeContext';

import IpInfoCard from '../components/NetworkTools/IpInfoCard';
import SplitTunnelTest from '../components/NetworkTools/SplitTunnelTest';
import WebRtcDetector from '../components/NetworkTools/WebRtcDetector';
import IpRiskDetector from '../components/NetworkTools/IpRiskDetector';

const TABS = [
  { id: 'info', label: 'IP 洞察', icon: Shield, color: 'indigo' },
  { id: 'risk', label: '风险评估', icon: AlertTriangle, color: 'rose' },
  { id: 'split', label: '分流测试', icon: Activity, color: 'blue' },
  { id: 'webrtc', label: 'WebRTC 检测', icon: Monitor, color: 'amber' },
];

const IpLookup = () => {
  const { theme, themeKey } = useTheme();
  const [activeTab, setActiveTab] = useState('info');

  const renderContent = () => {
    switch (activeTab) {
      case 'info': return <IpInfoCard theme={theme} />;
      case 'risk': return <IpRiskDetector theme={theme} />;
      case 'split': return <SplitTunnelTest theme={theme} />;
      case 'webrtc': return <WebRtcDetector theme={theme} />;
      default: return null;
    }
  };

  return (
    <ToolLayout
      title="网络环境深度探测"
      icon={<Globe size={14} strokeWidth={2.5} />}
      description="多维度检测出口 IP、分流规则及 WebRTC 隐私泄漏。"
    >
      <div className="max-w-[98%] xl:max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Tab 导航条 */}
        <div className="flex items-center gap-1 p-1.5 bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap flex-1 justify-center ${
                  isActive
                    ? `${theme.primaryBg} text-white shadow-lg`
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 内容区域 */}
        <div className="min-h-[calc(100vh-220px)] pb-12">
          {renderContent()}
        </div>
      </div>
    </ToolLayout>
  );
};

export default IpLookup;
