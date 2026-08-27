import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const packagePath = join(rootDir, 'local-agent', 'package.json');
const manifestPath = join(rootDir, 'public', 'agent-manifest.json');
const agentPackage = JSON.parse(await readFile(packagePath, 'utf8'));
const setupScript = await readFile(join(rootDir, 'local-agent', 'setup.ps1'), 'utf8');

if (!setupScript.includes(`$AgentVersion = '${agentPackage.version}'`)) {
  throw new Error('local-agent/setup.ps1 的 AgentVersion 必须与 local-agent/package.json 保持一致。');
}

const manifest = {
  latestVersion: agentPackage.version,
  installerUrl: '/downloads/adb-agent-setup.exe',
  fallbackInstallerUrl: '/download-agent.html',
  checksumUrl: '/downloads/SHA256SUMS.txt',
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
