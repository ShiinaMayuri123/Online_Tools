/**
 * ADB 路径检测模块
 * 自动查找用户电脑上的 adb.exe
 */
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

/**
 * 查找 adb 可执行文件路径
 * @returns {string|null} adb 路径，未找到返回 null
 */
export function findAdb() {
  const agentDir = process.pkg ? dirname(process.execPath) : process.cwd();
  const executableDir = dirname(process.execPath);
  const bundledPaths = [
    join(executableDir, 'adb.exe'),
    join(agentDir, 'adb.exe'),
  ];

  for (const p of bundledPaths) {
    if (existsSync(p)) {
      console.log(`[ADB] 使用连接助手目录中的 ADB: ${p}`);
      return p;
    }
  }

  // 1. 检查 PATH 环境变量
  try {
    const adbPath = execSync('where adb', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (adbPath) {
      console.log(`[ADB] 在 PATH 中找到: ${adbPath}`);
      return 'adb';
    }
  } catch {
    // PATH 中未找到，继续检查
  }

  // 2. 检查常见安装路径
  const home = homedir();
  const commonPaths = [
    // Android SDK (Windows)
    join(home, 'AppData', 'Local', 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
    join(home, 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
    // 本机目录（打包时可内置）
    join(agentDir, 'adb.exe'),
    join(agentDir, 'platform-tools', 'adb.exe'),
    // Program Files
    'C:\\Program Files\\Android\\android-sdk\\platform-tools\\adb.exe',
    'C:\\Program Files (x86)\\Android\\android-sdk\\platform-tools\\adb.exe',
    // 用户自定义常见路径
    join(home, 'adb.exe'),
    join(home, 'platform-tools', 'adb.exe'),
  ];

  for (const p of commonPaths) {
    if (existsSync(p)) {
      console.log(`[ADB] 在常见路径找到: ${p}`);
      return p;
    }
  }

  // 3. 未找到
  console.warn('[ADB] 未找到 adb.exe，请确保已安装 Android SDK Platform Tools 并添加到 PATH');
  return null;
}

/**
 * 检查 adb 是否可用
 * @param {string} adbPath - adb 路径
 * @returns {boolean} 是否可用
 */
export function checkAdbAvailable(adbPath) {
  try {
    execSync(`${adbPath} version`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}
