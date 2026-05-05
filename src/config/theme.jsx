import { AlignVerticalSpaceAround, HardDrive, Package, Bot, Hash, Globe, Sparkles } from 'lucide-react';

/**
 * THEMES (主题配置)
 * 定义了整个工具箱支持的所有颜色主题。
 * 每个属性名代表一个主题的唯一标识，包含 Tailwind CSS 类名。
 */
export const THEMES = {
  slate: {
    name: 'Minimal',
    primaryBg: 'bg-slate-700',
    primaryHover: 'hover:bg-slate-800',
    textRaw: 'slate',
    textAccent: 'text-slate-700',
    bgLight: 'bg-slate-100',
    borderAccent: 'border-slate-300',
    ringFocus: 'ring-slate-500',
    gradientTitle: 'from-slate-700 via-gray-600 to-zinc-500',
    particleColor: 'rgba(71, 85, 105, 0.6)',
    orb1: 'bg-slate-400',
    orb2: 'bg-gray-400',
    orb3: 'bg-zinc-200'
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
 * 定义了首页展示的各个工具卡片的信息及路由路径。
 * 新增工具只需在此数组中添加一项，首页会自动渲染对应卡片。
 */
export const TOOLS = [
  {
    id: 'stitcher',
    path: '/stitcher',
    title: '长图拼接工具',
    description: '将多张截图或照片智能拼接成一张长图。支持纵向/横向拼接，可调节画质与尺寸，完美适配聊天记录导出。',
    icon: AlignVerticalSpaceAround,
    isPopular: true,
    isNew: false
  },
  {
    id: 'password-gen',
    path: '/password',
    title: '安全密码生成器',
    description: '本地离线生成高强度随机密码。支持自定义长度、字符集，内置强度检测，您的密码永远不会离开浏览器。',
    icon: HardDrive,
    isPopular: false,
    isNew: false
  },
  {
    id: 'robot-test-record',
    path: '/robot-record',
    title: '机器人测试记录管理',
    description: '管理和分析机器人测试记录。支持按MAC地址分组、智能搜索排序、导入导出、动态选项配置等功能。',
    icon: Package,
    isPopular: false,
    isNew: false
  },
  {
    id: 'robot-management-tools',
    path: 'https://xiaoping666.cc.cd/',
    title: 'Robot_Management_Tools',
    description: '机器人管理工具集合。提供完整的机器人管理解决方案，包括配置管理、状态监控和远程控制等功能。',
    icon: Bot,
    isPopular: false,
    isNew: false,
    isExternal: true
  },
  {
    id: 'new-api',
    path: 'https://www.xiaoping888.cc.cd/',
    title: 'NewAPI',
    description: '新一代 API 管理平台。支持多模型聚合、令牌管理、用量统计等功能。',
    icon: Sparkles,
    isPopular: false,
    isNew: true,
    isExternal: true
  },
  {
    id: 'base-converter',
    path: '/base-converter',
    title: '进制转换',
    description: '在二进制、八进制、十进制、十六进制之间自由转换，支持大数。',
    icon: Hash,
    isPopular: false,
    isNew: true
  },
  {
    id: 'ip-lookup',
    path: '/ip-lookup',
    title: '查看当前 IP',
    description: '一键查询当前设备的公网 IP 地址及地理位置、ISP 等详细信息。',
    icon: Globe,
    isPopular: false,
    isNew: true
  }
];
