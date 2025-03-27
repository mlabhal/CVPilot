// src/hooks/useTabChangeDetection.ts
import { useState, useEffect } from 'react';

interface TabChangeOptions {
  enabled: boolean;
  warningDuration?: number; // Durée d'affichage de l'avertissement en ms
  onSecondTabChange?: () => void; // Fonction à appeler après le second changement d'onglet
}

interface TabChangeResult {
  tabChangeCount: number;
  showWarning: boolean;
  resetTabChangeCount: () => void;
}

export function useTabChangeDetection({
  enabled,
  warningDuration = 3000,
  onSecondTabChange
}: TabChangeOptions): TabChangeResult {
  const [tabChangeCount, setTabChangeCount] = useState<number>(0);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  
  const resetTabChangeCount = () => setTabChangeCount(0);
  
  // Détecter le changement d'onglet
  useEffect(() => {
    if (!enabled) return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // L'utilisateur a changé d'onglet
        const newCount = tabChangeCount + 1;
        setTabChangeCount(newCount);
        
        if (newCount === 1) {
          // Premier changement: avertissement
          setShowWarning(true);
          setTimeout(() => setShowWarning(false), warningDuration);
        } else if (newCount > 1 && onSecondTabChange) {
          // Deuxième changement: action configurée
          onSecondTabChange();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, tabChangeCount, warningDuration, onSecondTabChange]);

  return { tabChangeCount, showWarning, resetTabChangeCount };
}