const PREFIXES = {
  2: '0b',
  8: '0o',
  10: '',
  16: '0x',
};

const PATTERNS = {
  2: /^[01]+$/,
  8: /^[0-7]+$/,
  10: /^\d+$/,
  16: /^[0-9a-f]+$/i,
};

export function convertBase(value, fromBase) {
  const normalized = String(value).trim();
  if (!PREFIXES[fromBase] || !PATTERNS[fromBase].test(normalized)) {
    throw new Error('输入的数值与所选进制不匹配');
  }

  const bigintValue = BigInt(`${PREFIXES[fromBase]}${normalized}`);
  return {
    bin: bigintValue.toString(2),
    oct: bigintValue.toString(8),
    dec: bigintValue.toString(10),
    hex: bigintValue.toString(16).toUpperCase(),
  };
}
