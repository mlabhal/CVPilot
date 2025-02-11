
export const createPost = async (channelSlug: string, postData: { 
    title: string; 
    content: string; 
    channel: string; // compéter cette ligne par channel
    author: string; // compléter cette ligne par user_id 
    tags: string[] 
  }) => {
    try {
      const response = await fetch(`/api/${channelSlug}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
        credentials: 'include' // Pour envoyer les cookies d'authentification
      });
  
      if (!response.ok) {
        throw new Error('Erreur lors de la création du post');
      }
  
      return await response.json();
    } catch (error) {
      console.error('Erreur createPost:', error);
      throw error;
    }
  };