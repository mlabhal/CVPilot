// services/api.ts
import axios, { AxiosInstance } from 'axios';

// Centralisation de l'URL de l'API
export const API_URL = import.meta.env.VITE_API_URL ;
export const API_BASE_URL = `${API_URL}/api`;

// Interface pour les fonctions d'authentification
interface ApiInstance extends AxiosInstance {
  auth: {
    login: (data: { email: string; password: string }) => Promise<any>;
    register: (data: { email: string; password: string; name: string; type: string ;companyName?:string }) => Promise<any>;
  }
}

// Instance Axios principale
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
}) as ApiInstance;

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Gérer la déconnexion ou le refresh token
      console.warn('Session expirée ou non autorisée');
    }
    return Promise.reject(error);
  }
);

// Méthodes d'authentification
api.auth = {
  login: (data) => api.post('/users/login', data),
  register: (data) => api.post('/users/register', data)
};

// Fonctions utilitaires pour d'autres composants

/**
 * Construit une URL d'API complète
 * @param endpoint - Le chemin d'API sans la barre oblique initiale
 * @returns URL complète
 */
export const buildApiUrl = (endpoint: string): string => {
  // Normalise l'endpoint
  const normalizedEndpoint = endpoint.startsWith('/') 
    ? endpoint 
    : `/${endpoint}`;
    
  // Si l'endpoint contient déjà /api, ne pas le répéter
  if (normalizedEndpoint.startsWith('/api/')) {
    return `${API_URL}${normalizedEndpoint}`;
  }
  
  return `${API_BASE_URL}${normalizedEndpoint.replace(/^\/api/, '')}`;
};

/**
 * Options par défaut pour les requêtes fetch avec authentification
 */
export const getAuthenticatedRequestOptions = (options: RequestInit = {}): RequestInit => {
  const token = localStorage.getItem('token');

  // Afficher le token pour déboguer
  console.log("Token utilisé dans la requête:", token);
  return {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  };
};

/**
 * Fonction utilitaire pour les requêtes fetch à l'API
 */
export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const url = buildApiUrl(endpoint);
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erreur HTTP ${response.status}`);
  }
  return response.json();
};

/**
 * Fonction utilitaire pour les requêtes fetch authentifiées
 */
export const fetchAuthApi = async (endpoint: string, options: RequestInit = {}) => {
  console.log('Endpoint reçu:', endpoint);
  console.log('URL complète:', buildApiUrl(endpoint));
  console.log('Options:', getAuthenticatedRequestOptions(options));
  
  // Vérifier si l'utilisateur vient de s'inscrire et si l'endpoint est /users/me
  const justRegistered = localStorage.getItem('justRegistered') === 'true';
  if (justRegistered && endpoint === '/users/me') {
    console.log("Utilisateur récemment inscrit, retour des données locales");
    
    // Récupérer le nom d'utilisateur stocké dans localStorage
    const storedUserName = localStorage.getItem('userName');
    
    if (storedUserName) {
      // Simuler une réponse réussie
      return Promise.resolve({
        name: storedUserName,
        email: localStorage.getItem('userEmail') || '',
        id: 'temp-id'
      });
    }
  }
  
  // Si ce n'est pas le cas, procéder normalement
  return fetchApi(endpoint, getAuthenticatedRequestOptions(options));
};

export default api;