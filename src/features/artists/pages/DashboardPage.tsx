import React from 'react';
import { useArtistProfile } from '../hooks/useArtistProfile';

const DashboardPage: React.FC = () => {
  const { profile } = useArtistProfile();
  return (
    <div>
      <h2 className="text-2xl font-bold">Artist Dashboard</h2>
      <p className="text-gray-600 mt-2">Welcome, {profile.displayName}</p>
    </div>
  );
};

export default DashboardPage;

