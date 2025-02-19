import React, { useState, useEffect } from 'react';
import { Channel, Post } from '../types/index';
import ChannelsList from './ChannelsList';
import PostsList from './PostsList';
import NewPostForm from './NewPostForm';
import { User } from '../types/index';

interface BlogProps {
  user: User | null;
}
const Blog: React.FC<BlogProps> = ({ user }) => {
  console.log('Blog component - user:', user);

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Chargement de l'utilisateur...</p>
      </div>
    );
  }

  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const fetchChannelPosts = async (channelSlug: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://sea-turtle-app-xid5z.ondigitalocean.app/api/channels/${channelSlug}/posts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]); // Réinitialiser les posts en cas d'erreur
    }
  };

  const channels: Channel[] = [
    { 
      _id: '1',
      name: 'Backend',
      slug: 'backend',
      icon: '⚙️',
      description: 'Discussions sur le développement backend',
      subscribers: []
    },
    {
      _id: '2',
      name: 'Frontend',
      slug: 'frontend',
      icon: '🎨',
      description: 'Discussions sur le développement frontend',
      subscribers: []
    },
    {
      _id: '3',
      name: 'Mobile Android',
      slug: 'android',
      icon: '🤖',
      description: 'Discussions sur le développement Android',
      subscribers: []
    },
    {
      _id: '4',
      name: 'Mobile iOS',
      slug: 'ios',
      icon: '🍎',
      description: 'Discussions sur le développement iOS',
      subscribers: []
    },
    {
      _id: '5',
      name: 'DATA & BI',
      slug: 'data-bi',
      icon: '📊',
      description: 'Discussions sur la data et la BI',
      subscribers: []
    },
    {
      _id: '6',
      name: 'IA',
      slug: 'ai',
      icon: '🤖',
      description: 'Discussions sur l\'intelligence artificielle',
      subscribers: []
    },
    {
      _id: '7',
      name: 'Gestion de projets',
      slug: 'project-management',
      icon: '📋',
      description: 'Discussions sur la gestion de projets',
      subscribers: []
    },
    {
      _id: '8',
      name: 'Agile',
      slug: 'agile',
      icon: '🔄',
      description: 'Discussions sur les méthodes agiles',
      subscribers: []
    }
  ];


  useEffect(() => {
    if (activeChannel) {
      fetchChannelPosts(activeChannel.slug);
    }
  }, [activeChannel]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar avec la liste des channels */}
      <aside className="w-64 bg-white shadow-lg">
        <ChannelsList 
          channels={channels}
          activeChannel={activeChannel?.slug}
          onChannelSelect={(slug) => {
            const channel = channels.find(c => c.slug === slug);
            setActiveChannel(channel || null);
          }}
        />
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 bg-gray-50 p-6">
        {activeChannel ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">
                {activeChannel.icon} {activeChannel.name}
              </h1>
              <button
                onClick={() => setIsNewPostModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                Nouveau Post
              </button>
            </div>
            <PostsList posts={posts} />
          </>
        ) : (
          <div className="text-center text-gray-500 mt-10">
            Sélectionnez un channel pour voir les posts
          </div>
        )}
      </main>

      {/* Modal pour nouveau post */}
      {isNewPostModalOpen && activeChannel && (
        <NewPostForm
          channelId={activeChannel?._id || ''}
          channelSlug={activeChannel.slug}  // Ajout du slug
          user={user}  // Ajout de user
          onClose={() => setIsNewPostModalOpen(false)}
          onSubmit={async (_postData) => {
            
            await fetchChannelPosts(activeChannel.slug);
            // Logique de création de post
            setIsNewPostModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Blog;