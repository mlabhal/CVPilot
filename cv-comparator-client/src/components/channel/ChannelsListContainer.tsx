import React, { useState, useEffect } from 'react';
import ChannelsList from './ChannelsList';
import { Channel } from '../../types/index';
import { fetchAuthApi } from '../../services/api';

const ChannelsListContainer: React.FC = () => {
  // État pour stocker les channels
  const [channels, setChannels] = useState<Channel[]>([]);
  // État pour suivre l'ID du channel actif
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  // Effet pour charger les channels
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetchAuthApi('/channels');
        if (response.ok) {
          const data: Channel[] = await response.json();
          setChannels(data);
          if (data.length > 0) {
            setActiveChannelId(String(data[0]._id));
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des channels:', error);
      }
    };

    fetchChannels();
  }, []);

  // Fonction pour sélectionner un channel par ID
  const handleChannelSelect = (channelId: string) => {
    setActiveChannelId(channelId);
  };

  return (
    <ChannelsList
      channels={channels}
      activeChannel={activeChannelId}
      onChannelSelect={handleChannelSelect}
    />
  );
};

export default ChannelsListContainer;