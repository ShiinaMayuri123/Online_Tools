import { ArrowLeft, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeSwitcher from './ThemeSwitcher';

/**
 * ToolLayout: 所有工具页面的公共布局组件
 * 提供统一的顶部导航栏（返回按钮 + 标题 + 主题切换）和内容区域。
 * @param {string} title - 工具标题
 * @param {React.ReactNode} icon - 标题旁的图标组件
 * @param {React.ReactNode} children - 工具的主体内容
 */
const ToolLayout = ({ title, icon, children }) => {
  const { theme, themeKey } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* 顶部导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 lg:px-12 bg-white/60 backdrop-blur-md border-b border-white/40">
        {/* 左侧：返回按钮 + 工具标题 */}
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">返回</span>
          </Link>
          <div className="h-5 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2.5">
            <div className={`text-white p-1.5 rounded-lg shadow-lg shadow-slate-900/20 transition-colors duration-500 ${themeKey === 'slate' ? 'bg-slate-700' : theme.primaryBg}`}>
              {icon || <Wrench size={14} strokeWidth={2.5} />}
            </div>
            <span className="font-bold text-base tracking-tight">{title}</span>
          </div>
        </div>
        {/* 右侧：主题切换 */}
        <ThemeSwitcher />
      </nav>

      {/* 主体内容区域 */}
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto relative z-10">
        {children}
      </main>

      {/* 页脚 */}
      <footer className="border-t border-slate-200/50 bg-white/40 backdrop-blur-xl relative z-20">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center">
          <p className="text-slate-400 text-xs font-medium">Made With ❤️</p>
        </div>
      </footer>
    </div>
  );
};

export default ToolLayout;
