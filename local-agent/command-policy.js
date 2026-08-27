const FORBIDDEN_SHELL_CHARACTERS = /[;&<>$`]/;
const READ_ONLY_DIRECT_COMMANDS = new Set(['devices', 'version', 'get-state', 'get-serialno', 'wait-for-device']);
const READ_ONLY_SHELL_COMMANDS = new Set(['ls', 'cat', 'getprop', 'df', 'dumpsys', 'uptime', 'ps', 'top', 'id', 'which', 'du', 'lsusb', 'netstat', 'getevent', 'ping']);
const READ_ONLY_PM_ACTIONS = new Set(['list', 'path', 'dump']);
const READ_ONLY_PIPE_COMMANDS = new Set(['grep', 'sort', 'head']);

function isReadOnlyShellSegment(segment, allowPipeCommand) {
  const [shellCommand, ...shellArgs] = segment;

  if (READ_ONLY_SHELL_COMMANDS.has(shellCommand)) return true;
  if (allowPipeCommand && READ_ONLY_PIPE_COMMANDS.has(shellCommand)) return true;
  if (shellCommand === 'pm') return READ_ONLY_PM_ACTIONS.has(shellArgs[0]);
  if (shellCommand === 'date') return shellArgs.length === 0;
  if (shellCommand === 'logcat') return !shellArgs.some(arg => arg === '-c' || arg === '--clear');
  if (shellCommand === 'dmesg') return !shellArgs.some(arg => arg === '-c' || arg === '--clear');
  if (shellCommand === 'wm') return ['size', 'density'].includes(shellArgs[0]);
  if (shellCommand === 'settings') return shellArgs[0] === 'get';
  if (shellCommand === 'ifconfig') return shellArgs.length <= 1;
  if (shellCommand === 'ip') return ['addr', 'link', 'route', 'neigh'].includes(shellArgs[0]) && shellArgs.includes('show');
  return false;
}

function isReadOnlyShellCommand(args) {
  const segments = [[]];
  for (const arg of args.slice(2)) {
    if (arg === '|') segments.push([]);
    else segments.at(-1).push(arg);
  }
  return segments.every((segment, index) => segment.length > 0 && isReadOnlyShellSegment(segment, index > 0));
}

export function parseAdbCommand(command) {
  if (typeof command !== 'string' || !command.trim()) throw new Error('命令不能为空');

  const args = [];
  let value = '';
  let quote = null;

  for (const char of command.trim()) {
    if (quote) {
      if (char === quote) quote = null;
      else value += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
    } else if (/\s/.test(char)) {
      if (value) {
        args.push(value);
        value = '';
      }
    } else {
      value += char;
    }
  }

  if (quote) throw new Error('命令引号未闭合');
  if (value) args.push(value);
  if (args[0]?.toLowerCase() !== 'adb') throw new Error('只允许执行 adb 命令');
  return args;
}

export function isAdbCommandSafe(command) {
  if (typeof command !== 'string' || FORBIDDEN_SHELL_CHARACTERS.test(command)) return false;
  try {
    const args = parseAdbCommand(command);
    if (args[1] === 'reboot' && args[2] === 'recovery') return false;
    return !args.includes('|') || (args[1] === 'shell' && isReadOnlyShellCommand(args.map(arg => arg.toLowerCase())));
  } catch {
    return false;
  }
}

export function requiresAdbConfirmation(command) {
  const args = parseAdbCommand(command).map((arg) => arg.toLowerCase());
  const direct = args[1] || '';

  if (READ_ONLY_DIRECT_COMMANDS.has(direct)) return false;
  if (direct !== 'shell') return true;
  return !isReadOnlyShellCommand(args);
}
