/**
 * ADB 调试工具页面
 * 独立的 Android 设备调试工具，支持局域网连接和实时命令执行
 */
import { useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import ToolLayout from '../components/common/ToolLayout';
import AdbConsole from '../components/robot/AdbConsole';
import AdbReferencePanel from '../components/robot/AdbReferencePanel';

const AdbTool = () => {
  const [showReference, setShowReference] = useState(false);

  return (
    <ToolLayout
      title="ADB 调试助手"
      description="局域网 Android 设备调试工具，支持 WiFi/USB 连接，实时命令执行"
    >
      <div className="space-y-6">
        {/* ADB 控制台（包含快速开始和参考详细使用指南） */}
        <AdbConsole />

        {/* ADB 命令参考面板 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200 shadow-md overflow-hidden">
          <button
            onClick={() => setShowReference(!showReference)}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <BookOpen size={18} />
              </div>
              <span className="text-base sm:text-lg font-bold text-slate-800">ADB 命令参考</span>
            </div>
            <ChevronDown
              size={20}
              className={`text-slate-400 transition-transform duration-200 ${showReference ? 'rotate-180' : ''}`}
            />
          </button>

          {showReference && (
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 animate-in fade-in duration-200">
              <AdbReferencePanel />
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
};

export default AdbTool;
