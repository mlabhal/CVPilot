// components/NewPostForm.tsx
import React, { useState } from 'react';
import { XCircle } from 'lucide-react';
import { User } from '../types/index';

interface NewPostFormProps {
  channelId: string;
  channelSlug: string;  // Ajout du slug
  user: User| null;
  onClose: () => void;
  onSubmit: (postData: { title: string; content: string; tags: string[] }) => void;
}

const NewPostForm: React.FC<NewPostFormProps> = ({ channelId, channelSlug, user, onClose, onSubmit }) => {
  console.log('NewPostForm - Props reçues:', { channelId, user }); // Ajoutez ce log
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = localStorage.getItem('token');

    if (!token) {
    setError('Vous devez être connecté pour créer un post');
    return;
  }
    if (!user) {
      setError('Vous devez être connecté pour créer un post');
      return;
    }
    
    if (!title.trim() || !content.trim()) {
      setError('Le titre et le contenu sont requis');
      return;
    }
  
    const tagsArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  
    try {
        const response = await fetch(`http://localhost:3000/api/channels/${channelSlug}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Ajout du token
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          tags: tagsArray,
          channel: channelId,
          author: user._id // Ajout de l'opérateur optionnel
        }),
        // Retirez credentials: 'include' car nous utilisons le token JWT
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création du post');
      }
      onSubmit({
        title,
        content,
        tags: tagsArray
      });
      onClose(); // Fermer le formulaire après succès
    } catch (error) {
      console.error('Erreur complète:', error);
      setError(error instanceof Error ? error.message : "Une erreur s'est produite lors de la publication");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Nouveau Post</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Titre
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Titre de votre post"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Contenu
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Contenu de votre post..."
            />
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              Tags (séparés par des virgules)
            </label>
            <input
              type="text"
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="react, javascript, dev..."
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Publier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPostForm;