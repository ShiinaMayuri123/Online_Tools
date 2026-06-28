import { AlignVerticalSpaceAround, HardDrive, Package, Hash, Globe, Sparkles, Terminal, Smartphone } from 'lucide-react';

/**
 * THEMES (主题配置)
 * 定义了整个工具箱支持的所有颜色主题。
 * 每个属性名代表一个主题的唯一标识，包含 Tailwind CSS 类名。
 * 配色原则：低饱和度、柔和舒适，适合长时间使用。
 */
export const THEMES = {
  slate: {
    name: 'Minimal',
    primaryBg: 'bg-slate-600',
    primaryHover: 'hover:bg-slate-700',
    textRaw: 'slate',
    textAccent: 'text-slate-600',
    bgLight: 'bg-slate-50',
    borderAccent: 'border-slate-200',
    ringFocus: 'ring-slate-400',
    gradientTitle: 'from-slate-600 via-gray-500 to-zinc-400',
    particleColor: 'rgba(71, 85, 105, 0.3)',
    orb1: 'bg-slate-300',
    orb2: 'bg-gray-300',
    orb3: 'bg-zinc-100'
  },
  blue: {
    name: 'Ocean',
    primaryBg: 'bg-indigo-500', primaryHover: 'hover:bg-indigo-600',
    textRaw: 'indigo', textAccent: 'text-indigo-500', bgLight: 'bg-indigo-50/60',
    borderAccent: 'border-indigo-100', ringFocus: 'ring-indigo-400',
    gradientTitle: 'from-indigo-500 via-blue-400 to-sky-400',
    particleColor: 'rgba(99, 102, 241, 0.3)',
    orb1: 'bg-indigo-200', orb2: 'bg-blue-200', orb3: 'bg-sky-100'
  },
  emerald: {
    name: 'Aurora',
    primaryBg: 'bg-emerald-500', primaryHover: 'hover:bg-emerald-600',
    textRaw: 'emerald', textAccent: 'text-emerald-500', bgLight: 'bg-emerald-50/60',
    borderAccent: 'border-emerald-100', ringFocus: 'ring-emerald-400',
    gradientTitle: 'from-emerald-500 via-teal-400 to-cyan-300',
    particleColor: 'rgba(16, 185, 129, 0.3)',
    orb1: 'bg-emerald-200', orb2: 'bg-teal-200', orb3: 'bg-cyan-100'
  },
  violet: {
    name: 'Neon',
    primaryBg: 'bg-purple-500', primaryHover: 'hover:bg-purple-600',
    textRaw: 'purple', textAccent: 'text-purple-500', bgLight: 'bg-purple-50/60',
    borderAccent: 'border-purple-100', ringFocus: 'ring-purple-400',
    gradientTitle: 'from-purple-500 via-violet-400 to-indigo-300',
    particleColor: 'rgba(147, 51, 234, 0.25)',
    orb1: 'bg-purple-200', orb2: 'bg-violet-200', orb3: 'bg-indigo-100'
  },
  cyan: {
    name: 'Steel',
    primaryBg: 'bg-slate-500', primaryHover: 'hover:bg-slate-600',
    textRaw: 'slate', textAccent: 'text-slate-500', bgLight: 'bg-slate-50/60',
    borderAccent: 'border-slate-200', ringFocus: 'ring-slate-400',
    gradientTitle: 'from-slate-500 via-blue-300 to-cyan-300',
    particleColor: 'rgba(100, 116, 139, 0.25)',
    orb1: 'bg-slate-200', orb2: 'bg-blue-200', orb3: 'bg-cyan-50'
  },
  zinc: {
    name: 'Onyx',
    primaryBg: 'bg-zinc-700', primaryHover: 'hover:bg-zinc-800',
    textRaw: 'zinc', textAccent: 'text-zinc-700', bgLight: 'bg-zinc-50',
    borderAccent: 'border-zinc-200', ringFocus: 'ring-zinc-500',
    gradientTitle: 'from-zinc-700 via-neutral-600 to-stone-500',
    particleColor: 'rgba(24, 24, 27, 0.35)',
    orb1: 'bg-gray-300', orb2: 'bg-zinc-300', orb3: 'bg-stone-200'
  },
  sky: {
    name: 'Frost',
    primaryBg: 'bg-sky-500', primaryHover: 'hover:bg-sky-600',
    textRaw: 'sky', textAccent: 'text-sky-500', bgLight: 'bg-sky-50/60',
    borderAccent: 'border-sky-100', ringFocus: 'ring-sky-400',
    gradientTitle: 'from-sky-500 via-blue-400 to-slate-300',
    particleColor: 'rgba(14, 165, 233, 0.25)',
    orb1: 'bg-sky-200', orb2: 'bg-blue-200', orb3: 'bg-slate-100'
  }
};

/**
 * TOOLS (工具列表配置)
 * 定义了首页展示的各个工具卡片的信息及路由路径。
 * 新增工具只需在此数组中添加一项，首页会自动渲染对应卡片。
 */
export const TOOLS = [
  {
    id: 'adb-tool',
    path: '/adb',
    title: 'ADB 调试助手',
    description: '局域网 Android 设备调试工具。支持 WiFi/USB 连接，实时命令执行，设备信息查看，日志抓取等功能。',
    icon: Terminal,
    isPopular: false,
    isNew: true
  },
  {
    id: 'device-info',
    path: '/device-info',
    title: '设备信息快速扫描',
    description: '一键获取 Android 设备全部基本信息，包括系统版本、硬件配置、电池状态、磁盘使用、网络信息等。',
    icon: Smartphone,
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
    isNew: false
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
    id: 'ip-lookup',
    path: '/ip-lookup',
    title: 'IP 一致性查询',
    description: '多源并发查询公网 IP，自动比对一致性，检测代理/VPN 状态，WebRTC 本地 IP 探测。',
    icon: Globe,
    isPopular: false,
    isNew: true
  },
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
    id: 'base-converter',
    path: '/base-converter',
    title: '进制转换',
    description: '在二进制、八进制、十进制、十六进制之间自由转换，支持大数。',
    icon: Hash,
    isPopular: false,
    isNew: true
  }
];
