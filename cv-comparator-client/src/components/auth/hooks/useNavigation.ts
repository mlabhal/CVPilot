import { useNavigate } from 'react-router-dom';

export const useCustomNavigation = () => {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    console.log(`Navigating to: ${path}`);
    
    if (path.startsWith('#')) {
      const element = document.querySelector(path);
      if (element) {
        // Calculer la hauteur actuelle du header
        const scrolled = window.scrollY > 20;
        const headerHeight = scrolled ? 80 : 64; // 5rem ou 4rem en pixels
        
        // Calculer la position avec offset
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerHeight;
        
        // Faire défiler jusqu'à la position ajustée
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    } else {
      navigate(path);
    }
  };

  return handleNavigation;
};