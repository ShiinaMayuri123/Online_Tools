import { createContext } from 'react';
import { THEMES } from '../config/theme';

export const ThemeContext = createContext({
  themeKey: 'slate',
  theme: THEMES.slate,
  setThemeKey: () => {},
});
