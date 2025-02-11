// services/api.ts
import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ApiInstance extends AxiosInstance {
  auth: {
    login: (data: { email: string; password: string }) => Promise<any>;
    register: (data: { email: string; password: string;name:string }) => Promise<any>;
  }
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Ajout des configurations importantes pour CORS
  withCredentials: true, // Permet l'envoi des cookies
}) as ApiInstance;

// Ajout d'un intercepteur pour gérer les erreurs
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Gérer la déconnexion ou le refresh token
    }
    return Promise.reject(error);
  }
);


api.auth = {
  login: (data) => api.post('api/users/login', data),
  register: (data) => api.post('api/users/register', data)
};

export default api;