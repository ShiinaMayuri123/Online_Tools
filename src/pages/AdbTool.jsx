/**
 * ADB 调试工具页面
 * 独立的 Android 设备调试工具，支持局域网连接和实时命令执行
 */
import ToolLayout from '../components/common/ToolLayout';
import AdbConsole from '../components/robot/AdbConsole';

const AdbTool = () => {
  return (
    <ToolLayout
      title="ADB 调试助手"
      description="局域网 Android 设备调试工具，支持 WiFi/USB 连接，实时命令执行"
      contentClassName="pt-20 sm:pt-24 pb-0 px-3 sm:px-6 w-full max-w-[80%] mx-auto relative z-10 flex-grow"
    >
      <div className="space-y-6">
        {/* ADB 控制台（包含快速开始和参考详细使用指南） */}
        <AdbConsole />

        {/* ADB 命令参考面板（默认展开） */}
      </div>
    </ToolLayout>
  );
};

export default AdbTool;
