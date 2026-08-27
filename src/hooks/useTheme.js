import { useContext } from 'react';
import { ThemeContext } from '../contexts/themeContextStore';

export const useTheme = () => useContext(ThemeContext);
