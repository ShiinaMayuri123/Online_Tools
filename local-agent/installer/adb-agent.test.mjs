import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const script = await readFile(new URL('./adb-agent.iss', import.meta.url), 'utf8');
const protocolLine = script
  .split(/\r?\n/)
  .find((line) => line.includes('pudu-agent\\shell\\open\\command'));

test('Inno Setup protocol command uses doubled quotes', () => {
  assert.equal(
    protocolLine,
    String.raw`Root: HKCU; Subkey: "Software\Classes\pudu-agent\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" --protocol-start --no-browser ""%1"""`,
  );
  assert.doesNotMatch(protocolLine, /\\"/);
});
