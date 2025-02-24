import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import CVUpload from './components/cv/CVUpload';
import CVSearch from './components/cv/CVSearch';
import CVResultsPage from './components/cv/CVResultsPage';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import { Upload, Search, LogIn, UserPlus, LogOut, Layers, FileQuestion } from 'lucide-react';
import { fetchAuthApi } from './services/api';
import ChannelsList from './components/channel/ChannelsList';
import { Channel } from './types/index';
import QuizManager from './components/quiz/QuizManager';
import QuizGenerator from './components/quiz/QuizGenerator';
import QuizViewer from './components/quiz/QuizViewer';
import QuizRespondent from './components/quiz/QuizRespondent';

const MAUVE_COLOR = "#6366F1";
const WHITE_COLOR = '#FFFFFF';

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
          const userData = await response.json();
          // Supposons que l'API renvoie les propriétés firstName et lastName
          setUserName(`${userData.firstName || ''} ${userData.lastName || ''}`);
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
    setShowLogoutMenu(false);
    window.location.href = '/login';
  };

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
          <nav style={{ backgroundColor: WHITE_COLOR }} className="py-2 border-b-2 border-indigo-100">
          <div className="w-full px-4">
            <div className="flex items-center justify-between">
              {/* Partie gauche: Logo et liens */}
              <div className="flex items-center">
                {/* Logo à l'extrémité gauche */}
                <Link to="/" className="flex items-center gap-2">
                  {/* La croix/cible du logo */}
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <div className="absolute w-5 h-5 border-2 rounded-full border-indigo-500"></div>
                    <div className="absolute w-5 h-[2px] bg-indigo-500"></div>
                    <div className="absolute h-5 w-[2px] bg-indigo-500"></div>
                  </div>
                  <span className="text-indigo-500 font-bold text-xl">CV Pilot</span>
                </Link>
                
                {/* Liens de navigation avec espacement */}
                {isAuthenticated && (
                  <div className="flex items-center ml-8">
                    <Link to="/" className="flex items-center gap-2 text-indigo-500 hover:bg-gray-200 hover:text-indigo-500 transition-colors px-3 py-1 rounded-md">
                      <Upload className="h-4 w-4" />
                      CV Upload
                    </Link>
                    <Link to="/search" className="flex items-center gap-2 text-indigo-500 hover:bg-gray-200 hover:text-indigo-500 transition-colors px-3 py-1 rounded-md">
                      <Search className="h-4 w-4" />
                      CV Search
                    </Link>
                    <Link to="/channels" className="flex items-center gap-2 text-indigo-500 hover:bg-gray-200 hover:text-indigo-500 transition-colors px-3 py-1 rounded-md">
                      <Layers className="h-4 w-4" />
                      Channels
                    </Link>
                    {/* Nouveau lien pour Quiz */}
                    <Link to="/quiz" className="flex items-center gap-2 text-indigo-500 hover:bg-gray-200 hover:text-indigo-500 transition-colors px-3 py-1 rounded-md">
                      <FileQuestion className="h-4 w-4" />
                      Quiz
                    </Link>
                  </div>
                )}
              </div>
              
              {/* Partie droite: bouton de déconnexion */}
              <div className="relative">
                {isAuthenticated ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowLogoutMenu(!showLogoutMenu)}
                      className="h-8 w-8 rounded-full bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-600 transition-colors"
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
                    <Link to="/login" className="flex items-center gap-2 text-indigo-500 hover:text-indigo-700 transition-colors">
                      <LogIn className="h-5 w-5" />
                      Connexion
                    </Link>
                    <Link to="/register" className="flex items-center gap-2 text-indigo-500 hover:text-indigo-700 transition-colors">
                      <UserPlus className="h-5 w-5" />
                      Inscription
                    </Link>
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
              <Route path="/quiz/respond/:quizId" element={
                <PrivateRoute>
                  <QuizRespondentWrapper />
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

// Wrapper pour QuizRespondent qui récupère l'ID du quiz depuis les paramètres d'URL
const QuizRespondentWrapper = () => {
  const location = useLocation();
  const quizId = location.pathname.split('/').pop() || '';

  return (
    <div className="mt-6">
      <QuizRespondent quizId={quizId} candidateView={true} />
    </div>
  );
};

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