import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import CVUpload from './components/cv/CVUpload';
import CVSearch from './components/cv/CVSearch';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import { Upload, Search, LogIn, UserPlus, LogOut, FileQuestion } from 'lucide-react';
import { fetchAuthApi } from './services/api';
import ChannelsList from './components/channel/ChannelsList';
import { Channel } from './types/index';
import QuizManager from './components/quiz/QuizManager';
import QuizGenerator from './components/quiz/QuizGenerator';
import QuizViewer from './components/quiz/QuizViewer';
import QuizResult from './components/quiz/QuizResult'
import CandidateQuiz from './components/quiz/CandidateQuiz'
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import HomePage from './components/auth/HomePage';
import logoImage from '../public/logo.svg'; 
import backgroundImage from './images/Flux_Dev_a_breathtakingly_detailed_highcontrast_illustration_o_2.jpeg';

const MAUVE_COLOR = "#6366F1";

const candidateId = localStorage.getItem('userId') || 'default-candidate'; 

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  return children;
};

const ChannelsListWrapper: React.FC = () => {
  // État pour stocker les channels
  const [channels, setChannels] = useState<Channel[]>([]);
  // État pour suivre l'ID du channel actif
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  // Effet pour charger les channels
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetchAuthApi('/channels');
        if (response.ok) {
          const data: Channel[] = await response.json();
          setChannels(data);
          if (data.length > 0) {
            setActiveChannelId(String(data[0]._id));
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des channels:', error);
      }
    };

    fetchChannels();
  }, []);

  // Fonction pour sélectionner un channel par ID
  const handleChannelSelect = (channelId: string) => {
    setActiveChannelId(channelId);
  };

  return (
    <ChannelsList
      channels={channels}
      activeChannel={activeChannelId}
      onChannelSelect={handleChannelSelect}
    />
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [userType, setUserType] = useState<'recruteur' | 'candidat' | ''>('');

  const isAuthPage = (pathname: string) => {
    return pathname === '/login' || 
           pathname === '/register' || 
           pathname === '/forgot-password' || 
           pathname === '/home' || 
           pathname.startsWith('/reset-password/');
  };
  
  // Fonction pour rediriger l'utilisateur après connexion en fonction de son type
  const redirectAfterLogin = () => {
    if (userType === 'candidat') {
      return '/channels';
    }
    return '/'; // Par défaut pour les recruteurs
  };

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    setIsAuthenticated(false);
    setUserType('');
    setShowLogoutMenu(false);
    window.location.href = '/home';
  };
  
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-blue-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: MAUVE_COLOR }}></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen relative"
      style={{ 
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}>
        {/* Content */}
        <div className="relative z-10">
          {/* Navigation - masquée sur les pages d'auth */}
          <AuthAwareComponent>
          {(pathname) => !isAuthPage(pathname) && pathname !== '/home' && (
            <nav className="fixed left-0 right-0 top-0 z-50 py-4 bg-transparent transition-all duration-300"
                style={{ 
                  backgroundImage: `url(${backgroundImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center top',
                  backgroundRepeat: 'no-repeat'
                }}>
              <div className="w-full px-4">
                <div className="flex items-center justify-between">
                  {/* Partie gauche: Logo et liens */}
                  <div className="flex items-center">
                    {/* Logo à l'extrémité gauche */}
                    <Link to="/home" className="flex items-center gap-2">
                      <img 
                        src={logoImage} 
                        alt="CV Pilot Logo" 
                        className="h-12 w-auto" 
                      />
                      <span className="text-xl font-bold text-white">CV Pilot</span>
                    </Link>
                    
                    {/* Liens de navigation avec espacement */}
                    {isAuthenticated && (
                      <div className="flex space-x-4 lg:space-x-8 items-center ml-8">
                        {/* Affichage conditionnel pour les recruteurs */}
                        {userType === 'recruteur' && (
                          <>
                            <Link 
                              to="/" 
                              className="text-white hover:text-blue-600 transition-colors whitespace-nowrap"
                            >
                              <span className="flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                CV Upload
                              </span>
                            </Link>
                            <Link 
                              to="/search" 
                              className="text-white hover:text-blue-600 transition-colors whitespace-nowrap"
                            >
                              <span className="flex items-center gap-2">
                                <Search className="h-4 w-4" />
                                CV Search
                              </span>
                            </Link>
                            <Link 
                              to="/quiz" 
                              className="text-white hover:text-blue-600 transition-colors whitespace-nowrap"
                            >
                              <span className="flex items-center gap-2">
                                <FileQuestion className="h-4 w-4" />
                                Quiz
                              </span>
                            </Link>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Partie droite: bouton de déconnexion */}
                  <div className="relative">
                    {isAuthenticated ? (
                      <div className="relative">
                        <button
                          onClick={() => setShowLogoutMenu(!showLogoutMenu)}
                          className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-400 transition-colors"
                          aria-label="Menu utilisateur"
                        >
                          {getUserInitials()}
                        </button>
                        
                        {/* Menu déroulant de déconnexion */}
                        {showLogoutMenu && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-20">
                            <div className="py-1">
                              <button 
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                <LogOut className="h-4 w-4" />
                                Déconnexion
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex space-x-4">
                        <Link to="/login" className="flex items-center gap-2 text-white hover:text-blue-200 transition-colors">
                          <LogIn className="h-5 w-5" />
                          Connexion
                        </Link>
                        <Link to="/register" className="flex items-center gap-2 text-white hover:text-blue-200 transition-colors">
                          <UserPlus className="h-5 w-5" />
                          Inscription
                        </Link>
                        <button 
                          onClick={() => window.location.href = '/login'}
                          className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2 px-6 rounded-full hover:shadow-lg transition-all font-medium whitespace-nowrap"
                        >
                          Essayer maintenant
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </nav>
          )}
          </AuthAwareComponent>

          <div className="container mx-auto px-4">
            <Routes>
              <Route path="/home" element={<HomePage />} />
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
              {/* Ajoutez la nouvelle route pour Channels */}
              <Route path="/channels" element={
                <PrivateRoute>
                  <div className="mt-6">
                    <ChannelsListWrapper />
                  </div>
                </PrivateRoute>
              } />
              
              {/* Routes pour les Quiz */}
              <Route path="/quiz" element={
                <PrivateRoute>
                  <div className="mt-6">
                    <QuizManager />
                  </div>
                </PrivateRoute>
              } />
              <Route path="/quiz/generate" element={
                <PrivateRoute>
                  <div className="mt-6">
                    <QuizGenerator onQuizGenerated={(quiz) => console.log("Quiz generated:", quiz)} />
                  </div>
                </PrivateRoute>
              } />
              <Route path="/quiz/view/:quizId" element={
                <PrivateRoute>
                  <QuizViewerWrapper />
                </PrivateRoute>
              } />
              <Route path="/quiz/:quizId/candidate" element={
                <CandidateQuiz candidateId={candidateId} />
              } />
              <Route path="/results/:submissionId" element={<QuizResult onReturnHome={() => window.location.href = '/'} />} />
              
              <Route path="/login" element={
                isAuthenticated ? 
                  <Navigate to={redirectAfterLogin()} /> : 
                  <LoginForm 
                    setIsAuthenticated={setIsAuthenticated} 
                    setUserName={setUserName}
                    setUserType={setUserType}
                  />
              } />
              <Route path="/register" element={
                  isAuthenticated ? 
                    <Navigate to={redirectAfterLogin()} /> : 
                    <RegisterForm 
                      setIsAuthenticated={setIsAuthenticated}
                      setUserType={setUserType} 
                    />
                } />
              <Route path="/forgot-password" element={
                isAuthenticated ? 
                  <Navigate to="/" /> : 
                  <ForgotPassword />
              } />
              <Route path="/reset-password/:token" element={
                isAuthenticated ? 
                  <Navigate to="/" /> : 
                  <ResetPassword />
              } />
              {/* Route pour rediriger les anciens liens vers la page d'upload */}
              <Route path="/results" element={<Navigate to="/" replace />} />
              <Route path="*" element={
                <Navigate to={isAuthenticated ? "/" : "/home"} replace />
              } />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

// Wrapper pour QuizViewer qui récupère l'ID du quiz depuis les paramètres d'URL
const QuizViewerWrapper = () => {
  const [quiz, setQuiz] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const quizId = location.pathname.split('/').pop() || '';
  
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        // Si les données sont passées via l'état de la navigation 
        if (location.state?.quiz) {
          setQuiz(location.state.quiz);
          setIsLoading(false);
          return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Veuillez vous connecter pour générer un quiz');
        }

        const data = await fetchAuthApi(`/quiz/${quizId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
              }
        });
        setQuiz(data);
        
      } catch (err) {
        console.error('Erreur lors du chargement du quiz:', err);
        
        // Typage correct de l'erreur
        if (err instanceof Error) {
          // C'est une erreur standard de JavaScript
          setError(err.message);
        } else if (typeof err === 'object' && err !== null && 'response' in err) {
          // C'est probablement une erreur Axios
          const axiosError = err as { response?: { status: number } };
          if (axiosError.response?.status === 401) {
            localStorage.removeItem('token');
            setError('Session expirée. Veuillez vous reconnecter.');
          } else {
            setError('Erreur lors du chargement du quiz');
          }
        } else {
          // Fallback pour tout autre type d'erreur
          setError('Une erreur inattendue est survenue');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (quizId) {
      fetchQuiz();
    }
  }, [quizId, location]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 mt-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: MAUVE_COLOR }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 mt-6">
        <p className="text-red-500">Erreur: {error}</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-8 mt-6">
        <p className="text-gray-500">Quiz non trouvé</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <QuizViewer 
        quiz={quiz} 
        mode="admin" 
        onSendToCandidate={() => {}} 
      />
    </div>
  );
};

// Composant utilitaire pour accéder au pathname
const AuthAwareComponent = ({ children }: { children: (pathname: string) => React.ReactNode }) => {
  const location = useLocation();
  return <>{children(location.pathname)}</>;
};

export default App;