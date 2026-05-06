import { createContext, useContext, useState } from 'react';
import { THEMES } from '../config/theme';

/**
 * ThemeContext
 * 创建一个 React Context，用于在整个应用中共享主题状态。
 * 主题选择会持久化到 localStorage。
 */
const ThemeContext = createContext({
    themeKey: 'slate',
    theme: THEMES.slate,
    setThemeKey: () => {}
});

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

/**
 * useTheme 自定义 Hook
 * 这是一个语法糖，方便在任何组件中直接调用 useTheme() 来获取当前主题，
 * 而不需要每次都导入 ThemeContext 和 useContext。
 */
export const useTheme = () => useContext(ThemeContext);
