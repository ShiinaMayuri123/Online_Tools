/**
 * ADB 机器人现场运维平台 - 参数化命令配置中心
 * 提供结构化命令定义、参数模型、危险控制与命令动态构建能力
 */

export const COMMAND_CATEGORIES = [
  '设备连接',
  '设备信息',
  '日志诊断',
  'APP管理',
  '文件管理',
  '系统控制',
  '网络诊断',
  '硬件检测',
  '性能监控',
  '高级调试',
];

export const ADB_COMMANDS = [
  // ── 1. 设备连接 ──────────────────────────────────────────
  {
    id: 'devices_list',
    name: '查看设备列表',
    category: '设备连接',
    description: '检测并列出当前连接的所有 ADB 设备及状态',
    danger: 'none',
    params: [
      {
        key: 'verbose',
        label: '详细信息 (-l)',
        type: 'checkbox',
        default: true,
      },
    ],
    build: (p) => `adb devices${p.verbose ? ' -l' : ''}`,
  },
  {
    id: 'connect_device',
    name: 'WiFi 远程连接',
    category: '设备连接',
    description: '通过 IP 地址和端口号远程连接 Android 机器人设备',
    danger: 'none',
    params: [
      {
        key: 'ip',
        label: '设备 IP 地址',
        type: 'text',
        placeholder: '192.168.1.100',
        required: true,
      },
      {
        key: 'port',
        label: 'ADB 端口号',
        type: 'text',
        default: '5555',
      },
    ],
    build: (p) => `adb connect ${p.ip || ''}${p.port ? ':' + p.port : ''}`.trim(),
  },
  {
    id: 'disconnect_device',
    name: '断开设备连接',
    category: '设备连接',
    description: '断开指定 IP 的无线 ADB 连接，不填则断开全部',
    danger: 'none',
    params: [
      {
        key: 'target',
        label: '设备 IP 或 序列号',
        type: 'text',
        placeholder: '留空表示断开所有设备',
      },
    ],
    build: (p) => (p.target ? `adb disconnect ${p.target}` : 'adb disconnect'),
  },
  {
    id: 'restart_adbd_tcp',
    name: '开启 TCP/IP 调试',
    category: '设备连接',
    description: '重启设备 ADB 守护进程以监听指定 TCP 端口',
    danger: 'low',
    params: [
      {
        key: 'port',
        label: '监听端口',
        type: 'text',
        default: '5555',
      },
    ],
    build: (p) => `adb tcpip ${p.port || '5555'}`,
  },

  // ── 2. 设备信息 ──────────────────────────────────────────
  {
    id: 'get_model',
    name: '获取设备型号',
    category: '设备信息',
    description: '读取 Android 系统的产品型号属性 ro.product.model',
    danger: 'none',
    params: [],
    build: () => 'adb shell getprop ro.product.model',
  },
  {
    id: 'get_os_version',
    name: '获取系统版本',
    category: '设备信息',
    description: '读取 Android 系统 release 版本号',
    danger: 'none',
    params: [],
    build: () => 'adb shell getprop ro.build.version.release',
  },
  {
    id: 'get_serialno',
    name: '获取硬件序列号',
    category: '设备信息',
    description: '获取设备唯一串号 SN',
    danger: 'none',
    params: [],
    build: () => 'adb shell getprop ro.serialno',
  },
  {
    id: 'get_uptime',
    name: '查看开机运行时长',
    category: '设备信息',
    description: '查看系统当前已运行时间及 CPU 平均负载',
    danger: 'none',
    params: [],
    build: () => 'adb shell uptime',
  },
  {
    id: 'get_display_info',
    name: '获取屏幕分辨率与密度',
    category: '设备信息',
    description: '输出物理分辨率 (wm size) 和屏幕密度 (wm density)',
    danger: 'none',
    params: [],
    build: () => 'adb shell "wm size; wm density"',
  },
  {
    id: 'get_battery_status',
    name: '查看电池及电源状态',
    category: '设备信息',
    description: '输出电池电量、健康度、温度、电压与充电状态',
    danger: 'none',
    params: [],
    build: () => 'adb shell dumpsys battery',
  },

  // ── 3. 日志诊断 ──────────────────────────────────────────
  {
    id: 'logcat_stream',
    name: '实时查看系统日志',
    category: '日志诊断',
    description: '实时捕获系统 Logcat 输出，支持级别筛选',
    danger: 'none',
    params: [
      {
        key: 'level',
        label: '最低日志级别',
        type: 'select',
        default: '*',
        options: [
          { label: '全部 (*:V)', value: '*:V' },
          { label: '调试及以上 (*:D)', value: '*:D' },
          { label: '信息及以上 (*:I)', value: '*:I' },
          { label: '警告及以上 (*:W)', value: '*:W' },
          { label: '错误及以上 (*:E)', value: '*:E' },
          { label: '致命异常 (*:F)', value: '*:F' },
        ],
      },
      {
        key: 'keyword',
        label: '关键词过滤 (Grep)',
        type: 'text',
        placeholder: '例如 navigation / lidar / pudu',
      },
    ],
    build: (p) => {
      let cmd = `adb logcat ${p.level || '*:V'}`;
      if (p.keyword) {
        cmd += ` | grep -i "${p.keyword}"`;
      }
      return cmd;
    },
  },
  {
    id: 'logcat_dump',
    name: '导出当前日志缓冲区',
    category: '日志诊断',
    description: '一次性导出当前已保存在内存中的 Logcat 缓存',
    danger: 'none',
    params: [
      {
        key: 'tag',
        label: '过滤 Tag 或 关键字',
        type: 'text',
        placeholder: '例如 fatal / crash / anr',
      },
    ],
    build: (p) => (p.tag ? `adb shell logcat -d | grep -i "${p.tag}"` : 'adb logcat -d'),
  },
  {
    id: 'logcat_clear',
    name: '清空日志缓冲区',
    category: '日志诊断',
    description: '清除设备内存中旧的 Logcat 日志数据',
    danger: 'low',
    params: [],
    build: () => 'adb logcat -c',
  },
  {
    id: 'kernel_dmesg',
    name: '查看内核日志 (dmesg)',
    category: '日志诊断',
    description: '查看 Linux 内核 Ring Buffer 日志 (部分设备需 Root)',
    danger: 'none',
    params: [
      {
        key: 'filter',
        label: '内核关键词',
        type: 'text',
        placeholder: '例如 tty / usb / wlan',
      },
    ],
    build: (p) => (p.filter ? `adb shell dmesg | grep -i "${p.filter}"` : 'adb shell dmesg'),
  },

  // ── 4. APP管理 ──────────────────────────────────────────
  {
    id: 'install_apk',
    name: '安装 APK 应用',
    category: 'APP管理',
    description: '向 Android 机器人推送并安装指定 APK 文件，支持覆盖与降级',
    danger: 'medium',
    dangerReason: '覆盖安装可能会修改应用程序行为，请确认 APK 来源安全',
    params: [
      {
        key: 'apkPath',
        label: 'APK 文件路径/名称',
        type: 'text',
        placeholder: '例如 app-release.apk 或 /sdcard/robot.apk',
        required: true,
      },
      {
        key: 'modes',
        label: '安装模式选项',
        type: 'checkbox_group',
        options: [
          { label: '覆盖安装 (-r)', value: '-r' },
          { label: '允许降级 (-d)', value: '-d' },
          { label: '测试版本 (-t)', value: '-t' },
          { label: '授予所有运行时权限 (-g)', value: '-g' },
        ],
        default: ['-r'],
      },
    ],
    build: (p) => {
      const opts = Array.isArray(p.modes) ? p.modes.join(' ') : '';
      return `adb install ${opts} ${p.apkPath || ''}`.replace(/\s+/g, ' ').trim();
    },
  },
  {
    id: 'uninstall_app',
    name: '卸载应用包',
    category: 'APP管理',
    description: '从设备中删除指定的 Application Package',
    danger: 'high',
    dangerReason: '卸载核心机器人应用会导致现场设备无法运行',
    params: [
      {
        key: 'packageName',
        label: '应用包名',
        type: 'text',
        placeholder: '例如 com.pudutech.pdrobot',
        required: true,
      },
      {
        key: 'keepData',
        label: '保留应用数据和缓存 (-k)',
        type: 'checkbox',
        default: false,
      },
    ],
    build: (p) => `adb uninstall ${p.keepData ? '-k ' : ''}${p.packageName || ''}`.trim(),
  },
  {
    id: 'list_packages',
    name: '列出已安装应用',
    category: 'APP管理',
    description: '查询 Android 系统已安装的应用列表，支持筛选第三方或指定包',
    danger: 'none',
    params: [
      {
        key: 'type',
        label: '筛选条件',
        type: 'select',
        default: 'all',
        options: [
          { label: '所有应用', value: 'all' },
          { label: '仅第三方应用 (-3)', value: '-3' },
          { label: '仅系统应用 (-s)', value: '-s' },
        ],
      },
      {
        key: 'filter',
        label: '包名关键字过滤',
        type: 'text',
        placeholder: '例如 pudu / robot / sdk',
      },
    ],
    build: (p) => {
      let opt = p.type && p.type !== 'all' ? ` ${p.type}` : '';
      let cmd = `adb shell pm list packages${opt}`;
      if (p.filter) {
        cmd += ` | grep -i "${p.filter}"`;
      }
      return cmd;
    },
  },
  {
    id: 'stop_app',
    name: '强制停止应用',
    category: 'APP管理',
    description: '立刻杀死指定的 App 进程 (am force-stop)',
    danger: 'medium',
    dangerReason: '强制停止可能会中断机器人正在执行的导航或送餐任务',
    params: [
      {
        key: 'packageName',
        label: '应用包名',
        type: 'text',
        placeholder: '例如 com.pudutech.pdrobot',
        required: true,
      },
    ],
    build: (p) => `adb shell am force-stop ${p.packageName || ''}`,
  },
  {
    id: 'clear_app_data',
    name: '清除应用所有数据',
    category: 'APP管理',
    description: '清空指定 App 的所有配置、缓存和数据库 (pm clear)',
    danger: 'high',
    dangerReason: '清除数据不可恢复，需要重新配置机器人登录信息与参数',
    params: [
      {
        key: 'packageName',
        label: '应用包名',
        type: 'text',
        placeholder: '例如 com.pudutech.pdrobot',
        required: true,
      },
    ],
    build: (p) => `adb shell pm clear ${p.packageName || ''}`,
  },

  // ── 5. 文件管理 ──────────────────────────────────────────
  {
    id: 'push_file',
    name: '上传文件到设备 (adb push)',
    category: '文件管理',
    description: '将电脑本地文件或目录传输到 Android 机器人的指定路径',
    danger: 'medium',
    dangerReason: '覆盖系统核心文件可能导致系统损坏',
    params: [
      {
        key: 'localPath',
        label: '本地文件路径',
        type: 'file',
        placeholder: '例如 C:/robot.apk 或 robot.config',
        required: true,
      },
      {
        key: 'remotePath',
        label: '目标设备路径',
        type: 'text',
        default: '/sdcard/',
        required: true,
      },
    ],
    build: (p) => `adb push ${p.localPath || ''} ${p.remotePath || '/sdcard/'}`,
  },
  {
    id: 'pull_file',
    name: '从设备下载文件 (adb pull)',
    category: '文件管理',
    description: '将机器人设备中的日志、配置文件或截图下载到本地电脑',
    danger: 'none',
    params: [
      {
        key: 'remotePath',
        label: '设备文件路径',
        type: 'text',
        placeholder: '例如 /sdcard/pudu/log/ 或 /sdcard/test.png',
        required: true,
      },
      {
        key: 'localPath',
        label: '保存到本地路径',
        type: 'text',
        default: './downloads/',
      },
    ],
    build: (p) => `adb pull ${p.remotePath || ''} ${p.localPath || './'}`,
  },
  {
    id: 'ls_directory',
    name: '查看目录文件列表',
    category: '文件管理',
    description: '使用 ls 命令查看设备内部特定目录的文件与文件夹',
    danger: 'none',
    params: [
      {
        key: 'dirPath',
        label: '设备目录路径',
        type: 'text',
        default: '/sdcard/',
      },
      {
        key: 'detail',
        label: '显示详细权限与大小 (-la)',
        type: 'checkbox',
        default: true,
      },
    ],
    build: (p) => `adb shell ls ${p.detail ? '-la ' : ''}${p.dirPath || '/sdcard/'}`,
  },
  {
    id: 'remove_file',
    name: '删除设备文件或目录',
    category: '文件管理',
    description: '永久删除机器人设备存储中的指定文件或日志目录 (rm -rf)',
    danger: 'high',
    dangerReason: '文件一经删除将永久无法恢复！误删系统文件将导致设备宕机',
    params: [
      {
        key: 'targetPath',
        label: '目标文件/目录路径',
        type: 'text',
        placeholder: '例如 /sdcard/pudu/log/*',
        required: true,
      },
      {
        key: 'recursive',
        label: '递归强制删除 (-rf)',
        type: 'checkbox',
        default: true,
      },
    ],
    build: (p) => `adb shell rm ${p.recursive ? '-rf ' : ''}${p.targetPath || ''}`,
  },

  // ── 6. 系统控制 ──────────────────────────────────────────
  {
    id: 'reboot_device',
    name: '重启机器人系统',
    category: '系统控制',
    description: '安全重启 Android 系统主板 (adb reboot)',
    danger: 'high',
    dangerReason: '重启将立即中断机器人当前所有现场工作与任务！',
    params: [],
    build: () => 'adb reboot',
  },
  {
    id: 'reboot_recovery',
    name: '进入 Recovery 模式',
    category: '系统控制',
    description: '将设备重启至 Recovery 恢复模式',
    danger: 'high',
    dangerReason: '机器人在 Recovery 模式下无法正常运行，需现场手动恢复！',
    params: [],
    build: () => 'adb reboot recovery',
  },
  {
    id: 'adb_root',
    name: '获取 Root 权限 (adb root)',
    category: '系统控制',
    description: '以 Root 超级用户身份重启 adbd 调试进程',
    danger: 'medium',
    dangerReason: ' Root 权限下执行命令将绕过系统安全限制',
    params: [],
    build: () => 'adb root',
  },
  {
    id: 'input_keyevent',
    name: '按键模拟 (Keyevent)',
    category: '系统控制',
    description: '模拟按下系统按键（如 HOME 键、返回键、电源键等）',
    danger: 'low',
    params: [
      {
        key: 'keycode',
        label: '按键代码',
        type: 'select',
        default: '3',
        options: [
          { label: 'HOME 键 (3)', value: '3' },
          { label: '返回键 (4)', value: '4' },
          { label: '菜单键 (82)', value: '82' },
          { label: '电源键 (26)', value: '26' },
          { label: '音量加 (24)', value: '24' },
          { label: '音量减 (25)', value: '25' },
        ],
      },
    ],
    build: (p) => `adb shell input keyevent ${p.keycode || '3'}`,
  },
  {
    id: 'input_tap',
    name: '模拟屏幕点击',
    category: '系统控制',
    description: '在机器人屏幕特定 X, Y 像素坐标执行一次点击',
    danger: 'low',
    params: [
      { key: 'x', label: 'X 坐标 (像素)', type: 'text', default: '512', required: true },
      { key: 'y', label: 'Y 坐标 (像素)', type: 'text', default: '300', required: true },
    ],
    build: (p) => `adb shell input tap ${p.x || 0} ${p.y || 0}`,
  },

  // ── 7. 网络诊断 ──────────────────────────────────────────
  {
    id: 'network_ifconfig',
    name: '查看网络接口状态',
    category: '网络诊断',
    description: '查看 wlan0 或 eth0 网络接口的 IP 地址与 MAC 地址',
    danger: 'none',
    params: [
      {
        key: 'interface',
        label: '网卡接口名称',
        type: 'select',
        default: 'wlan0',
        options: [
          { label: '无线网卡 (wlan0)', value: 'wlan0' },
          { label: '有线网卡 (eth0)', value: 'eth0' },
          { label: '所有接口 (all)', value: '' },
        ],
      },
    ],
    build: (p) => `adb shell ifconfig ${p.interface || ''}`.trim(),
  },
  {
    id: 'ping_test',
    name: '测试网络连通性 (Ping)',
    category: '网络诊断',
    description: '向指定域名或 IP 发送 ICMP 包测试延迟与丢包率',
    danger: 'none',
    params: [
      {
        key: 'target',
        label: '目标 IP 或 域名',
        type: 'text',
        default: '8.8.8.8',
        required: true,
      },
      {
        key: 'count',
        label: '发送次数 (-c)',
        type: 'text',
        default: '4',
      },
    ],
    build: (p) => `adb shell ping -c ${p.count || 4} ${p.target || '8.8.8.8'}`,
  },
  {
    id: 'netstat_listen',
    name: '查看监听端口 (netstat)',
    category: '网络诊断',
    description: '列出系统中已开启的网络监听端口与对应进程 PID',
    danger: 'none',
    params: [],
    build: () => 'adb shell netstat -tlnp',
  },

  // ── 8. 硬件检测 ──────────────────────────────────────────
  {
    id: 'list_tty_devices',
    name: '检测串口设备 (tty)',
    category: '硬件检测',
    description: '列出系统 /dev 下的串口设备（雷达、底盘、传感器常用）',
    danger: 'none',
    params: [],
    build: () => 'adb shell ls /dev | grep tty',
  },
  {
    id: 'list_usb_devices',
    name: '列出 USB 设备 (lsusb)',
    category: '硬件检测',
    description: '查看当前 USB 总线上挂载的摄像头、深度相机及模块',
    danger: 'none',
    params: [],
    build: () => 'adb shell lsusb',
  },
  {
    id: 'dumpsys_sensors',
    name: '查看传感器服务状态',
    category: '硬件检测',
    description: '查看陀螺仪、加速度计、IMU 等传感器注册与采样率信息',
    danger: 'none',
    params: [],
    build: () => 'adb shell dumpsys sensorservice',
  },

  // ── 9. 性能监控 ──────────────────────────────────────────
  {
    id: 'top_processes',
    name: '查看 CPU 与内存实时占用 (top)',
    category: '性能监控',
    description: '按 CPU / 内存消耗排序展示耗资源最多的进程列表',
    danger: 'none',
    params: [
      {
        key: 'count',
        label: '刷新次数 (-n)',
        type: 'text',
        default: '1',
      },
    ],
    build: (p) => `adb shell top -n ${p.count || 1}`,
  },
  {
    id: 'meminfo_dump',
    name: '内存分配明细 (dumpsys meminfo)',
    category: '性能监控',
    description: '深度查看 Android 系统与特定 App 的 Native/Dalvik 堆内存占用',
    danger: 'none',
    params: [
      {
        key: 'packageName',
        label: '指定 App 包名 (可选)',
        type: 'text',
        placeholder: '留空表示查看全系统内存分配',
      },
    ],
    build: (p) => (p.packageName ? `adb shell dumpsys meminfo ${p.packageName}` : 'adb shell dumpsys meminfo'),
  },
  {
    id: 'disk_space',
    name: '查看磁盘存储空间 (df -h)',
    category: '性能监控',
    description: '以人类可读格式 (MB/GB) 显示各分区使用率',
    danger: 'none',
    params: [],
    build: () => 'adb shell df -h',
  },

  // ── 10. 高级调试 ──────────────────────────────────────────
  {
    id: 'screencap_device',
    name: '截取屏幕图像',
    category: '高级调试',
    description: '保存当前机器人屏幕画面到 /sdcard/screenshot.png',
    danger: 'none',
    params: [
      {
        key: 'savePath',
        label: '保存设备路径',
        type: 'text',
        default: '/sdcard/screenshot.png',
      },
    ],
    build: (p) => `adb shell screencap ${p.savePath || '/sdcard/screenshot.png'}`,
  },
  {
    id: 'screenrecord_device',
    name: '录制屏幕视频',
    category: '高级调试',
    description: '录制机器人屏幕操作视频（默认最长 3 分钟）',
    danger: 'low',
    params: [
      {
        key: 'timeLimit',
        label: '录制时长 (秒)',
        type: 'text',
        default: '10',
      },
      {
        key: 'videoPath',
        label: '保存视频路径',
        type: 'text',
        default: '/sdcard/demo.mp4',
      },
    ],
    build: (p) => `adb shell screenrecord --time-limit ${p.timeLimit || 10} ${p.videoPath || '/sdcard/demo.mp4'}`,
  },
  {
    id: 'bugreport_gen',
    name: '生成完整 Bug 诊断报告',
    category: '高级调试',
    description: '收集系统完整的 dumpsys、Logcat、ANR 及崩溃日志',
    danger: 'medium',
    dangerReason: '生成 Bugreport 会占用较多 CPU 和内存资源，耗时约 1~3 分钟',
    params: [
      {
        key: 'zipName',
        label: '导出的 zip 文件名',
        type: 'text',
        default: 'bugreport.zip',
      },
    ],
    build: (p) => `adb bugreport ${p.zipName || 'bugreport.zip'}`,
  },
];
