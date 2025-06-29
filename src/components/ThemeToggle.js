import React from 'react';
import styled from 'styled-components';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.sidebarTextMuted};
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: ${props => props.theme.primary};
  }
`;

function ThemeToggle() {
  const { isDark, toggleTheme, theme } = useTheme();

  return (
    <ToggleButton onClick={toggleTheme} theme={theme} title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </ToggleButton>
  );
}

export default ThemeToggle;