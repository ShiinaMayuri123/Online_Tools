import assert from 'node:assert/strict';
import test from 'node:test';
import { convertBase } from './baseConverter.js';

test('按选择的进制解析大整数', () => {
  assert.deepEqual(convertBase('1010', 2), { bin: '1010', oct: '12', dec: '10', hex: 'A' });
  assert.deepEqual(convertBase('FF', 16), { bin: '11111111', oct: '377', dec: '255', hex: 'FF' });
});

test('拒绝与进制不匹配的输入', () => {
  assert.throws(() => convertBase('102', 2));
  assert.throws(() => convertBase('8', 8));
});
