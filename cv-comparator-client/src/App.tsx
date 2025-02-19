import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation  } from 'react-router-dom';
import CVUpload from './components/CVUpload';
import CVSearch from './components/CVSearch';
import CVResultsPage from './components/CVResultsPage';  // Nouveau import
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import { Upload, Search, LogIn, UserPlus, LogOut} from 'lucide-react';
import { fetchAuthApi } from './services/api';

const MAUVE_COLOR = "#6366F1";  // Couleur indigo du logo
const WHITE_COLOR = '#FFFFFF';

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

        const response = await fetchAuthApi('/users/me', {
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
      <div className="flex justify-center items-center h-screen bg-indigo-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: MAUVE_COLOR }}></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-white relative">

        {/* Content */}
        <div className="relative z-10">
          {/* Navigation - masquée sur les pages d'auth */}
          <AuthAwareComponent>
          {(pathname) => !isAuthPage(pathname) && (
          <nav style={{ backgroundColor: WHITE_COLOR }} className="shadow-md">
            <div className="container mx-auto px-4 py-4">
              <div className="flex justify-between items-center">
                {/* Logo */}
                <div className="flex items-center">
                  <Link to="/" className="flex items-center">
                    <img 
                      src="/../../public/logo.svg" 
                      alt="Logo" 
                      className="h-20 w-20 mr-4"
                    />
                  </Link>
                </div>
                <div className="flex space-x-6">
                  {isAuthenticated && (
                    <>
                      <Link to="/" className="flex items-center gap-2 text-indigo-500 bg-indigo-50 hover:bg-gray-200 hover:text-indigo-500 transition-colors px-3 py-2 rounded-md">
                        <Upload className="h-5 w-5" />
                        CV Upload
                      </Link>
                      <Link to="/search" className="flex items-center gap-2 text-indigo-500 bg-indigo-50 hover:bg-gray-200 hover:text-indigo-500 transition-colors px-3 py-2 rounded-md">
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
                      className="flex items-center gap-2 text-indigo-500 bg-indigo-50 hover:bg-gray-200 hover:text-indigo-500 transition-colors px-3 py-2 rounded-md"
                    >
                      <LogOut className="h-5 w-5" />
                      Déconnexion
                    </button>
                  ) : (
                    <>
                      <Link to="/login" className="flex items-center gap-2 text-white hover:bg-gray-200 hover:text-indigo-500 transition-colors">
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
              <Route path="/results" element={
                <PrivateRoute>
                  <CVResultsWithData />
                </PrivateRoute>
               } 
              />
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
// Composant pour charger les données d'analyse
const CVResultsWithData = () => {
  const [apiResponse, setApiResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  
  useEffect(() => {
    const fetchResults = async () => {
      try {
        // Si les données sont passées via l'état de la navigation
        if (location.state?.analysisResults) {
          setApiResponse(location.state.analysisResults);
          setIsLoading(false);
          return;
        }

        // Sinon, charger depuis l'API
        const response = await fetch('/api/cv/results');
        const data = await response.json();
        setApiResponse(data);
      } catch (error) {
        console.error('Erreur lors du chargement des résultats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [location]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mauve"></div>
      </div>
    );
  }

  if (!apiResponse) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Aucun résultat d'analyse disponible</p>
      </div>
    );
  }

  return <CVResultsPage apiResponse={apiResponse} />;
};
export default App;