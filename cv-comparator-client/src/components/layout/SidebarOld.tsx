import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Search, FileQuestion, LogOut } from 'lucide-react';
import logoImage from '../../../public/logo.svg';

interface SidebarProps {
  isMenuCollapsed: boolean;
  setIsMenuCollapsed: (value: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMenuCollapsed, setIsMenuCollapsed }) => {
  // S'assurer que la sidebar est réduite par défaut au chargement
  useEffect(() => {
    setIsMenuCollapsed(true);
  }, []);
  
  const handleMouseEnter = () => {
    setIsMenuCollapsed(false);
  };

  const handleMouseLeave = () => {
    setIsMenuCollapsed(true);
  };
  
  // Fonction de déconnexion
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    localStorage.removeItem('userName');
    window.location.href = '/home';
  };

  return (
    <div 
      className={`fixed left-0 top-0 h-screen ${isMenuCollapsed ? 'w-26' : 'w-56'} bg-transparent backdrop-blur-[2px] shadow-xl z-50 transition-all duration-300 flex flex-col`}
      style={{ 
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.2), rgba(79, 70, 229, 0.2))'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Logo en haut du menu latéral */}
      <div className="px-3 py-4 flex items-center mt-2">
        <Link to="/home" className={`flex items-center ${isMenuCollapsed ? 'justify-center' : 'gap-2'}`}>
          <div className="bg-white/20 p-1 rounded-md">
            <img 
              src={logoImage} 
              alt="CV Pilot Logo" 
              className="h-10 w-auto" 
            />
          </div>
          {!isMenuCollapsed && <span className="text-lg font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>CV Pilot</span>}
        </Link>
      </div>
      
      {/* Ligne de séparation */}
      <div className="border-t border-white/10 w-full my-2"></div>
      
      {/* Menu de navigation principal */}
      <div className="flex flex-col space-y-2 px-3 py-4 mt-4">
        <Link 
          to="/" 
          className="flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-white/10 transition-all duration-300"
          title={isMenuCollapsed ? "CV Upload" : ""}
        >
          <Upload className="h-5 w-5 text-white" />
          {!isMenuCollapsed && <span className="font-medium">CV Upload</span>}
        </Link>
        <Link 
          to="/search" 
          className="flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-white/10 transition-all duration-300"
          title={isMenuCollapsed ? "CV Search" : ""}
        >
          <Search className="h-5 w-5 text-white" />
          {!isMenuCollapsed && <span className="font-medium">CV Search</span>}
        </Link>
        <Link 
          to="/quiz" 
          className="flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-white/10 transition-all duration-300"
          title={isMenuCollapsed ? "Quiz" : ""}
        >
          <FileQuestion className="h-5 w-5 text-white" />
          {!isMenuCollapsed && <span className="font-medium">Quiz</span>}
        </Link>
      </div>
      
      {/* Espacement pour pousser le bouton déconnexion vers le bas */}
      <div className="flex-grow"></div>
      
      {/* Ligne de séparation avant le bouton déconnexion */}
      <div className="border-t border-white/10 w-full my-2"></div>
      
      {/* Bouton déconnexion en bas du sidebar */}
      <div className="px-3 pb-8">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-white/10 transition-all duration-300"
          title={isMenuCollapsed ? "Déconnexion" : ""}
        >
          <LogOut className="h-5 w-5 text-white" />
          {!isMenuCollapsed && <span className="font-medium">Déconnexion</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;