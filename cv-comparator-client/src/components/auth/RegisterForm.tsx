import React, { useState, Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";
import { Loader2 } from "lucide-react";
import api from '../../services/api';
import backgroundImage from '../../images/cvtheque.png';

const MAUVE_COLOR = "#6366F1";  // Couleur indigo du logo
const MAUVE_HOVER = "#8B5CF6";  // Couleur violette du logo pour l'effet hover

interface RegisterFormProps {
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>;
}

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const RegisterForm: React.FC<RegisterFormProps> = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.name) {
      setError('Tous les champs sont requis');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Email invalide');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }

    return true;
  };

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
    if (!validateForm()) return;
    setIsLoading(true);
    setError('');
    
    try {
      const { data } = await api.auth.register({
        email: formData.email,
        password: formData.password,
        name: formData.name
      });
      
      localStorage.setItem('token', data.token);
      setIsAuthenticated(true);
      navigate('/');
      
    } catch (err) {
      const apiError = err as ApiError;
      setError(
        apiError.response?.data?.message || 
        'Une erreur est survenue lors de l\'inscription'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Background Image */}
      <div className="w-1/2 relative">
        <img
          src={backgroundImage}
          alt="CV Pilot Background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right side - Title, Description and Register form */}
      <div className="w-1/2 bg-white p-8 flex flex-col pt-12">
        {/* Title and Description */}
        <div className="mb-6 text-left pl-8">
          <div className="flex items-center gap-4 mb-3">
            <img
              src="/logo.svg" // assurez-vous que le logo est dans le dossier public
              alt="CV Pilot Logo"
              className="w-24 h-24"
            />
            <h1 className="text-5xl font-bold text-gray-900">CV Pilot</h1>
          </div>
          <h2 className="text-xl leading-snug text-gray-600 mb-6 w-full">
            CV Pilote vous aide à trouver les meilleurs candidats pour vos postes en analysant et comparant efficacement les CV.
          </h2>
        </div>

        {/* Register Form */}
        <Card className="w-full max-w-md mx-auto shadow-xl">
          <div className="px-8 py-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Créer un compte</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Nom complet"
                  className="h-12 text-lg px-4"
                />

                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Adresse e-mail"
                  className="h-12 text-lg px-4"
                />

                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mot de passe"
                  className="h-12 text-lg px-4"
                />

                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirmer le mot de passe"
                  className="h-12 text-lg px-4"
                />
              </div>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                style={{ 
                  backgroundColor: MAUVE_COLOR,
                  '--hover-color': MAUVE_HOVER
                } as React.CSSProperties}
                className="w-full h-12 text-lg font-semibold text-white mt-6 hover:bg-[var(--hover-color)]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Inscription en cours...
                  </>
                ) : (
                  'S\'inscrire'
                )}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">ou</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => navigate('/login')}
                style={{ 
                  backgroundColor: MAUVE_COLOR,
                  '--hover-color': MAUVE_HOVER
                } as React.CSSProperties}
                className="w-full h-12 text-lg font-semibold text-white hover:bg-[var(--hover-color)]"
              >
                Se connecter avec un compte existant
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterForm;