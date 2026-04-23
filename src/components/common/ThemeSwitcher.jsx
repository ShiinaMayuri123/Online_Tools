import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { THEMES } from '../../config/theme';

/**
 * ThemeSwitcher: 主题切换器组件
 * 可以在应用的导航栏等位置显示一个下拉菜单，供用户选择不同的主题颜色。
 */
const ThemeSwitcher = ({ align = 'right' }) => {
  const { themeKey, setThemeKey, theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false); // 控制下拉菜单是否展开
  const menuRef = useRef(null); // 用于引用整个组件对应的 DOM 节点，以处理点击外部关闭

  // 监听全局点击事件：如果点击区域不在本组件内，则关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => { 
        if (menuRef.current && !menuRef.current.contains(event.target)) {
            setIsOpen(false); 
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // 根据传入的 align 属性，决定下拉菜单是靠右对齐还是居中对齐
  const alignmentClasses = align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2 origin-top';

  return (
    <div className="relative" ref={menuRef}>
      {/* 触发按钮 */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white/50 backdrop-blur-sm hover:bg-white transition-all shadow-sm text-xs font-bold text-slate-600 group"
      >
         {/* 显示当前主题的圆点颜色 */}
         <div className={`w-3 h-3 rounded-full shadow-sm transition-colors duration-300 ${theme.primaryBg}`}></div>
         <span className="hidden sm:inline">主题</span>
         {/* 箭头图标，展开时会旋转 180 度 */}
         <ChevronDown size={12} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'group-hover:translate-y-0.5'}`} />
      </button>

      {/* 下拉菜单面板 */}
      {isOpen && (
        <div className={`absolute ${alignmentClasses} top-full mt-3 p-4 bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/50 w-64 z-[100] animate-in fade-in zoom-in-95 duration-200 ring-1 ring-slate-900/5`}>
           <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">选择配色</div>
           <div className="grid grid-cols-4 gap-3">
             {/* 遍历所有的主题，并生成对应的颜色圆形按钮 */}
             {Object.keys(THEMES).map((key) => (
               <button 
                 key={key} 
                 onClick={() => { setThemeKey(key); setIsOpen(false); }} 
                 className={`group relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${THEMES[key].primaryBg} ${themeKey === key ? 'ring-2 ring-offset-2 ring-slate-400 scale-110 shadow-md' : 'hover:scale-110 opacity-80 hover:opacity-100 hover:shadow-sm'}`} 
                 title={THEMES[key].name}
               >
                  {/* 如果是当前选中项，则在圆圈中显示一个白色的勾号 */}
                  {themeKey === key && <Check size={16} className="text-white" strokeWidth={3} />}
               </button>
             ))}
           </div>
           <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-center text-slate-500 font-medium">
               当前: {theme.name}
           </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;
