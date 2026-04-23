import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, HardDrive, Check, Copy, RefreshCw } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import ThemeSwitcher from '../components/common/ThemeSwitcher';

/**
 * PasswordGenTool: 密码生成器页面
 * 提供本地离线生成强密码的功能，保证安全。
 */
const PasswordGenTool = () => {
  const navigate = useNavigate(); // 用于页面跳转
  const { theme, themeKey } = useTheme();
  
  // 状态管理
  const [length, setLength] = useState(16); // 密码长度，默认 16 位
  // 密码包含的字符集选项
  const [options, setOptions] = useState({ upper: true, lower: true, numbers: true, symbols: true });
  const [password, setPassword] = useState(''); // 当前生成的密码
  const [copied, setCopied] = useState(false); // 是否已复制的提示状态
  const [history, setHistory] = useState([]); // 历史生成的密码列表，最多保存 5 个

  // 核心功能：生成密码
  const generate = useCallback(() => {
    // 定义各种字符集
    const charset = { 
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 
        lower: 'abcdefghijklmnopqrstuvwxyz', 
        numbers: '0123456789', 
        symbols: '!@#$%^&*()_+~`|}{[]:;?><,./-=' 
    };
    let chars = '';
    let result = '';
    
    // 找出当前用户勾选了哪些选项
    const types = Object.keys(options).filter(k => options[k]);
    // 如果什么都没勾选，清空密码
    if (types.length === 0) return setPassword('');
    
    // 确保勾选的每种类型至少包含一个字符，增加安全性
    types.forEach(type => { 
        result += charset[type][Math.floor(Math.random() * charset[type].length)]; 
        chars += charset[type]; 
    });
    
    // 填充剩余的长度
    for (let i = result.length; i < length; i++) { 
        result += chars.charAt(Math.floor(Math.random() * chars.length)); 
    }
    
    // 将生成的字符串打乱顺序（洗牌算法）
    result = result.split('').sort(() => 0.5 - Math.random()).join('');
    
    // 更新状态
    setPassword(result);
    // 将新密码加入历史记录，并保留最近 5 条
    setHistory(prev => [result, ...prev].slice(0, 5));
    setCopied(false); // 重置复制状态
  }, [length, options]);

  // 组件挂载时或依赖项（长度、选项）改变时自动生成新密码
  useEffect(() => { generate(); }, [generate]);

  // 复制到剪贴板功能
  const copyToClipboard = () => { 
      navigator.clipboard.writeText(password); 
      setCopied(true); 
      // 2 秒后恢复原状
      setTimeout(() => setCopied(false), 2000); 
  };
  
  // 根据密码长度和包含的字符种类，计算并返回密码强度的颜色条类名
  const strengthColor = () => { 
      if (length < 8) return 'bg-red-500'; 
      if (length < 12) return 'bg-orange-500'; 
      const typesCount = Object.values(options).filter(Boolean).length; 
      if (typesCount < 3) return 'bg-yellow-500'; 
      return 'bg-green-500'; 
  };
  
  // 内部小组件：开关拨动按钮
  const Toggle = ({ label, checked, onChange }) => (
    <div onClick={() => onChange(!checked)} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-all group select-none">
      <span className="font-bold text-slate-700">{label}</span>
      {/* 轨道 */}
      <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center ${checked ? theme.primaryBg : 'bg-slate-200'}`}>
        {/* 滑块 */}
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`}></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {/* 顶部导航栏 */}
      <nav className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-4">
            {/* 返回首页按钮 */}
            <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                <Home size={20} />
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <h1 className="font-bold text-slate-700 flex items-center gap-2">
                <div className={`p-1 rounded-lg ${themeKey === 'slate' ? 'bg-slate-700 text-white' : `${theme.primaryBg} text-white`}`}>
                    <HardDrive size={16} />
                </div>
                <span className="hidden sm:inline">安全密码生成器</span>
            </h1>
        </div>
        <div className="flex items-center gap-3"><ThemeSwitcher /></div>
      </nav>
      
      {/* 主体内容 */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-6 lg:p-12 flex flex-col lg:flex-row gap-8">
        
        {/* 左侧：设置面板 */}
        <div className="flex-1 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* 滑动条：设置密码长度 */}
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">密码长度</h2>
                <span className={`text-xl font-black ${theme.textAccent}`}>{length}</span>
            </div>
            <input 
                type="range" min="6" max="64" 
                value={length} 
                onChange={(e) => setLength(parseInt(e.target.value))} 
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600 mb-2" 
            />
            <div className="flex justify-between text-xs font-bold text-slate-400"><span>6</span><span>64</span></div>
          </div>
          
          {/* 字符集选项开关 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Toggle label="ABC 大写字母" checked={options.upper} onChange={v => setOptions({ ...options, upper: v })} />
            <Toggle label="abc 小写字母" checked={options.lower} onChange={v => setOptions({ ...options, lower: v })} />
            <Toggle label="123 数字" checked={options.numbers} onChange={v => setOptions({ ...options, numbers: v })} />
            <Toggle label="#$& 特殊符号" checked={options.symbols} onChange={v => setOptions({ ...options, symbols: v })} />
          </div>
        </div>
        
        {/* 右侧：结果展示面板 */}
        <div className="flex-1 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500 delay-100">
          
          {/* 密码显示区域 */}
          <div className={`relative overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8 flex flex-col items-center justify-center min-h-[300px] text-center transition-all ${copied ? 'ring-2 ring-green-500 border-transparent' : ''}`}>
            
            {/* 顶部指示条，根据强度变换颜色 */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${strengthColor()}`}></div>
            
            <div className="mb-6 font-mono text-3xl sm:text-4xl lg:text-5xl font-bold break-all text-slate-800 leading-tight">
                {password}
            </div>
            
            {/* 操作按钮组 */}
            <div className="flex gap-4 w-full max-w-xs">
               <button 
                  onClick={generate} 
                  className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
               >
                   <RefreshCw size={18} /> 刷新
               </button>
               <button 
                  onClick={copyToClipboard} 
                  className={`flex-[2] py-3 rounded-xl font-bold text-white shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 ${theme.primaryBg} ${theme.primaryHover} active:scale-95`}
               >
                   {copied ? <Check size={18} /> : <Copy size={18} />}
                   {copied ? '已复制' : '复制密码'}
               </button>
            </div>
          </div>
          
          {/* 历史记录列表 */}
          {history.length > 0 && (
             <div className="bg-white/50 rounded-2xl p-4 border border-slate-200/60">
               <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">最近生成的密码</div>
               <div className="space-y-2">
                 {history.map((pw, i) => (
                   <div 
                      key={i} 
                      onClick={() => { navigator.clipboard.writeText(pw); }} 
                      className="flex justify-between items-center p-2 rounded-lg hover:bg-white hover:shadow-sm cursor-pointer transition-all group font-mono text-sm text-slate-500"
                   >
                       <span className="truncate mr-4">{pw}</span>
                       <Copy size={12} className="opacity-0 group-hover:opacity-100 text-slate-400" />
                   </div>
                 ))}
               </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PasswordGenTool;
