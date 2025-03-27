import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from './Sidebar';
import Navigation from './Navigation';
import PathAwareComponent from '../common/PathAwareComponent';
import { isAuthPage } from '../../utils/authUtils';

interface MainLayoutProps {
  children: React.ReactNode;
  isMenuCollapsed: boolean;
  setIsMenuCollapsed: (value: boolean) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  isMenuCollapsed, 
  setIsMenuCollapsed 
}) => {
  const { isAuthenticated, userType } = useAuth();

  return (
    <>
      <PathAwareComponent>
        {(pathname) => isAuthenticated && !isAuthPage(pathname) && userType === 'recruteur' && (
          <Sidebar
            isMenuCollapsed={isMenuCollapsed}
            setIsMenuCollapsed={setIsMenuCollapsed}
          />
        )}
      </PathAwareComponent>

      <Navigation isMenuCollapsed={isMenuCollapsed} />

      <PathAwareComponent>
        {(pathname) => (
          <div className={`container mx-auto px-4 transition-all duration-300 
            ${(isAuthenticated && !isAuthPage(pathname) && userType === 'recruteur') 
              ? (isMenuCollapsed ? 'ml-24' : 'ml-56') 
              : ''} 
            pt-16`}
          >
            {children}
          </div>
        )}
      </PathAwareComponent>
    </>
  );
};

export default MainLayout;