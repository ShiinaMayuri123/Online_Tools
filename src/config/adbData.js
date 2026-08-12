/**
 * ADB 命令测试报告数据
 * 来源：ADB命令测试报告.md（2026-06-01 测试）
 * 设备：NanoPC-T4 (RK3399) / Android 8.1.0
 */
import {
  Wifi, Settings, Package, Folder, FileText,
  Monitor, Network, HardDrive, Cpu, Battery,
  Stethoscope, MousePointer,
} from 'lucide-react';

// ── ADB 命令分类（9 个分类，含状态/风险标注） ──────────────────
export const ADB_SECTIONS = [
  {
    title: '连接管理',
    icon: Wifi,
    commands: [
      { cmd: 'adb devices', desc: '查看连接设备列表', status: 'ok' },
      { cmd: 'adb connect <ip地址>', desc: 'WiFi 连接设备', status: 'ok' },
      { cmd: 'adb disconnect', desc: '断开所有无线连接', status: 'ok' },
      { cmd: 'adb -s <设备序列号> <command>', desc: '指定设备执行命令', status: 'ok' },
      { cmd: 'adb devices -l', desc: '列出设备详细信息', status: 'ok' },
    ],
  },
  {
    title: '设备信息',
    icon: HardDrive,
    commands: [
      { cmd: 'adb shell getprop ro.product.model', desc: '获取设备型号', status: 'ok', output: 'NanoPC-T4 (RK3399)' },
      { cmd: 'adb shell getprop ro.build.version.release', desc: '获取 Android 版本', status: 'ok', output: '8.1.0' },
      { cmd: 'adb shell getprop ro.serialno', desc: '获取设备序列号', status: 'ok', output: 'X5K89M5OUL' },
      { cmd: 'adb shell date', desc: '查看设备当前时间', status: 'ok' },
      { cmd: 'adb shell uptime', desc: '查看系统运行时长', status: 'ok' },
      { cmd: 'adb shell cat /proc/cpuinfo', desc: '查看 CPU 详细信息', status: 'ok' },
      { cmd: 'adb shell cat /proc/meminfo', desc: '查看内存信息', status: 'ok', output: '总计约 3.9GB' },
      { cmd: 'adb shell cat /system/build.prop', desc: '查看系统构建属性', status: 'ok' },
      { cmd: 'adb shell df -h', desc: '查看磁盘空间使用情况', status: 'ok' },
      { cmd: 'adb shell wm size', desc: '查看屏幕分辨率', status: 'ok', output: '1024x600' },
      { cmd: 'adb shell wm density', desc: '查看屏幕密度', status: 'ok', output: '160dpi' },
      { cmd: 'adb shell settings get system screen_brightness', desc: '获取屏幕亮度', status: 'ok', output: '179' },
      { cmd: 'adb shell dumpsys battery', desc: '查看电池状态', status: 'ok', output: '电量/状态/温度/电源信息' },
      { cmd: 'adb shell ls /dev | grep tty', desc: '列出 tty 设备', status: 'ok' },
      { cmd: 'adb shell lsusb', desc: '列出 USB 设备', status: 'ok' },
      { cmd: 'adb shell dmesg | grep tty', desc: '查看内核串口日志', status: 'root', output: '需要 root 权限' },
    ],
  },
  {
    title: '网络诊断',
    icon: Network,
    commands: [
      { cmd: 'adb shell ifconfig wlan0', desc: '查看 WiFi 网络接口信息', status: 'ok' },
      { cmd: 'adb shell ip addr show wlan0', desc: '查看 IP 地址（更详细）', status: 'ok' },
      { cmd: 'adb shell ping -c 3 8.8.8.8', desc: '测试外网连通性', status: 'ok', output: '延迟约 170ms' },
      { cmd: 'adb shell dumpsys wifi', desc: '查看 WiFi 详细状态信息', status: 'ok' },
      { cmd: 'adb shell getprop | grep dns', desc: '查看 DNS 配置', status: 'ok' },
      { cmd: 'adb shell netstat -tlnp', desc: '查看网络连接和监听端口', status: 'ok' },
    ],
  },
  {
    title: '应用管理',
    icon: Package,
    commands: [
      { cmd: 'adb shell pm list packages', desc: '列出所有应用', status: 'ok', output: '共 85 个' },
      { cmd: 'adb shell pm list packages | grep pudu', desc: '搜索普渡应用', status: 'ok' },
      { cmd: 'adb shell ps', desc: '查看所有进程', status: 'ok' },
      { cmd: 'adb shell ps | grep robot', desc: '查看 robot 相关进程', status: 'ok' },
      { cmd: 'adb shell top -n 1', desc: '查看进程资源占用（单次）', status: 'ok' },
      { cmd: 'adb install -r <apk路径>', desc: '覆盖安装应用', status: 'ok' },
      { cmd: 'adb shell am force-stop <包名>', desc: '强制停止应用', status: 'ok', risk: 'medium', consequence: '任务中断，应用会自动重启' },
      { cmd: 'adb shell pm clear <包名>', desc: '清除应用所有数据', status: 'untested', risk: 'high', consequence: '需重新配置登录，数据不可恢复' },
      { cmd: 'adb shell monkey -p <包名> -c android.intent.category.LAUNCHER 1', desc: '启动应用', status: 'untested', risk: 'low' },
    ],
  },
  {
    title: '日志与调试',
    icon: FileText,
    commands: [
      { cmd: 'adb logcat', desc: '实时查看日志', status: 'ok' },
      { cmd: 'adb logcat -d', desc: '导出当前日志缓冲区', status: 'ok' },
      { cmd: 'adb logcat *:E', desc: '仅显示错误级别日志', status: 'ok' },
      { cmd: 'adb logcat | grep -i "keyword"', desc: '过滤关键词日志', status: 'ok' },
      { cmd: 'adb logcat -d > file.txt', desc: '导出日志到文件', status: 'ok' },
      { cmd: 'adb logcat -c', desc: '清除内存日志缓冲区', status: 'ok' },
    ],
  },
  {
    title: '文件操作',
    icon: Folder,
    commands: [
      { cmd: 'adb shell ls /sdcard/pudu/log/', desc: '查看日志目录', status: 'ok' },
      { cmd: 'adb shell du -sh /sdcard/pudu/log', desc: '查看日志目录大小', status: 'ok' },
      { cmd: 'adb pull <设备路径> <本地路径>', desc: '从设备拉取文件', status: 'ok' },
      { cmd: 'adb push <本地路径> <设备路径>', desc: '推送文件到设备', status: 'ok' },
      { cmd: 'adb shell screencap /sdcard/test.png', desc: '截图保存到设备', status: 'ok' },
      { cmd: 'adb shell rm -rf /sdcard/pudu/log/*', desc: '永久删除所有日志文件', status: 'ok', risk: 'high', consequence: '原 4.3GB 日志永久删除，不可恢复' },
      { cmd: 'adb shell rm -r /sdcard/pudu/log/*', desc: '清理普渡日志', status: 'ok', risk: 'high', consequence: '日志文件永久删除' },
      { cmd: 'adb shell du -sh *', desc: '查看目录大小', status: 'ok' },
    ],
  },
  {
    title: '地图管理',
    icon: Folder,
    commands: [
      { cmd: 'adb pull /sdcard/pudu/map/<地图文件名> ./', desc: '从设备拉取地图文件（默认目录 /sdcard/pudu/map/，示例文件名：eW16.pdmap）', status: 'untested' },
      { cmd: 'adb push <本地地图路径> /sdcard/pudu/map/', desc: '推送地图文件到设备（覆盖同名文件）', status: 'untested', risk: 'medium', consequence: '覆盖设备上同名地图' },
      { cmd: 'adb shell rm -rf /sdcard/pudu/map/<地图文件名>', desc: '删除设备上的地图文件', status: 'untested', risk: 'high', consequence: '地图文件永久删除，不可恢复' },
    ],
  },
  {
    title: '屏幕与输入',
    icon: Monitor,
    commands: [
      { cmd: 'adb shell input tap X Y', desc: '模拟点击屏幕坐标', status: 'ok' },
      { cmd: 'adb shell input keyevent 3', desc: 'HOME 键', status: 'ok' },
      { cmd: 'adb shell input keyevent 4', desc: '返回键', status: 'ok' },
      { cmd: 'adb shell input swipe 500 1000 500 500', desc: '滑动操作', status: 'ok' },
      { cmd: 'adb shell screencap /sdcard/xxx.png', desc: '截取屏幕', status: 'ok' },
      { cmd: 'adb shell screenrecord /sdcard/video.mp4', desc: '录屏', status: 'ok' },
    ],
  },
  {
    title: '系统控制',
    icon: Settings,
    commands: [
      { cmd: 'adb reboot', desc: '重启设备', status: 'untested', risk: 'medium', consequence: '当前任务中断，设备立即重启' },
      { cmd: 'adb reboot recovery', desc: '进入 Recovery 模式', status: 'untested', risk: 'high', consequence: '设备无法正常工作，需手动操作退出' },
      { cmd: 'adb root', desc: '以 root 权限重启 adbd', status: 'untested', risk: 'medium' },
      { cmd: 'adb shell am start -n com.android.launcher3/com.android.launcher3.Launcher', desc: '返回安卓原生桌面（退出机器人业务 App，用于 App 卡死时跳出）', status: 'untested' },
    ],
  },
];

// ── 故障排查流程（13 个场景） ─────────────────────────────────
export const TROUBLESHOOTING_FLOWS = [
  {
    id: 'network',
    title: '机器人无法联网',
    icon: Wifi,
    steps: [
      { cmd: 'adb shell ifconfig wlan0', desc: '查看网络接口' },
      { cmd: 'adb shell dumpsys wifi', desc: '查看 WiFi 状态' },
      { cmd: 'adb shell ping 8.8.8.8', desc: '测试外网连通' },
      { cmd: 'adb shell getprop | grep dns', desc: '查看 DNS 配置' },
    ],
  },
  {
    id: 'navigation',
    title: '导航异常',
    icon: Stethoscope,
    steps: [
      { cmd: 'adb logcat | grep -i "navigation"', desc: '导航日志' },
      { cmd: 'adb logcat | grep -i "localization"', desc: '定位日志' },
      { cmd: 'adb logcat | grep -i "map"', desc: '地图日志' },
      { cmd: 'adb logcat | grep -i "planner"', desc: '路径规划日志' },
    ],
  },
  {
    id: 'lidar',
    title: '雷达异常',
    icon: Stethoscope,
    steps: [
      { cmd: 'adb shell ls /dev | grep tty', desc: '查看串口设备' },
      { cmd: 'adb shell dmesg | grep tty', desc: '查看内核串口日志（需root）' },
      { cmd: 'adb logcat | grep -i "lidar"', desc: '雷达日志' },
    ],
  },
  {
    id: 'chassis',
    title: '底盘不动',
    icon: Stethoscope,
    steps: [
      { cmd: 'adb logcat | grep -i "chassis"', desc: '底盘日志' },
      { cmd: 'adb logcat | grep -i "motor"', desc: '电机日志' },
      { cmd: 'adb logcat | grep -i "can"', desc: 'CAN 总线日志' },
    ],
  },
  {
    id: 'battery',
    title: '电池异常',
    icon: Battery,
    steps: [
      { cmd: 'adb shell dumpsys battery', desc: '查看电池状态' },
      { cmd: 'adb logcat | grep -i "battery"', desc: '电池日志' },
    ],
  },
  {
    id: 'save-logs',
    title: '保存现场日志',
    icon: FileText,
    steps: [
      { cmd: 'adb logcat -d > logcat.txt', desc: '导出系统日志' },
      { cmd: 'adb shell dumpsys battery > battery.txt', desc: '导出电池信息' },
      { cmd: 'adb shell ifconfig wlan0 > network.txt', desc: '导出网络信息' },
    ],
  },
  {
    id: 'screen',
    title: '屏幕触控失灵',
    icon: Monitor,
    steps: [
      { cmd: 'adb shell wm size', desc: '确认屏幕分辨率' },
      { cmd: 'adb shell wm density', desc: '确认屏幕密度' },
      { cmd: 'adb shell input tap 512 300', desc: '测试触控响应（点击中心）' },
      { cmd: 'adb shell getevent -l', desc: '查看触控事件流' },
      { cmd: 'adb shell dumpsys display', desc: '查看显示状态' },
    ],
  },
  {
    id: 'app-crash',
    title: '应用崩溃',
    icon: Package,
    steps: [
      { cmd: 'adb logcat -d *:E | grep -i "fatal\\|crash\\|anr"', desc: '查看崩溃日志' },
      { cmd: 'adb shell dumpsys activity activities', desc: '查看 Activity 栈' },
      { cmd: 'adb shell am force-stop <包名>', desc: '强制停止应用' },
      { cmd: 'adb shell monkey -p <包名> -c android.intent.category.LAUNCHER 1', desc: '重新启动应用' },
      { cmd: 'adb bugreport > bugreport.zip', desc: '导出完整 bug 报告' },
    ],
  },
  {
    id: 'slow',
    title: '系统卡顿',
    icon: Cpu,
    steps: [
      { cmd: 'adb shell top -n 1', desc: '查看 CPU 和内存占用' },
      { cmd: 'adb shell cat /proc/meminfo', desc: '查看内存详情' },
      { cmd: 'adb shell df -h', desc: '查看磁盘空间' },
      { cmd: 'adb shell ps -A -o PID,NAME,%CPU,%MEM | sort -k3 -rn | head -10', desc: '找出占用最高的进程' },
      { cmd: 'adb shell dumpsys meminfo', desc: '查看内存分配详情' },
    ],
  },
  {
    id: 'camera',
    title: '相机/深度相机异常',
    icon: Stethoscope,
    steps: [
      { cmd: 'adb shell ls /dev/video*', desc: '查看视频设备' },
      { cmd: 'adb shell lsusb', desc: '查看 USB 设备（相机通常为 USB 设备）' },
      { cmd: 'adb logcat | grep -i "camera\\|rgbd\\|depth"', desc: '查看相机相关日志' },
      { cmd: 'adb shell am start -n com.pudutech.rgbdviewer/.MainActivity', desc: '打开深度相机查看器' },
    ],
  },
  {
    id: 'audio',
    title: '音频异常',
    icon: Stethoscope,
    steps: [
      { cmd: 'adb shell dumpsys audio', desc: '查看音频系统状态' },
      { cmd: 'adb shell settings get system volume_music', desc: '查看媒体音量' },
      { cmd: 'adb logcat | grep -i "audio\\|sound\\|speaker"', desc: '查看音频日志' },
      { cmd: 'adb shell am start -a android.intent.action.VIEW -d file:///sdcard/test.mp3 -t audio/mp3', desc: '测试音频播放' },
    ],
  },
  {
    id: 'position',
    title: '定位不准',
    icon: Network,
    steps: [
      { cmd: 'adb logcat | grep -i "localization\\|position\\|slam"', desc: '查看定位日志' },
      { cmd: 'adb logcat | grep -i "lidar\\|scan\\|match"', desc: '查看雷达匹配日志' },
      { cmd: 'adb shell ls /sdcard/pudu/maps/', desc: '查看地图文件' },
      { cmd: 'adb shell dumpsys sensorservice', desc: '查看传感器状态' },
    ],
  },
  {
    id: 'map-files',
    title: '地图文件管理',
    icon: Folder,
    steps: [
      { cmd: 'adb shell ls -l /sdcard/pudu/map/', desc: '列出设备上的实际地图文件名；先执行此命令，再复制需要操作的文件名' },
      { cmd: 'adb pull /sdcard/pudu/map/<地图文件名> ./', desc: '将指定地图拉取到当前电脑目录' },
      { cmd: 'adb push <本地地图路径> /sdcard/pudu/map/', desc: '推送地图到设备；同名文件会被覆盖' },
      { cmd: 'adb shell rm -rf /sdcard/pudu/map/<地图文件名>', desc: '删除指定地图；执行前重新确认文件名，删除后不可恢复' },
    ],
  },
];

// ── 设备特定信息 ────────────────────────────────────────────
export const DEVICE_SPECIFIC_INFO = [
  {
    id: 'sdcard-structure',
    title: '/sdcard 顶层结构',
    icon: Folder,
    items: [
      { name: 'pudu/', desc: '机器人核心业务数据（22 个子目录）' },
      { name: 'PuduRobotLog/', desc: '机器人运行日志（含 EKF）' },
      { name: 'PuduRobotMap/', desc: 'Atlas、地图、标定与定位数据' },
      { name: 'pd_app_run_log/', desc: 'App 运行日志' },
      { name: 'pdconfig/', desc: '机器人配置（含 lease）' },
      { name: 'Android/、DCIM/、Download/', desc: '标准 Android 应用与媒体目录' },
      { name: 'NavigationPage/、mapify/、msc/', desc: '导航、地图与语音相关目录' },
    ],
  },
  {
    id: 'pudu-core-directories',
    title: '/sdcard/pudu 核心目录',
    icon: Folder,
    items: [
      { name: 'log/', desc: '运行日志（702 个 *.pdlog 文件）' },
      { name: 'config/', desc: 'XML、CFG、JSON 配置与备份' },
      { name: 'map/', desc: '地图文件（*.pdmap，如 eW16.pdmap）' },
      { name: 'data/', desc: '15 类传感器标定与采集数据' },
      { name: 'static_map/、compatmap/', desc: '静态与兼容地图数据' },
      { name: 'files/、dmesg/、error_marker_list/', desc: '暂存文件、内核日志与错误标记' },
      { name: 'lidar_mapping/、rgbd_drop_data/、_rgbd_sensor_/', desc: '建图与 RGBD 传感器数据' },
      { name: 'auto_dock_data/、music/、netDownload/、remote/', desc: '充电、语音、下载与远程数据' },
    ],
  },
  {
    id: 'other-robot-directories',
    title: '其他机器人相关目录',
    icon: Folder,
    items: [
      { name: '/sdcard/PuduRobotMap/ATLAS_DATA/', desc: 'Atlas 地图数据' },
      { name: '/sdcard/PuduRobotMap/MAP_DATA/', desc: '地图数据' },
      { name: '/sdcard/PuduRobotMap/calibrate/', desc: '标定数据' },
      { name: '/sdcard/PuduRobotMap/locate_map.*', desc: '定位地图（data、ekf、slip 多格式）' },
      { name: '/sdcard/PuduRobotMap/rgbd.json', desc: 'RGBD 配置' },
      { name: '/sdcard/PuduRobotMap/scheduling_config.yaml', desc: '调度配置' },
      { name: '/sdcard/PuduRobotLog/EKF/', desc: 'EKF 相关日志' },
      { name: '/sdcard/pdconfig/lease/', desc: '租赁与授权配置' },
    ],
  },
  {
    id: 'pudu-apps',
    title: '普渡应用列表',
    icon: Package,
    items: [
      { name: 'com.pudutech.pdrobot', desc: '机器人主程序' },
      { name: 'com.pudutech.mirsdk', desc: '导航 SDK' },
      { name: 'com.pudutech.remotemaintenance', desc: '远程维护' },
      { name: 'com.pudutech.mapify', desc: '地图应用' },
      { name: 'com.pudutech.rgbdviewer', desc: '深度相机查看器' },
      { name: 'com.pudutech.factory_test', desc: '工厂测试' },
    ],
  },
  {
    id: 'network-info',
    title: '网络信息摘要',
    icon: Network,
    items: [
      { name: 'IP', desc: '192.168.51.143/24' },
      { name: 'DNS1', desc: '240e:3b7:4e4e:bc10::1' },
      { name: 'DNS2', desc: '192.168.51.1' },
      { name: '监听端口', desc: '8080(pdrobot)、16888(mirsdk)、5555(adbd)' },
    ],
  },
  {
    id: 'coordinates',
    title: '坐标系说明',
    icon: MousePointer,
    text: '原点(0,0) 在左上角\nX 轴向右 → Y 轴向下 ↓\n屏幕分辨率：1024 × 600\n左上角：(0, 0)\n右下角：(1023, 599)\n中心点：(512, 300)',
  },
];

// 文件管理器中叠加在实时目录上的文档说明
export const ADB_FILE_NOTES = {
  '/sdcard/pudu': '普渡机器人核心数据目录，共 22 个业务子目录',
  '/sdcard/PuduRobotLog': '机器人运行日志，包含 EKF 子目录',
  '/sdcard/PuduRobotMap': '机器人地图数据：ATLAS_DATA / MAP_DATA / calibrate / locate_map.*',
  '/sdcard/pdconfig': '机器人配置目录，包含 lease 子目录',
  '/sdcard/pudu/log': '运行日志，约 702 个 *.pdlog 文件，平铺无子目录',
  '/sdcard/pudu/config': 'XML / CFG / JSON 配置文件及自动备份',
  '/sdcard/pudu/map': '地图文件：*.pdmap、QTE=.pdmap、defaultmap 等',
  '/sdcard/pudu/data': '传感器标定与采集数据，包含 15 类传感器目录',
  '/sdcard/pudu/static_map': '静态地图，包含 depth / map / pose',
  '/sdcard/PuduRobotMap/ATLAS_DATA': 'Atlas 地图数据',
  '/sdcard/PuduRobotMap/MAP_DATA': '地图数据',
  '/sdcard/PuduRobotMap/calibrate': '标定数据',
  '/sdcard/PuduRobotMap/map': '当前为空的地图目录',
  '/sdcard/PuduRobotLog/EKF': 'EKF（扩展卡尔曼滤波）相关日志',
  '/sdcard/pdconfig/lease': '租赁与授权配置',
};

// 未连接设备时展示的文档参考树；连接设备后由 /adb/ls 返回的真实目录替换。
export const ADB_DOCUMENT_TREE = {
  path: '/sdcard',
  type: 'dir',
  children: [
    {
      name: 'pudu', type: 'dir', children: [
        { name: 'log', type: 'dir' },
        { name: 'config', type: 'dir' },
        { name: 'map', type: 'dir', children: [
          { name: '*.pdmap', type: 'file' },
          { name: 'QTE=.pdmap', type: 'file' },
          { name: 'defaultmap', type: 'file' },
        ] },
        { name: 'data', type: 'dir', children: [
          { name: '3dlidar', type: 'dir' },
          { name: 'center_rgbd', type: 'dir' },
          { name: 'down_rgbd', type: 'dir' },
          { name: 'front_camera', type: 'dir' },
          { name: 'front_fish_camera', type: 'dir' },
          { name: 'laser', type: 'dir' },
          { name: 'ld_laser', type: 'dir' },
          { name: 'left_fish_camera', type: 'dir' },
          { name: 'left_rgbd', type: 'dir' },
          { name: 'rear_camera', type: 'dir' },
          { name: 'rear_fish_camera', type: 'dir' },
          { name: 'reflector', type: 'dir' },
          { name: 'right_fish_camera', type: 'dir' },
          { name: 'right_rgbd', type: 'dir' },
          { name: 'ultrasonic', type: 'dir' },
          { name: 'simple.xml', type: 'file' },
        ] },
        { name: 'static_map', type: 'dir', children: [
          { name: 'depth', type: 'dir' },
          { name: 'map', type: 'dir' },
          { name: 'pose', type: 'dir' },
        ] },
        { name: 'files', type: 'dir' },
        { name: 'lidar_mapping', type: 'dir' },
        { name: 'rgbd_drop_data', type: 'dir' },
        { name: '_rgbd_sensor_', type: 'dir' },
        { name: 'auto_dock_data', type: 'dir' },
        { name: 'check_tool', type: 'dir' },
        { name: 'cipher', type: 'dir' },
        { name: 'compat_backup', type: 'dir' },
        { name: 'compatmap', type: 'dir' },
        { name: 'dmesg', type: 'dir' },
        { name: 'error_marker_list', type: 'dir' },
        { name: 'music', type: 'dir' },
        { name: 'netDownload', type: 'dir' },
        { name: 'oil', type: 'dir' },
        { name: 'oss_record', type: 'dir' },
        { name: 'remote', type: 'dir' },
      ],
    },
    { name: 'PuduRobotLog', type: 'dir', children: [{ name: 'EKF', type: 'dir' }] },
    { name: 'PuduRobotMap', type: 'dir', children: [
      { name: 'ATLAS_DATA', type: 'dir' },
      { name: 'MAP_DATA', type: 'dir' },
      { name: 'calibrate', type: 'dir' },
      { name: 'map', type: 'dir' },
      { name: 'locate_map.data', type: 'file' },
      { name: 'locate_map.ekf', type: 'file' },
      { name: 'locate_map.slip', type: 'file' },
      { name: 'rgbd.json', type: 'file' },
      { name: 'scheduling_config.yaml', type: 'file' },
    ] },
    { name: 'pdconfig', type: 'dir', children: [{ name: 'lease', type: 'dir' }] },
    { name: 'pd_app_run_log', type: 'dir' },
    { name: 'data', type: 'dir' },
    { name: 'Android', type: 'dir' },
    { name: 'DCIM', type: 'dir' },
    { name: 'Pictures', type: 'dir' },
    { name: 'Download', type: 'dir' },
    { name: 'Music', type: 'dir' },
    { name: 'NavigationPage', type: 'dir' },
    { name: 'OSSLog', type: 'dir' },
    { name: 'air', type: 'dir' },
    { name: 'commerce', type: 'dir' },
    { name: 'amap', type: 'dir' },
    { name: 'mapify', type: 'dir' },
    { name: 'msc', type: 'dir' },
    { name: 'gokeyboard', type: 'dir' },
    { name: '.goproduct', type: 'dir' },
    { name: 'voice_download', type: 'dir' },
  ],
};

// ── 日志过滤关键词 ──────────────────────────────────────────
export const LOG_FILTER_KEYWORDS = [
  { keyword: 'navigation', desc: '导航日志' },
  { keyword: 'localization', desc: '定位日志' },
  { keyword: 'map', desc: '地图日志' },
  { keyword: 'planner', desc: '路径规划日志' },
  { keyword: 'lidar', desc: '雷达日志' },
  { keyword: 'chassis', desc: '底盘日志' },
  { keyword: 'motor', desc: '电机日志' },
  { keyword: 'battery', desc: '电池日志' },
];

// ── 测试总结 ────────────────────────────────────────────────
export const TEST_SUMMARY = {
  testDate: '2026-06-01',
  deviceModel: 'NanoPC-T4 (RK3399)',
  androidVersion: '8.1.0',
  categories: [
    { name: '连接管理', total: 5, passed: 5, root: 0, untested: 0 },
    { name: '设备信息', total: 16, passed: 15, root: 1, untested: 0 },
    { name: '网络诊断', total: 6, passed: 6, root: 0, untested: 0 },
    { name: '应用管理', total: 9, passed: 7, root: 0, untested: 2 },
    { name: '日志与调试', total: 6, passed: 6, root: 0, untested: 0 },
    { name: '文件操作', total: 8, passed: 8, root: 0, untested: 0 },
    { name: '地图管理', total: 3, passed: 0, root: 0, untested: 3 },
    { name: '屏幕与输入', total: 6, passed: 6, root: 0, untested: 0 },
    { name: '系统控制', total: 4, passed: 0, root: 0, untested: 4 },
  ],
};

// 计算总命令数
TEST_SUMMARY.totalCommands = TEST_SUMMARY.categories.reduce((s, c) => s + c.total, 0);
TEST_SUMMARY.totalPassed = TEST_SUMMARY.categories.reduce((s, c) => s + c.passed, 0);
TEST_SUMMARY.totalRoot = TEST_SUMMARY.categories.reduce((s, c) => s + c.root, 0);
TEST_SUMMARY.totalUntested = TEST_SUMMARY.categories.reduce((s, c) => s + c.untested, 0);
