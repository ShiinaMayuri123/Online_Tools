import { AlignVerticalSpaceAround, HardDrive, Package } from 'lucide-react';

/**
 * THEMES (主题配置)
 * 这个对象定义了整个工具箱支持的所有颜色主题。
 * 每一个属性名（如 'slate', 'blue'）代表一个主题的唯一标识。
 * 里面包含了该主题下各个部分的颜色值，使用的是 Tailwind CSS 的类名。
 */
export const THEMES = {
  slate: { 
    name: 'Minimal', // 主题的显示名称
    primaryBg: 'bg-slate-700', // 主色调背景（用于按钮等）
    primaryHover: 'hover:bg-slate-800', // 悬浮时的背景色
    textRaw: 'slate', // 原始颜色名称
    textAccent: 'text-slate-700', // 强调文本颜色
    bgLight: 'bg-slate-100', // 浅色背景（用于选中状态或柔和的背景）
    borderAccent: 'border-slate-300', // 边框颜色
    ringFocus: 'ring-slate-500', // 聚焦时的光环颜色
    gradientTitle: 'from-slate-700 via-gray-600 to-zinc-500', // 首页大标题的渐变色配置
    particleColor: 'rgba(71, 85, 105, 0.6)', // 首页粒子动画的颜色
    orb1: 'bg-slate-400', // 背景模糊光球1的颜色
    orb2: 'bg-gray-400', // 背景模糊光球2的颜色
    orb3: 'bg-zinc-200' // 背景模糊光球3的颜色
  },
  blue: { 
    name: 'Ocean', 
    primaryBg: 'bg-indigo-600', primaryHover: 'hover:bg-indigo-700', 
    textRaw: 'indigo', textAccent: 'text-indigo-600', bgLight: 'bg-indigo-50', 
    borderAccent: 'border-indigo-200', ringFocus: 'ring-indigo-500', 
    gradientTitle: 'from-indigo-600 via-blue-500 to-sky-500', 
    particleColor: 'rgba(79, 70, 229, 0.6)', 
    orb1: 'bg-indigo-400', orb2: 'bg-blue-400', orb3: 'bg-sky-200' 
  },
  emerald: { 
    name: 'Aurora', 
    primaryBg: 'bg-teal-600', primaryHover: 'hover:bg-teal-700', 
    textRaw: 'teal', textAccent: 'text-teal-600', bgLight: 'bg-teal-50', 
    borderAccent: 'border-teal-200', ringFocus: 'ring-teal-500', 
    gradientTitle: 'from-teal-600 via-emerald-500 to-cyan-500', 
    particleColor: 'rgba(13, 148, 136, 0.6)', 
    orb1: 'bg-teal-400', orb2: 'bg-emerald-400', orb3: 'bg-cyan-200' 
  },
  violet: { 
    name: 'Neon', 
    primaryBg: 'bg-purple-600', primaryHover: 'hover:bg-purple-700', 
    textRaw: 'purple', textAccent: 'text-purple-600', bgLight: 'bg-purple-50', 
    borderAccent: 'border-purple-200', ringFocus: 'ring-purple-500', 
    gradientTitle: 'from-purple-600 via-violet-500 to-fuchsia-500', 
    particleColor: 'rgba(147, 51, 234, 0.6)', 
    orb1: 'bg-purple-400', orb2: 'bg-violet-400', orb3: 'bg-fuchsia-200' 
  },
  amber: { 
    name: 'Sunset', 
    primaryBg: 'bg-orange-600', primaryHover: 'hover:bg-orange-700', 
    textRaw: 'orange', textAccent: 'text-orange-600', bgLight: 'bg-orange-50', 
    borderAccent: 'border-orange-200', ringFocus: 'ring-orange-500', 
    gradientTitle: 'from-orange-600 via-amber-600 to-yellow-500', 
    particleColor: 'rgba(234, 88, 12, 0.6)', 
    orb1: 'bg-orange-400', orb2: 'bg-amber-500', orb3: 'bg-yellow-200' 
  },
  zinc: { 
    name: 'Onyx', 
    primaryBg: 'bg-zinc-900', primaryHover: 'hover:bg-black', 
    textRaw: 'zinc', textAccent: 'text-zinc-900', bgLight: 'bg-zinc-100', 
    borderAccent: 'border-zinc-300', ringFocus: 'ring-zinc-600', 
    gradientTitle: 'from-zinc-900 via-neutral-700 to-stone-600', 
    particleColor: 'rgba(24, 24, 27, 0.8)', 
    orb1: 'bg-gray-500', orb2: 'bg-zinc-600', orb3: 'bg-stone-400' 
  },
  rose: { 
    name: 'Crimson', 
    primaryBg: 'bg-rose-900', primaryHover: 'hover:bg-rose-950', 
    textRaw: 'rose', textAccent: 'text-rose-900', bgLight: 'bg-rose-50', 
    borderAccent: 'border-rose-200', ringFocus: 'ring-rose-600', 
    gradientTitle: 'from-rose-900 via-red-800 to-orange-900', 
    particleColor: 'rgba(136, 19, 55, 0.7)', 
    orb1: 'bg-rose-400', orb2: 'bg-red-500', orb3: 'bg-orange-300' 
  }
};

/**
 * TOOLS (工具列表配置)
 * 定义了首页展示的各个工具卡片的信息，以及它们对应的路由路径。
 */
export const TOOLS = [
  {
      id: 'stitcher', // 唯一标识符
      path: '/stitcher', // 对应的网址路由路径
      title: '长图拼接工具', // 工具的显示名称
      description: '将多张截图或照片智能拼接成一张长图。支持纵向/横向拼接，可调节画质与尺寸，完美适配聊天记录导出。', // 详细描述
      icon: AlignVerticalSpaceAround, // 该工具使用的图标组件 (来自 lucide-react)
      isPopular: true, // 是否显示 "Popular" (热门) 标签
      isNew: false // 是否显示 "NEW" (最新) 标签
  },
  {
    id: 'password-gen',
    path: '/password',
    title: '安全密码生成器',
    description: '本地离线生成高强度随机密码。支持自定义长度、字符集，内置强度检测，您的密码永远不会离开浏览器。',
    icon: HardDrive,
    isPopular: false,
    isNew: true
  },
  {
    id: 'robot-test-record',
    path: '/robot-record',
    title: '机器人测试记录管理',
    description: '管理和分析机器人测试记录。支持按MAC地址分组、智能搜索排序、导入导出、动态选项配置等功能。',
    icon: Package,
    isPopular: false,
    isNew: true
  }
];
