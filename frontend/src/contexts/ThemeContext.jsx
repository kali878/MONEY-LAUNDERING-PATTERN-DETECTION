import { createContext } from 'react';

// Minimal no-op Theme context to keep imports safe; theme switching removed.
const ThemeContext = createContext({
  theme: 'dark',
  setTheme: () => {},
  isDark: true,
  isLight: false,
  themeSaving: false,
});

export const ThemeProvider = ({ children }) => children;

export default ThemeContext;
