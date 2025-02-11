import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation  } from 'react-router-dom';
import CVUpload from './components/CVUpload';
import CVSearch from './components/CVSearch';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import { Upload, Search, LogIn, UserPlus, LogOut } from 'lucide-react';

const MAUVE_COLOR = "#6366F1";  // Couleur indigo du logo
const MAUVE_HOVER = "#8B5CF6";  // Couleur violette du logo pour l'effet hover


const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  return children;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  const isAuthPage = (pathname: string) => {
    return pathname === '/login' || pathname === '/register';
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        const response = await fetch('http://localhost:3000/api/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Erreur fetch user:', error);
        setIsAuthenticated(false);
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: MAUVE_COLOR }}></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen relative">

        {/* Content */}
        <div className="relative z-10">
          {/* Navigation - masquée sur les pages d'auth */}
          <AuthAwareComponent>
          {(pathname) => !isAuthPage(pathname) && (
          <nav style={{ backgroundColor: MAUVE_COLOR }} className="shadow-md">
            <div className="container mx-auto px-4 py-4">
              <div className="flex justify-between items-center">
                <div className="flex space-x-6">
                  {isAuthenticated && (
                    <>
                      <Link to="/" className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors">
                        <Upload className="h-5 w-5" />
                        CV Upload
                      </Link>
                      <Link to="/search" className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors">
                        <Search className="h-5 w-5" />
                        CV Search
                      </Link>
                    </>
                  )}
                </div>
                
                <div className="flex space-x-6 ml-auto">
                  {isAuthenticated ? (
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
                    >
                      <LogOut className="h-5 w-5" />
                      Déconnexion
                    </button>
                  ) : (
                    <>
                      <Link to="/login" className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors">
                        <LogIn className="h-5 w-5" />
                        Connexion
                      </Link>
                      <Link to="/register" className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors">
                        <UserPlus className="h-5 w-5" />
                        Inscription
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </nav>
          )}
          </AuthAwareComponent>

          <div className="container mx-auto px-4">
            <Routes>
              <Route path="/" element={
                <PrivateRoute>
                  <div className="mt-6">
                    <CVUpload />
                  </div>
                </PrivateRoute>
              } />
              <Route path="/search" element={
                <PrivateRoute>
                  <div className="mt-6">
                    <CVSearch />
                  </div>
                </PrivateRoute>
              } />
              <Route path="/login" element={
                isAuthenticated ? 
                  <Navigate to="/" /> : 
                  <LoginForm setIsAuthenticated={setIsAuthenticated} />
              } />
              <Route path="/register" element={
                isAuthenticated ? 
                  <Navigate to="/" /> : 
                  <RegisterForm setIsAuthenticated={setIsAuthenticated} />
              } />
              <Route path="*" element={
                <Navigate to={isAuthenticated ? "/" : "/login"} replace />
              } />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}
// Composant utilitaire pour accéder au pathname
const AuthAwareComponent = ({ children }: { children: (pathname: string) => React.ReactNode }) => {
  const location = useLocation();
  return <>{children(location.pathname)}</>;
};

export default App;