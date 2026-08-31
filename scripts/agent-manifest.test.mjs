import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { test } from 'node:test';

const execFileAsync = promisify(execFile);
const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const packagePath = join(rootDir, 'local-agent', 'package.json');
const manifestPath = join(rootDir, 'public', 'agent-manifest.json');
const downloadPagePath = join(rootDir, 'public', 'download-agent.html');

await execFileAsync(process.execPath, [join(rootDir, 'scripts', 'sync-agent-manifest.mjs')]);

const agentPackage = JSON.parse(await readFile(packagePath, 'utf8'));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const downloadPage = await readFile(downloadPagePath, 'utf8');
const releaseUrl = `https://github.com/ShiinaMayuri123/Online_Tools/releases/download/v${agentPackage.version}`;

test('agent manifest uses versioned GitHub Release assets', () => {
  assert.equal(manifest.installerUrl, `${releaseUrl}/adb-agent-setup.exe`);
  assert.equal(manifest.portableUrl, `${releaseUrl}/adb-agent-portable.zip`);
  assert.equal(manifest.checksumUrl, `${releaseUrl}/SHA256SUMS.txt`);
});

test('download page resolves download URLs from the agent manifest', () => {
  assert.match(downloadPage, /data-download-key="installerUrl"/);
  assert.match(downloadPage, /data-download-key="portableUrl"/);
  assert.match(downloadPage, /data-download-key="checksumUrl"/);
  assert.match(downloadPage, /fetch\('\/agent-manifest\.json'/);
});
