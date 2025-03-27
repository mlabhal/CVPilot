import React, { createContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';
import { fetchAuthApi } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  userName: string;
  userType: 'recruteur' | 'candidat' | '';
  isLoading: boolean;
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>;
  setUserName: Dispatch<SetStateAction<string>>;
  setUserType: Dispatch<SetStateAction<'recruteur' | 'candidat' | ''>>;
  getUserInitials: () => string;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userName: '',
  userType: '',
  isLoading: true,
  setIsAuthenticated: () => {},
  setUserName: () => {},
  setUserType: () => {},
  getUserInitials: () => '',
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [userType, setUserType] = useState<'recruteur' | 'candidat' | ''>('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Vérifier si l'utilisateur vient de s'inscrire
        const justRegistered = localStorage.getItem('justRegistered') === 'true';
        
        const token = localStorage.getItem('token');
        if (!token) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
    
        // Vérifier d'abord si le nom est déjà dans localStorage
        const storedUserName = localStorage.getItem('userName');
        // Récupérer le type d'utilisateur s'il est stocké
        const storedUserType = localStorage.getItem('userType') as 'recruteur' | 'candidat' | '';
        
        if (justRegistered) {
          // Si l'utilisateur vient de s'inscrire, on saute l'appel API initial
          if (storedUserName) {
            setUserName(storedUserName);
            setIsAuthenticated(true);
          }
          if (storedUserType) {
            setUserType(storedUserType);
          }
          // Nettoyer l'indicateur
          localStorage.removeItem('justRegistered');
          setIsLoading(false);
          return;
        }
        
        if (storedUserName) {
          setUserName(storedUserName);
        }
        if (storedUserType) {
          setUserType(storedUserType);
        }
        // Appeler l'API pour obtenir les données les plus récentes
        try {
          const userData = await fetchAuthApi('/users/me');
          if (userData && userData.name) {
            setUserName(userData.name);
            localStorage.setItem('userName', userData.name);
          }
          if (userData && userData.type) {
            setUserType(userData.type);
            localStorage.setItem('userType', userData.type);
          }
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Erreur fetch user:', error);
          // Si nous avons déjà un nom depuis localStorage, ne pas déconnecter
          if (!storedUserName) {
            setIsAuthenticated(false);
            localStorage.removeItem('token');
          } else {
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Erreur générale:', error);
        // Si nous avons un nom stocké, gardons l'utilisateur connecté malgré l'erreur
        const storedUserName = localStorage.getItem('userName');
        if (storedUserName) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem('token');
        }
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchUser();
  }, []);

  
  // Ensuite, ajoutez ce nouvel useEffect qui s'exécutera à chaque rendu
  useEffect(() => {
    // Vérifier si les données utilisateur ont été mises à jour depuis le login
    const userDataUpdated = localStorage.getItem('userDataUpdated');
    
    if (userDataUpdated === 'true') {
      // Récupérer le nom stocké lors du login
      const storedUserName = localStorage.getItem('userName');
      if (storedUserName) {
        setUserName(storedUserName);
      }
      // Récupérer le type stocké lors du login
      const storedUserType = localStorage.getItem('userType') as 'recruteur' | 'candidat' | '';
      if (storedUserType) {
        setUserType(storedUserType);
      }
            
      // Réinitialiser l'indicateur
      localStorage.removeItem('userDataUpdated');
    }
  }, []);

  // Effet pour fermer le menu de déconnexion lorsqu'on clique ailleurs (avec typage correct)
  useEffect(() => {
    if (showLogoutMenu) {
      const handleClickOutside = (event: MouseEvent) => {
        const menuButton = document.getElementById('user-menu-button');
        if (menuButton && !menuButton.contains(event.target as Node)) {
          setShowLogoutMenu(false);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showLogoutMenu]);
  
  // Fonction pour obtenir les initiales du nom d'utilisateur
  const getUserInitials = () => {
    if (!userName) return '?';
    
    const nameParts = userName.split(' ').filter(part => part.length > 0);
    if (nameParts.length === 0) return '?';
    
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated, 
        userName, 
        userType, 
        isLoading,
        setIsAuthenticated, 
        setUserName, 
        setUserType,
        getUserInitials
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};