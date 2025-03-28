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
      className={`fixed left-0 top-0 h-screen ${isMenuCollapsed ? 'w-16' : 'w-46'} shadow-xl border-0 backdrop-blur-lg z-50 transition-all duration-300 flex flex-col`}
      style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.1), 0 8px 10px -6px rgba(59, 130, 246, 0.1)'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Logo en haut du menu latéral */}
      <div className="px-3 py-4 flex items-center mt-2">
        <Link to="/" className={`flex items-center ${isMenuCollapsed ? 'justify-center' : 'gap-2'}`}>
          <div className="bg-transparent p-0 rounded-md">
            <img 
              src={logoImage} 
              alt="CV Pilot Logo" 
              className="h-10 w-auto" 
            />
          </div>
          {!isMenuCollapsed && <span className="text-lg font-bold text-white">CV Pilot</span>}
        </Link>
      </div>
      
      {/* Ligne de séparation */}
      <div className="border-t border-blue-200/70 w-full my-2"></div>
      
      {/* Menu de navigation principal */}
      <div className="flex flex-col space-y-2 px-3 py-4 mt-4">
        <Link 
          to="/" 
          className="flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-white/40 transition-all duration-300"
          title={isMenuCollapsed ? "CV Upload" : ""}
        >
          <Upload className="h-5 w-5 text-white" />
          {!isMenuCollapsed && <span className="font-medium">CV Compare</span>}
        </Link>
        <Link 
          to="/search" 
          className="flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-white/40 transition-all duration-300"
          title={isMenuCollapsed ? "CV Search" : ""}
        >
          <Search className="h-5 w-5 text-white" />
          {!isMenuCollapsed && <span className="font-medium">CV Search</span>}
        </Link>
        <Link 
          to="/quiz" 
          className="flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-white/40 transition-all duration-300"
          title={isMenuCollapsed ? "Quiz" : ""}
        >
          <FileQuestion className="h-5 w-5 text-white" />
          {!isMenuCollapsed && <span className="font-medium">Quiz</span>}
        </Link>
      </div>
      
      {/* Espacement pour pousser le bouton déconnexion vers le bas */}
      <div className="flex-grow"></div>
      
      {/* Ligne de séparation avant le bouton déconnexion */}
      <div className="border-t border-blue-200/70 w-full my-2"></div>
      
      {/* Bouton déconnexion en bas du sidebar */}
      <div className="px-3 pb-8">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-white/40 transition-all duration-300"
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