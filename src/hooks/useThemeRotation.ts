import { useEffect } from 'react';

const themes = [
  { primary: '#5B2C87', secondary: '#00C5FF' }, // Purple-Cyan
  { primary: '#DD5228', secondary: '#FBAE52' }, // Pink-Yellow
  { primary: '#73d1d3', secondary: '#badcc3' }, // LightBlue-Green
  { primary: '#2a4dc1', secondary: '#5698e2' }, // Blue-Blue2
  { primary: '#fccd18', secondary: '#eb7195' }, // Green-Orange
  { primary: '#1abea5', secondary: '#96d165' }, // Green-Green2
  
];

export const useThemeRotation = (trigger: number, playerCount: number = 5) => {
  useEffect(() => {
    // Only use themes up to the player count
    const availableThemes = themes.slice(0, playerCount);
    const currentTheme = availableThemes[trigger % availableThemes.length];
    const root = document.documentElement;
    
    root.style.setProperty('--current-theme-primary', currentTheme.primary);
    root.style.setProperty('--current-theme-secondary', currentTheme.secondary);
    
    // Update game colors to match current theme
    root.style.setProperty('--game-primary', currentTheme.primary);
    root.style.setProperty('--game-secondary', currentTheme.secondary);
    root.style.setProperty('--accent', currentTheme.secondary);
  }, [trigger, playerCount]);
};