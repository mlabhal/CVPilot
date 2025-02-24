// components/PostsList.tsx
import React from 'react';
import PostCard from './PostCard';
import { Post } from '../../types';

interface PostsListProps {
  posts: Post[];
}

const PostsList: React.FC<PostsListProps> = ({ posts }) => {
  const currentUserId = "user_id_temporaire"; // À remplacer par l'ID de l'utilisateur connecté

  if (posts.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Aucun post dans ce channel pour le moment</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard
          key={post._id}
          post={post}
          currentUserId={currentUserId}
          onLike={async (postId) => {
            // Implémentez la logique de like ici
            console.log('Like post:', postId);
          }}
          onComment={async (postId, comment) => {
            // Implémentez la logique de commentaire ici
            console.log('Comment on post:', postId, comment);
          }}
        />
      ))}
    </div>
  );
};

export default PostsList;