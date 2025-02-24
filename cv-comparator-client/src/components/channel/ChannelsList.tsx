// components/ChannelsList.tsx
import React from 'react';
import { Channel } from '../types';

interface ChannelsListProps {
  channels: Channel[];
  activeChannel: string | null | undefined;  // Ajout de undefined
  onChannelSelect: (channelSlug: string) => void;
}

const ChannelsList: React.FC<ChannelsListProps> = ({
  channels,
  activeChannel,
  onChannelSelect
}) => {
  return (
    <div className="w-64 bg-white shadow-lg h-screen p-4">
      <h2 className="text-xl font-bold mb-6 text-gray-800">Channels</h2>
      <div className="space-y-2">
        {channels.map((channel) => (
          <button
            key={channel.slug}
            onClick={() => onChannelSelect(channel.slug)}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3
              ${activeChannel === channel.slug
                ? 'bg-blue-50 text-blue-700'
                : 'hover:bg-gray-50 text-gray-700'
              }`}
          >
            <span className="text-xl">{channel.icon}</span>
            <span className="font-medium">{channel.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChannelsList;