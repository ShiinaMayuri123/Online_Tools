import { ArrowRight, Sparkles } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * ToolCard: 首页展示单个工具的卡片组件
 * @param {Object} tool - 包含工具信息的对象，如 title, path, description, icon 等
 */
const ToolCard = ({ tool }) => {
  const { theme, themeKey } = useTheme();

  // 所有工具都在新标签页打开：内部工具用 Hash 路径，外部工具用原始 URL
  const href = tool.isExternal ? tool.path : `/#${tool.path}`;

  return (
    // 所有工具都在新标签页打开
    <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`group relative bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-500 overflow-hidden ring-1 ring-slate-900/5 ${
            // 根据不同主题应用不同的悬浮阴影颜色
            themeKey === 'blue' ? 'hover:shadow-[0_20px_40px_-12px_rgba(59,130,246,0.2)]' : 
            themeKey === 'emerald' ? 'hover:shadow-[0_20px_40px_-12px_rgba(16,185,129,0.2)]' : 
            themeKey === 'violet' ? 'hover:shadow-[0_20px_40px_-12px_rgba(139,92,246,0.2)]' : 
            themeKey === 'amber' ? 'hover:shadow-[0_20px_40px_-12px_rgba(249,115,22,0.2)]' : 
            'hover:shadow-[0_20px_40px_-12px_rgba(100,116,139,0.2)]'
        }`}
    >
       {/* 背景光效：默认隐藏，鼠标悬浮 (group-hover) 时显示 */}
       <div className={`absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
           themeKey === 'blue' ? 'from-blue-100/40' : 
           themeKey === 'emerald' ? 'from-emerald-100/40' : 
           themeKey === 'violet' ? 'from-violet-100/40' : 
           themeKey === 'amber' ? 'from-orange-100/40' : 
           'from-slate-200/40'
       }`}></div>
       
       <div className="relative z-10 flex flex-col h-full">
          {/* 顶部图标与标签区 */}
          <div className="flex justify-between items-start mb-6">
            <div className={`p-3.5 bg-white rounded-2xl text-slate-600 group-hover:text-white transition-all duration-300 shadow-sm border border-slate-100 ${
                themeKey==='slate' ? 'group-hover:bg-slate-700' : theme.primaryHover.replace('hover:', 'group-hover:')
            }`}>
              {/* 动态渲染该工具的图标组件 */}
              <tool.icon size={24} />
            </div>
            
            {/* 标签显示区：NEW 或 Popular */}
            <div className="flex gap-2">
              {tool.isNew && (
                  <div className={`backdrop-blur border px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 bg-rose-50 text-rose-600 border-rose-200`}>
                      NEW
                  </div>
              )}
              {tool.isPopular && (
                  <div className={`backdrop-blur border px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${theme.bgLight} ${theme.textAccent} ${theme.borderAccent}`}>
                      <Sparkles size={10} /> Popular
                  </div>
              )}
            </div>
          </div>
          
          {/* 文本内容区 */}
          <h3 className={`text-xl font-bold text-slate-900 mb-3 transition-colors ${
              themeKey === 'slate' ? 'group-hover:text-slate-700' : `group-hover:${theme.textAccent}`
          }`}>
              {tool.title}
          </h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-1">
              {tool.description}
          </p>
          
          {/* 底部交互指引：默认隐藏并向左偏移，悬浮时滑入 */}
          <div className={`flex items-center text-sm font-bold opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ${theme.textAccent}`}>
              开始使用 <ArrowRight size={16} className="ml-1" />
          </div>
       </div>
    </a>
  );
};

export default ToolCard;
