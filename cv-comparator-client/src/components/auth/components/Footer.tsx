import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Twitter, Linkedin, Github } from 'lucide-react';
import logoImage from '../../../../public/logo.svg';

const Footer: React.FC = () => {
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
  
  return (
    <footer className="bg-gray-900 text-gray-400" style={{ 
      width: '100vw',
      marginLeft: 'calc(-50vw + 50%)',
      boxSizing: 'border-box',
      position: 'relative',
      left: 0
    }}>
      <div className="w-full max-w-7xl mx-auto py-12 px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-6">
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
                CV<span className="font-extrabold">Pilot</span>
              </span>
            </div>
            <p className="mb-6">
              La plateforme d'analyse de CV qui révolutionne le processus de recrutement grâce à l'intelligence artificielle.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-blue-400 transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors">
                <Github size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-white text-lg font-semibold mb-6">Navigation</h3>
            <ul className="space-y-3">
              <li><button onClick={() => handleNavigation('/home')} className="hover:text-blue-400 transition-colors">Accueil</button></li>
              <li><button onClick={() => handleNavigation('#features')} className="hover:text-blue-400 transition-colors">Fonctionnalités</button></li>
              <li><button onClick={() => handleNavigation('#how-it-works')} className="hover:text-blue-400 transition-colors">Comment ça marche</button></li>
              <li><button onClick={() => handleNavigation('#testimonials')} className="hover:text-blue-400 transition-colors">Témoignages</button></li>
              <li><button onClick={() => handleNavigation('#pricing')} className="hover:text-blue-400 transition-colors">Tarifs</button></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white text-lg font-semibold mb-6">Légal</h3>
            <ul className="space-y-3">
              <li><a href="#" className="hover:text-blue-400 transition-colors">Conditions d'utilisation</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Politique de confidentialité</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Cookies</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Mentions légales</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white text-lg font-semibold mb-6">Contact</h3>
            <ul className="space-y-3">
              <li>support@cvpilot.ma</li>
              <li>+212 6 69 xx xx xx</li>
              <li>Rue El Kadi Iass - Maarif - Casablanca</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 mt-12 text-center">
          <p>&copy; {new Date().getFullYear()} CVAnalyzer. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;