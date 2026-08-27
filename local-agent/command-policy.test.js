import assert from 'node:assert/strict';
import test from 'node:test';
import { isAdbCommandSafe, parseAdbCommand, requiresAdbConfirmation } from './command-policy.js';

test('保留带空格的 Windows 拉取路径', () => {
  assert.deepEqual(
    parseAdbCommand('adb pull /sdcard/pudu/log/a.txt "D:\\Logs Folder"'),
    ['adb', 'pull', '/sdcard/pudu/log/a.txt', 'D:\\Logs Folder']
  );
  assert.equal(isAdbCommandSafe('adb pull /sdcard/pudu/log/a.txt "D:\\Logs Folder"'), true);
});

test('拒绝 shell 注入和未闭合引号', () => {
  assert.equal(isAdbCommandSafe('adb shell ls; rm -f /sdcard/pudu/log/a.txt'), false);
  assert.equal(isAdbCommandSafe('adb shell ls "unterminated'), false);
  assert.equal(isAdbCommandSafe('adb logcat | grep fatal'), false);
  assert.equal(isAdbCommandSafe('adb shell rm -f /sdcard/pudu/log/a.txt | grep failed'), false);
});

test('只读命令不需要确认，写操作必须确认', () => {
  assert.equal(requiresAdbConfirmation('adb shell ls -l /sdcard/pudu/log'), false);
  assert.equal(requiresAdbConfirmation('adb shell pm list packages'), false);
  assert.equal(requiresAdbConfirmation('adb shell logcat -d'), false);
  assert.equal(requiresAdbConfirmation('adb shell logcat -d | grep -i fatal'), false);
  assert.equal(requiresAdbConfirmation('adb shell rm -f /sdcard/pudu/log/a.txt'), true);
  assert.equal(requiresAdbConfirmation('adb install app.apk'), true);
  assert.equal(requiresAdbConfirmation('adb shell logcat -c'), true);
  assert.equal(requiresAdbConfirmation('adb shell date -s 20260827'), true);
});
