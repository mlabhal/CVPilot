// Header Component - Avec correction de la navigation des ancres
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logoImage from '../../../public/logo.svg';

interface HeaderProps {
  backgroundImageUrl?: string;
}

const Header: React.FC<HeaderProps> = ({ backgroundImageUrl }) => {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigation = (path: string) => {
    console.log(`Navigating to: ${path}`);
    
    // Toutes les sections d'ancre sont sur la page d'accueil "/home" et non sur "/"
    if (path.startsWith('#')) {
      // Si nous sommes déjà sur la page d'accueil
      if (location.pathname === '/home') {
        const element = document.querySelector(path);
        if (element) {
          // Calculer la position avec offset pour éviter que le contenu ne soit caché sous le header
          const headerHeight = scrolled ? 80 : 64; // 5rem ou 4rem en pixels
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerHeight;
          
          // Faire défiler jusqu'à la position ajustée
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      } else {
        // Redirection complète vers la page d'accueil avec l'ancre (comme dans le code original)
        window.location.href = '/home' + path;
      }
      return;
    }
    
    // Pour les autres chemins (non-ancres)
    navigate(path);
  };

  // Déterminer le style de l'en-tête en fonction de la page
  const isHomePage = location.pathname === '/home';
  const headerBgStyle = scrolled 
    ? (isHomePage ? 'bg-blue-200 bg-opacity-80' : 'bg-white bg-opacity-70') 
    : 'bg-transparent';
  const headerHeight = scrolled && isHomePage ? '5rem' : '4rem';
  
  return (
    <header 
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? `${headerBgStyle} backdrop-blur-sm shadow-md py-2` : 'bg-transparent py-4'
      }`}
      style={{ 
        backgroundImage: scrolled ? 'none' : `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        height: headerHeight,
        maxHeight: headerHeight
      }}
    >
      <div className="w-full flex items-center px-4">
        <div className="flex items-center gap-2 pl-2 ml-2">
          <img 
            src={logoImage} 
            alt="CV Pilot Logo" 
            className="h-16 w-auto" 
            onClick={() => handleNavigation('/home')}
            style={{ cursor: 'pointer' }}
          />
          <span 
            className="text-xl font-bold text-white"
            onClick={() => handleNavigation('/home')}
            style={{ cursor: 'pointer' }}
          >
            CV Pilot
          </span>
        </div>
        
        <nav className="hidden md:flex space-x-4 lg:space-x-8 items-center ml-auto">
          <button
            onClick={() => handleNavigation('#features')}
            className="text-gray-700 hover:text-indigo-600 transition-colors whitespace-nowrap"
          >
            Fonctionnalités
          </button>
          <button
            onClick={() => handleNavigation('#how-it-works')}
            className="text-gray-700 hover:text-indigo-600 transition-colors whitespace-nowrap"
          >
            Comment ça marche
          </button>
          <button
            onClick={() => handleNavigation('#testimonials')}
            className="text-gray-700 hover:text-indigo-600 transition-colors whitespace-nowrap"
          >
            Témoignages
          </button>
          <button 
            onClick={() => handleNavigation('/login')}
            className={`bg-gradient-to-r ${isHomePage ? 'from-blue-500 to-blue-700' : 'from-indigo-600 to-blue-500'} text-white py-2 px-6 rounded-full hover:shadow-lg transition-all font-medium whitespace-nowrap mr-4`}
          >
            Essayer maintenant
          </button>
        </nav>
        
        <button className="md:hidden text-gray-700 ml-auto mr-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;