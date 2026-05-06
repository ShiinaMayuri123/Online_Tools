import { useState, useCallback } from 'react';

/**
 * useClipboard 自定义 Hook
 * 封装剪贴板复制逻辑，统一管理复制状态和自动重置。
 *
 * @param {number} resetDelay - 复制成功后状态重置的延迟时间（毫秒），默认 2000
 * @returns {{ copiedKey: string, copy: (text: string, key?: string) => void }}
 *   - copiedKey: 当前已复制的标识符，未复制时为空字符串
 *   - copy: 执行复制的函数，key 参数用于区分多个复制按钮的状态
 */
const useClipboard = (resetDelay = 2000) => {
  const [copiedKey, setCopiedKey] = useState('');

  const copy = useCallback((text, key = 'default') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), resetDelay);
  }, [resetDelay]);

  return { copiedKey, copy };
};

export default useClipboard;
