import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";
import { Loader2 } from "lucide-react";
import api from '../../services/api';
import type { AuthComponentProps } from '../../types/auth';
import backgroundImage from '../../images/cvtheque.png';

const MAUVE_COLOR = "#6366F1";  // Couleur indigo du logo
const MAUVE_HOVER = "#8B5CF6";  // Couleur violette du logo pour l'effet hover


export const LoginForm: React.FC<AuthComponentProps> = ({ setIsAuthenticated }) => {
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
    try {
      const { data } = await api.auth.login(formData);
      localStorage.setItem('token', data.token);
      setIsAuthenticated(true);
      navigate('/');
    } catch (err) {
      setError('Identifiants invalides');
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

      {/* Right side - Title, Description and Login form */}
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

        {/* Login Form */}
        <Card className="w-full max-w-md mx-auto shadow-xl">
          <div className="px-8 py-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4 mb-6">
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
              </div>

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                style={{ 
                  backgroundColor: MAUVE_COLOR,
                  '--hover-color': MAUVE_HOVER
                } as React.CSSProperties}
                className="w-full h-12 text-lg font-semibold text-white mb-4 hover:bg-[var(--hover-color)]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
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

              <div className="text-center mt-6">
                <Button
                  type="button"
                  onClick={() => navigate('/register')}
                  style={{ 
                    backgroundColor: MAUVE_COLOR,
                    '--hover-color': MAUVE_HOVER
                  } as React.CSSProperties}
                  className="h-12 text-lg font-semibold text-white w-full hover:bg-[var(--hover-color)]"
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