import { useState, useEffect } from 'react';
import { ArrowLeft, Wrench, LogOut, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import ThemeSwitcher from './ThemeSwitcher';
import ParticleBackground from './ParticleBackground';

/**
 * ToolLayout: 所有工具页面的公共布局组件
 * 提供统一的顶部导航栏（返回按钮 + 标题 + 主题切换）和内容区域。
 * @param {string} title - 工具标题
 * @param {React.ReactNode} icon - 标题旁的图标组件
 * @param {React.ReactNode} children - 工具的主体内容
 * @param {React.ReactNode} navActions - 导航栏右侧额外的操作按钮（显示在主题切换之前）
 * @param {string} contentClassName - 自定义主体内容区域的 className
 */
const ToolLayout = ({ title, icon, children, navActions, contentClassName }) => {
  const { theme, themeKey } = useTheme();
  const { user, role, logout } = useAuth();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 30,
        y: (e.clientY / window.innerHeight - 0.5) * 30
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col relative overflow-x-hidden">
      {/* 背景层：渐变光球 + 粒子特效 */}
      <div className="fixed inset-0 z-0 overflow-hidden bg-white">
        <div className={`absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-[90px] opacity-60 animate-blob transition-colors duration-1000 ${theme.orb1}`} style={{ transform: `translate(${mousePos.x * -1}px, ${mousePos.y * -1}px)` }}></div>
        <div className={`absolute top-[10%] right-[-10%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-[90px] opacity-60 animate-blob animation-delay-2000 transition-colors duration-1000 ${theme.orb2}`} style={{ transform: `translate(${mousePos.x}px, ${mousePos.y * -1}px)` }}></div>
        <div className={`absolute -bottom-32 left-[20%] w-[700px] h-[700px] rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-4000 transition-colors duration-1000 ${theme.orb3}`} style={{ transform: `translate(${mousePos.x * -0.5}px, ${mousePos.y}px)` }}></div>
        <ParticleBackground />
      </div>

      {/* 顶部导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-12 bg-white/60 backdrop-blur-md border-b border-slate-200/60">
        {/* 左侧：返回按钮 + 工具标题 */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium hidden sm:inline">返回</span>
          </Link>
          <div className="h-5 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2.5">
            <div className={`text-white p-1.5 rounded-lg shadow-lg shadow-slate-900/20 transition-colors duration-500 ${themeKey === 'slate' ? 'bg-slate-700' : theme.primaryBg}`}>
              {icon || <Wrench size={14} strokeWidth={2.5} />}
            </div>
            <span className="font-bold text-sm sm:text-base tracking-tight">{title}</span>
          </div>
        </div>
        {/* 右侧：额外操作按钮 + 用户信息 + 主题切换 */}
        <div className="flex items-center gap-2 sm:gap-3">
          {navActions}
          {/* 已登录用户信息 */}
          {user && (
            <div className="flex items-center gap-2">
              {role === 'admin' && (
                <Link
                  to="/admin"
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-purple-600 transition-colors"
                  title="管理后台"
                >
                  <Shield size={16} />
                </Link>
              )}
              <span className="text-xs text-slate-500 hidden md:inline max-w-32 truncate">{user.email}</span>
              <button
                onClick={logout}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                title="退出登录"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
          <ThemeSwitcher />
        </div>
      </nav>

      {/* 主体内容区域 */}
      <main className={contentClassName || "pt-24 pb-20 px-4 sm:px-6 lg:px-10 xl:px-16 w-full max-w-[95%] lg:max-w-[90%] xl:max-w-7xl mx-auto relative z-10 flex-grow"}>
        {children}
      </main>
    </div>
  );
};

export default ToolLayout;
