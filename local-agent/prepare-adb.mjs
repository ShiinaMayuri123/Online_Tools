import { execSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { basename, dirname, join } from 'path';

mkdirSync('dist', { recursive: true });

let adbPath = '';
try {
  adbPath = execSync('where adb', { encoding: 'utf8' }).split(/\r?\n/)[0].trim();
} catch {
  // 允许用户把 adb.exe 直接放进 local-agent 目录后再打包
}

if (!adbPath || !existsSync(adbPath)) {
  adbPath = join(process.cwd(), 'adb.exe');
}

if (!existsSync(adbPath)) {
  console.error('未找到 adb.exe，请安装 Android Platform Tools，或把 adb.exe 放到 local-agent 目录');
  process.exit(1);
}

copyFileSync(adbPath, 'adb.exe');
copyFileSync(adbPath, join('dist', 'adb.exe'));

for (const dll of ['AdbWinApi.dll', 'AdbWinUsbApi.dll']) {
  const dllPath = join(dirname(adbPath), dll);
  if (existsSync(dllPath)) copyFileSync(dllPath, join('dist', basename(dllPath)));
}

console.log(`已准备 ADB: ${adbPath}`);
