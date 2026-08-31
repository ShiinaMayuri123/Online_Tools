import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const packagePath = join(rootDir, 'local-agent', 'package.json');
const manifestPath = join(rootDir, 'public', 'agent-manifest.json');
const agentPackage = JSON.parse(await readFile(packagePath, 'utf8'));
const setupScript = await readFile(join(rootDir, 'local-agent', 'setup.ps1'), 'utf8');
const releaseUrl = `https://github.com/ShiinaMayuri123/Online_Tools/releases/download/v${agentPackage.version}`;

if (!setupScript.includes(`$AgentVersion = '${agentPackage.version}'`)) {
  throw new Error('local-agent/setup.ps1 的 AgentVersion 必须与 local-agent/package.json 保持一致。');
}

const manifest = {
  latestVersion: agentPackage.version,
  installerUrl: `${releaseUrl}/adb-agent-setup.exe`,
  portableUrl: `${releaseUrl}/adb-agent-portable.zip`,
  fallbackInstallerUrl: '/download-agent.html',
  checksumUrl: `${releaseUrl}/SHA256SUMS.txt`,
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
