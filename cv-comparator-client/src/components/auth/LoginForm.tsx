import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";
import { Loader2 } from "lucide-react";
import api from '../../services/api';
import type { AuthComponentProps } from '../../types/auth';
import backgroundImageUrl from '../../images/Flux_Dev_a_breathtakingly_detailed_highcontrast_illustration_o_2.jpeg';
import Header from './Header';


export const LoginForm: React.FC<AuthComponentProps> = ({ setIsAuthenticated, setUserName, setUserType }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    setIsLoading(true);
    setError('');
    
    let userTypeValue = ''; // Définir la variable en dehors des blocs try/catch
    
    try {
      // Connexion
      const { data } = await api.auth.login(formData);
      localStorage.setItem('token', data.token);
      
      // Récupérer les informations utilisateur
      try {
        const userData = await api.get('/users/me');
        if (userData?.data?.name) {
          // Stocker dans localStorage
          localStorage.setItem('userName', userData.data.name);
          
          // Mettre à jour l'état dans App directement
          if (setUserName) {
            setUserName(userData.data.name);
          }
          
          // Stocker et mettre à jour le type d'utilisateur
          if (userData?.data?.type) {
            userTypeValue = userData.data.type; // Sauvegarder la valeur pour l'utiliser plus tard
            localStorage.setItem('userType', userData.data.type);
            
            // Mettre à jour l'état dans App si la prop existe
            if (setUserType) {
              setUserType(userData.data.type);
            }
          }
        }
      } catch (userError) {
        console.error('Erreur lors de la récupération des données utilisateur:', userError);
      }
      
      // Continuer le flux normal
      setIsAuthenticated(true);
  
      // Récupérer et traiter l'URL de redirection
      const redirectUrl = localStorage.getItem('redirectAfterLogin');
      console.log("URL de redirection récupérée:", redirectUrl);
  
      if (redirectUrl) {
        // Nettoyer le localStorage avant de rediriger
        localStorage.removeItem('redirectAfterLogin');
        console.log("Redirection vers:", redirectUrl);
        // Utiliser une redirection immédiate
        window.location.href = redirectUrl;
      } else {
        console.log("Aucune URL de redirection, navigation vers la page d'accueil");
        // Rediriger en fonction du type d'utilisateur
        if (userTypeValue === 'candidat') {
          navigate('/channels');
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setError('Identifiants invalides');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex justify-center items-center"
      style={{ 
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%'
    }}>
      {/* Header */}
      <Header backgroundImageUrl={backgroundImageUrl} />
      
      {/* Centered content */}
      <div className="bg-transparent p-6 rounded-lg shadow-xl max-w-md w-full mx-auto mt-24">
        {/* Simple Title */}
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold text-white">Identifiez-vous</h1>
        </div>
  
        {/* Login Form */}
        <Card 
          className="w-full shadow-xl border-0 backdrop-blur-sm" 
          style={{ backgroundColor: 'rgba(249, 250, 251, 0.5)' }} 
        >
          <div className="px-6 py-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-3 mb-4">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Adresse e-mail"
                  className="h-10 text-base px-3 text-white placeholder:text-gray-300"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
                />
  
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mot de passe"
                  className="h-10 text-base px-3 text-white placeholder:text-gray-300"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
                />
                
                {/* Lien "Mot de passe oublié" ajouté ici */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-xs text-blue-500 hover:text-gray-500 font-medium"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </div>
  
              {error && (
                <Alert variant="destructive" className="mb-3">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
  
                <Button 
                type="submit" 
                className="w-full h-10 text-base font-semibold text-white mb-3 bg-gradient-to-r from-blue-500 to-blue-700 rounded hover:shadow-lg transition-all" 
                disabled={isLoading}
                >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>
  
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-transparent text-blue-600">ou</span>
                </div>
              </div>
  
              <div className="text-center mt-4">
                <Button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="w-full h-10 text-base font-semibold text-white mb-3 bg-gradient-to-r from-blue-500 to-blue-700 rounded hover:shadow-lg transition-all"
                > 
                  Créer un nouveau compte
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginForm;