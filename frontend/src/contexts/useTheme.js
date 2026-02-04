import { useContext } from 'react';
import ThemeContext from './ThemeContext.jsx';

export function useTheme() {
  // Always return the context; it's a no-op provider now.
  return useContext(ThemeContext);
}
