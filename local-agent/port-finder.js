/**
 * 端口探测模块
 * 查找可用端口，避免与 adb server 冲突
 */
import { createServer } from 'net';

// 默认端口（避免使用 5037，那是 adb server 默认端口）
const DEFAULT_PORT = 5038;
const FALLBACK_PORTS = [5039, 5040, 12553, 12554, 12555];

/**
 * 检查端口是否可用
 * @param {number} port - 端口号
 * @returns {Promise<boolean>} 是否可用
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

/**
 * 查找可用端口
 * @param {number} preferredPort - 首选端口
 * @returns {Promise<number>} 可用端口号
 */
export async function findAvailablePort(preferredPort = DEFAULT_PORT) {
  // 先尝试首选端口
  if (await isPortAvailable(preferredPort)) {
    console.log(`[端口] 使用首选端口: ${preferredPort}`);
    return preferredPort;
  }

  console.warn(`[端口] 首选端口 ${preferredPort} 被占用，尝试备用端口...`);

  // 尝试备用端口
  for (const port of FALLBACK_PORTS) {
    if (await isPortAvailable(port)) {
      console.log(`[端口] 使用备用端口: ${port}`);
      return port;
    }
  }

  // 随机分配
  console.warn('[端口] 所有备用端口都被占用，使用随机端口');
  return 0;
}

export { DEFAULT_PORT, FALLBACK_PORTS };
