import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { isAuthPage } from '../../utils/authUtils';
import backgroundImage from '../../images/Flux_Dev_a_breathtakingly_detailed_highcontrast_illustration_o_2.jpeg';
import PathAwareComponent from '../common/PathAwareComponent';

interface NavigationProps {
  isMenuCollapsed: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ isMenuCollapsed }) => {
  const { isAuthenticated, userType } = useAuth();

  return (
    <PathAwareComponent>
      {(pathname) => !isAuthPage(pathname) && pathname !== '/home' && (
        <nav className="fixed left-0 right-0 top-0 z-40 py-4 bg-transparent transition-all duration-300"
            style={{ 
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              backgroundRepeat: 'no-repeat'
            }}>
          <div className={`w-full px-4 ${isAuthenticated && userType === 'recruteur' ? (isMenuCollapsed ? 'ml-24 pr-4' : 'ml-56 pr-6') : ''}`}>
            <div className="flex items-center justify-end">
              {/* Afficher les boutons de connexion uniquement si l'utilisateur n'est pas authentifié */}
              {!isAuthenticated && (
                <div className="flex space-x-4">
                  <Link to="/login" className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-lg text-blue-700 hover:bg-white transition-colors shadow-md">
                    <LogIn className="h-5 w-5" />
                    Connexion
                  </Link>
                  <Link to="/register" className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-lg text-blue-700 hover:bg-white transition-colors shadow-md">
                    <UserPlus className="h-5 w-5" />
                    Inscription
                  </Link>
                  <button 
                    onClick={() => window.location.href = '/login'}
                    className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2 px-6 rounded-full hover:shadow-lg transition-all font-medium whitespace-nowrap border-2 border-white/30 shadow-md"
                  >
                    Essayer maintenant
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      )}
    </PathAwareComponent>
  );
};

export default Navigation;