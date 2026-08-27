import { useState } from 'react';
import { THEMES } from '../config/theme';
import { ThemeContext } from './themeContextStore';

/**
 * ThemeContext
 * 创建一个 React Context，用于在整个应用中共享主题状态。
 * 主题选择会持久化到 localStorage。
 */
/**
 * ThemeProvider 组件
 * 用于包裹整个应用，提供主题状态和切换主题的方法。
 */
export const ThemeProvider = ({ children }) => {
    const [themeKey, setThemeKey] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved && THEMES[saved] ? saved : 'slate';
    });

    const handleSetThemeKey = (key) => {
        setThemeKey(key);
        localStorage.setItem('theme', key);
    };

    return (
        <ThemeContext.Provider value={{
            themeKey,
            theme: THEMES[themeKey],
            setThemeKey: handleSetThemeKey
        }}>
            {children}
        </ThemeContext.Provider>
    );
};
