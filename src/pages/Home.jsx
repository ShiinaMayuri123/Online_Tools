import { useState, useEffect } from 'react';
import { Wrench, Plus, MessageSquare, ArrowRight, FileCode } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { TOOLS } from '../config/theme';
import ThemeSwitcher from '../components/common/ThemeSwitcher';
import ParticleBackground from '../components/common/ParticleBackground';
import ContactModal from '../components/common/ContactModal';
import ToolCard from '../components/common/ToolCard';

/**
 * Home 页面：应用的首页
 * 包含顶部导航栏、巨大的标题、粒子背景以及工具列表卡片。
 */
const Home = () => {
  const [isContactOpen, setIsContactOpen] = useState(false); // 控制联系开发者弹窗
  const { theme, themeKey } = useTheme();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // 用于背景模糊光球的视差移动效果

  // 监听鼠标移动，为了让背景的光球根据鼠标位置产生微小的反向位移
  useEffect(() => { 
      const handleMouseMove = (e) => { 
          // 根据鼠标相对于屏幕中心的位置，计算一个微小的偏移量
          setMousePos({ 
              x: (e.clientX / window.innerWidth - 0.5) * 30, 
              y: (e.clientY / window.innerHeight - 0.5) * 30 
          }); 
      }; 
      window.addEventListener('mousemove', handleMouseMove); 
      return () => window.removeEventListener('mousemove', handleMouseMove); 
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-slate-200 selection:text-slate-900 relative overflow-x-hidden">
      
      {/* 1. 背景层：包含了纯白底色、三个巨大模糊光球和粒子特效 */}
      <div className="fixed inset-0 z-0 overflow-hidden bg-white">
         <div className={`absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-[90px] opacity-60 animate-blob transition-colors duration-1000 ${theme.orb1}`} style={{ transform: `translate(${mousePos.x * -1}px, ${mousePos.y * -1}px)` }}></div>
         <div className={`absolute top-[10%] right-[-10%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-[90px] opacity-60 animate-blob animation-delay-2000 transition-colors duration-1000 ${theme.orb2}`} style={{ transform: `translate(${mousePos.x}px, ${mousePos.y * -1}px)` }}></div>
         <div className={`absolute -bottom-32 left-[20%] w-[700px] h-[700px] rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob animation-delay-4000 transition-colors duration-1000 ${theme.orb3}`} style={{ transform: `translate(${mousePos.x * -0.5}px, ${mousePos.y}px)` }}></div>
         {/* 自定义的 Canvas 粒子特效 */}
         <ParticleBackground />
      </div>
      
      {/* 2. 顶部导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 lg:px-12 bg-white/60 backdrop-blur-md border-b border-white/40 transition-all">
         <div className="flex items-center gap-3 font-bold text-lg tracking-tight text-slate-900 cursor-default select-none">
            <div className={`text-white p-1.5 rounded-lg shadow-lg shadow-slate-900/20 transition-colors duration-500 ${themeKey === 'slate' ? 'bg-slate-700' : theme.primaryBg}`}>
                <Wrench size={16} strokeWidth={2.5} />
            </div>
            <span>我的在线工具箱</span>
         </div>
         <div className="flex items-center gap-4">
             {/* 宽屏时显示主题切换 */}
             <div className="hidden sm:block"><ThemeSwitcher /></div>
             <div className="relative">
                <button className="group flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 hover:text-slate-900 bg-white/40 hover:bg-white border border-white/50 hover:border-slate-300 rounded-full transition-all shadow-sm backdrop-blur-sm cursor-not-allowed opacity-70" title="离线版已内置源码">
                  <FileCode size={14} className={`transition-colors duration-300 ${theme.textAccent}`} />
                  <span>离线版</span>
                </button>
             </div>
         </div>
      </nav>
      
      {/* 3. 头部区域：介绍和标题 */}
      <header className="relative pt-36 pb-24 lg:pt-52 lg:pb-36 overflow-hidden z-10">
        <div className="max-w-5xl mx-auto px-4 text-center">
          {/* 小标识标签 */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/40 border border-white/60 backdrop-blur-md text-slate-600 text-xs font-semibold mb-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 hover:bg-white/80 hover:scale-105 transition-all cursor-default group">
             <span className="relative flex h-2 w-2">
                 <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${themeKey === 'slate' ? 'bg-slate-400' : theme.primaryBg}`}></span>
                 <span className={`relative inline-flex rounded-full h-2 w-2 ${themeKey === 'slate' ? 'bg-slate-500' : theme.primaryBg}`}></span>
             </span>
             <span className="group-hover:text-slate-900 transition-colors">基于 Vite 重构的现代化版本</span>
          </div>
          
          {/* 大标题 */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-slate-900 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 drop-shadow-sm leading-tight">
            我的在线<br className="sm:hidden" />
            <span className={`relative whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-r ${theme.gradientTitle} animate-gradient-x`}>
               <span className="ml-2">工具箱</span>
               <span className={`absolute -bottom-2 left-0 right-0 h-[6px] rounded-full blur-sm opacity-30 ${theme.primaryBg}`}></span>
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 font-medium">
              为您精心打造的实用工具集合。<br className="hidden sm:block" />简单、高效、保护隐私，只为更好的工作效率。
          </p>
          
          {/* 窄屏时显示的主题切换 */}
          <div className="sm:hidden mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <div className="flex justify-center"><ThemeSwitcher align="center" /></div>
          </div>
        </div>
      </header>
      
      {/* 4. 主体内容：工具列表 */}
      <main className="max-w-6xl mx-auto px-6 pb-40 relative z-10 animate-in fade-in duration-1000 delay-300">
        <div className="flex items-center gap-4 mb-10">
            <h2 className="text-sm font-bold text-slate-900 tracking-wider uppercase border-b-2 border-slate-900 pb-1">全部工具</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-slate-300 to-transparent"></div>
        </div>
        
        {/* CSS Grid 网格布局显示卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOOLS.map(tool => (<ToolCard key={tool.id} tool={tool} />))}
          
          {/* “敬请期待” 占位卡片 */}
          <div className={`relative bg-white/60 backdrop-blur-md rounded-3xl border border-dashed border-slate-200 p-6 flex flex-col items-center justify-center text-center group min-h-[260px] hover:bg-white/80 transition-colors`}>
             <div className={`p-4 bg-white/50 rounded-full mb-4 shadow-sm text-slate-300 group-hover:scale-110 transition-all duration-300 ${themeKey === 'slate' ? 'group-hover:text-slate-500' : `group-hover:${theme.textAccent}`}`}>
                 <Plus size={24} />
             </div>
             <h3 className="text-base font-bold text-slate-400 mb-1 group-hover:text-slate-600 transition-colors">更多工具开发中</h3>
             <p className="text-xs text-slate-400 max-w-[150px] mx-auto leading-relaxed">我们正在努力开发更多实用的工具，敬请期待。</p>
          </div>
        </div>
      </main>
      
      {/* 5. 页脚 */}
      <footer className="border-t border-slate-200/50 bg-white/40 backdrop-blur-xl relative z-20">
        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2.5 font-bold text-slate-900 mb-3">
                  <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
                      <Wrench size={12} strokeWidth={3} />
                  </div>
                  <span className="text-lg tracking-tight">我的在线工具箱</span>
              </div>
              <p className="text-slate-500 text-xs font-medium tracking-wide opacity-80">&copy; {new Date().getFullYear()} ONLINE TOOLBOX. Designed & Built for privacy.</p>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-3">
               <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                   <MessageSquare size={14} className={theme.textAccent} />
                   <span>有建议或发现 Bug？</span>
               </div>
               <button 
                  onClick={() => setIsContactOpen(true)} 
                  className={`group flex items-center gap-3 pl-5 pr-2 py-1.5 text-white rounded-full hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 ${themeKey === 'slate' ? 'bg-slate-700 hover:bg-slate-800' : `${theme.primaryBg} ${theme.primaryHover}`}`}
               >
                   <span className="font-bold text-xs tracking-wide py-1.5">联系开发者</span>
                   <div className="p-1.5 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors">
                       <ArrowRight size={14} />
                   </div>
               </button>
            </div>
          </div>
        </div>
      </footer>
      
      {/* 全局模态框 */}
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
};

export default Home;
