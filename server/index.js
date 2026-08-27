/**
 * 已弃用：旧服务通过 Shell 执行任意 ADB 命令，不能安全地继续提供。
 *
 * 请改用 `npm run agent` 启动 local-agent。它使用结构化命令解析、服务端
 * 高风险操作确认，并且只监听本机回环地址。
 */
console.error('旧 ADB 服务已弃用，未启动。请运行 npm run agent。');
process.exitCode = 1;
