// components/PostCard.tsx
import React, { useState } from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PostCardProps {
  post: {
    _id: string;
    title: string;
    content: string;
    author: {
      name: string;
      avatar?: string;
    };
    likes: string[];
    comments: {
      _id: string;
      content: string;
      author: {
        name: string;
        avatar?: string;
      };
      createdAt: Date;
    }[];
    tags: string[];
    createdAt: Date;
  };
  currentUserId: string;
  onLike: (postId: string) => void;
  onComment: (postId: string, comment: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onLike,
  onComment
}) => {
  const [isCommenting, setIsCommenting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const isLiked = post.likes.includes(currentUserId);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onComment(post._id, newComment);
      setNewComment('');
      setIsCommenting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {/* En-tête */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {post.author.avatar ? (
            <img src={post.author.avatar} alt="" className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              {post.author.name.charAt(0)}
            </div>
          )}
          <div>
            <h3 className="font-medium">{post.author.name}</h3>
            <p className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: fr })}
            </p>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <h2 className="text-xl font-bold mb-3">{post.title}</h2>
      <p className="text-gray-700 mb-4">{post.content}</p>

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-6 py-4 border-t">
        <button
          onClick={() => onLike(post._id)}
          className={`flex items-center gap-2 ${
            isLiked ? 'text-red-500' : 'text-gray-500'
          } hover:text-red-500`}
        >
          <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
          <span>{post.likes.length}</span>
        </button>
        
        <button
          onClick={() => setIsCommenting(!isCommenting)}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-500"
        >
          <MessageCircle className="h-5 w-5" />
          <span>{post.comments.length}</span>
        </button>

        <button className="flex items-center gap-2 text-gray-500 hover:text-blue-500">
          <Share2 className="h-5 w-5" />
          <span>Partager</span>
        </button>
      </div>

      {/* Zone de commentaires */}
      {isCommenting && (
        <form onSubmit={handleSubmitComment} className="mt-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ajouter un commentaire..."
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setIsCommenting(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Commenter
            </button>
          </div>
        </form>
      )}

      {/* Liste des commentaires */}
      {post.comments.length > 0 && (
        <div className="mt-4 space-y-4">
          {post.comments.map((comment) => (
            <div key={comment._id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              {comment.author.avatar ? (
                <img src={comment.author.avatar} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  {comment.author.name.charAt(0)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{comment.author.name}</span>
                  <span className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: fr })}
                  </span>
                </div>
                <p className="text-gray-700">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PostCard;