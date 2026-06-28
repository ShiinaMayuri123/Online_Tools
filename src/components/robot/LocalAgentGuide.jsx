/**
 * 本地代理引导组件
 * 显示下载链接、配对指引和常见问题
 */
import { useState } from 'react';
import { Download, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const LocalAgentGuide = ({ onTokenSubmit }) => {
  const { theme } = useTheme();
  const [tokenInput, setTokenInput] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const SETUP_CMD = "irm https://raw.githubusercontent.com/ShiinaMayuri123/Online_Tools/main/local-agent/setup.ps1 | iex";

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(SETUP_CMD).then(() => {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 3000);
    });
  };

  const handlePair = () => {
    if (tokenInput.trim()) {
      onTokenSubmit(tokenInput.trim());
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 sm:p-6">
      {/* 标题 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
          <AlertCircle size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">未检测到本地代理</h3>
          <p className="text-xs text-slate-500">需要运行本地代理才能使用 ADB 功能</p>
        </div>
      </div>

      {/* 快速开始 */}
      <div className="space-y-3 mb-4">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">1</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">确保已安装 Node.js，然后在 PowerShell 中执行：</p>
            <div className="mt-2 relative">
              <div className="bg-slate-900 text-green-400 text-xs font-mono p-3 pr-12 rounded-lg break-all">
                {SETUP_CMD}
              </div>
              <button
                onClick={handleCopyCmd}
                className="absolute top-2 right-2 p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                title="Copy"
              >
                {copiedCmd ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
            </div>
            {copiedCmd && (
              <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <Check size={12} /> Copied! Paste in PowerShell and press Enter.
              </p>
            )}
            <div className="flex gap-2 mt-2">
              <a href="https://nodejs.org/" target="_blank" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <ExternalLink size={12} /> Install Node.js
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">2</span>
          <div>
            <p className="text-sm font-medium text-slate-700">复制程序显示的 Token</p>
            <p className="text-xs text-slate-500 mt-1">运行后会自动打开配对页面，或查看控制台输出</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">3</span>
          <div>
            <p className="text-sm font-medium text-slate-700">在下方粘贴 Token 并配对</p>
          </div>
        </div>
      </div>

      {/* Token 输入 */}
      <div className="bg-white rounded-lg p-3 border border-blue-100">
        <label className="block text-xs font-medium text-slate-600 mb-2">粘贴 Token 进行配对</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="输入本地代理显示的 Token"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm font-mono"
            onKeyDown={(e) => e.key === 'Enter' && handlePair()}
          />
          <button
            onClick={handlePair}
            disabled={!tokenInput.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-all ${
              tokenInput.trim()
                ? `${theme.primaryBg} ${theme.primaryHover}`
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            配对
          </button>
        </div>
      </div>

      {/* 展开详细指南 */}
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        {showGuide ? '收起' : '查看详细使用指南 →'}
      </button>

      {showGuide && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-blue-100 text-xs text-slate-600 space-y-2">
          <p className="font-bold text-slate-700">📱 如何连接设备：</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>确保手机和电脑在同一局域网</li>
            <li>手机开启 USB 调试（设置 → 开发者选项 → USB 调试）</li>
            <li>首次需要用 USB 线连接，执行 <code className="bg-slate-100 px-1 rounded">adb tcpip 5555</code></li>
            <li>拔掉 USB 线，在网页上输入手机 IP 地址</li>
          </ol>

          <p className="font-bold text-slate-700 mt-3">🔍 如何查看手机 IP：</p>
          <ul className="list-disc list-inside space-y-1">
            <li>设置 → 关于手机 → 状态 → IP 地址</li>
            <li>或设置 → WLAN → 点击已连接的网络</li>
          </ul>

          <p className="font-bold text-slate-700 mt-3">❓ 常见问题：</p>
          <ul className="list-disc list-inside space-y-1">
            <li>提示"未找到 adb"：下载 Platform Tools 并添加到 PATH</li>
            <li>端口被占用：程序会自动尝试其他端口</li>
            <li>防火墙弹窗：点击"允许访问"即可</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default LocalAgentGuide;
