/**
 * React Integration Example for Candlefish Claude Config SDK
 * 
 * This example demonstrates:
 * - Setting up the provider
 * - Using React hooks
 * - Real-time updates
 * - Error handling in React
 */

import React, { useState, useEffect } from 'react';
import {
  ConfigClientProvider,
  createClientWithApiKey,
  useConfigProfiles,
  useConfigProfile,
  useConfigWebSocket,
  useConfigHealth,
  ConfigProfile
} from '@candlefish/claude-config';

// Initialize client (typically done at app root)
const client = createClientWithApiKey(
  process.env.REACT_APP_CANDLEFISH_API_KEY || 'your-api-key'
);

// Main App Component
export function App() {
  return (
    <ConfigClientProvider client={client}>
      <div className="app">
        <h1>Candlefish Claude Config Dashboard</h1>
        <HealthStatus />
        <ConfigManager />
        <RealTimeUpdates />
      </div>
    </ConfigClientProvider>
  );
}

// Health monitoring component
function HealthStatus() {
  const { health, loading, error } = useConfigHealth();

  return (
    <div className="health-status">
      <h2>API Health</h2>
      {loading && <span>Checking...</span>}
      {error && <span className="error">Error: {error.message}</span>}
      {health && (
        <span className={`status ${health.status.toLowerCase()}`}>
          {health.status} - Last check: {new Date(health.timestamp).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

// Configuration management component
function ConfigManager() {
  const {
    profiles,
    loading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    refetch
  } = useConfigProfiles({ realtime: true });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ConfigProfile | null>(null);

  const handleCreateProfile = async (profileData: Omit<ConfigProfile, 'profile_id'>) => {
    try {
      await createProfile(profileData);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create profile:', error);
    }
  };

  const handleUpdateProfile = async (profile: ConfigProfile) => {
    try {
      await updateProfile(profile);
      setEditingProfile(null);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (window.confirm('Are you sure you want to delete this profile?')) {
      try {
        await deleteProfile(profileId);
      } catch (error) {
        console.error('Failed to delete profile:', error);
      }
    }
  };

  if (loading) return <div>Loading profiles...</div>;
  if (error) return <div className="error">Error: {error.message}</div>;

  return (
    <div className="config-manager">
      <div className="header">
        <h2>Configuration Profiles ({profiles.length})</h2>
        <button onClick={() => setShowCreateForm(true)}>
          Create New Profile
        </button>
        <button onClick={refetch}>
          Refresh
        </button>
      </div>

      {showCreateForm && (
        <CreateProfileForm
          onSubmit={handleCreateProfile}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {editingProfile && (
        <EditProfileForm
          profile={editingProfile}
          onSubmit={handleUpdateProfile}
          onCancel={() => setEditingProfile(null)}
        />
      )}

      <div className="profiles-list">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.profile_id}
            profile={profile}
            onEdit={() => setEditingProfile(profile)}
            onDelete={() => handleDeleteProfile(profile.profile_id!)}
          />
        ))}
      </div>
    </div>
  );
}

// Single profile component with real-time updates
function ProfileDetail({ profileId }: { profileId: string }) {
  const { profile, loading, error, updateProfile } = useConfigProfile(profileId, {
    realtime: true
  });

  if (loading) return <div>Loading profile...</div>;
  if (error) return <div className="error">Error: {error.message}</div>;
  if (!profile) return <div>Profile not found</div>;

  return (
    <div className="profile-detail">
      <h3>{profile.name}</h3>
      <p>Version: {profile.version}</p>
      <p>Description: {profile.description}</p>
      
      {profile.settings && (
        <div className="settings">
          <h4>Settings</h4>
          <pre>{JSON.stringify(profile.settings, null, 2)}</pre>
        </div>
      )}

      <div className="metadata">
        <p>Created: {profile.metadata?.created_at}</p>
        <p>Updated: {profile.metadata?.updated_at}</p>
        {profile.metadata?.tags && (
          <div>
            Tags: {profile.metadata.tags.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Real-time updates component
function RealTimeUpdates() {
  const [events, setEvents] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  const { connectionState, connect, disconnect } = useConfigWebSocket({
    onOpen: () => {
      setConnected(true);
      setEvents(prev => [...prev, `Connected at ${new Date().toLocaleTimeString()}`]);
    },
    onMessage: (event) => {
      setEvents(prev => [
        ...prev.slice(-9), // Keep last 10 events
        `${event.event_type}: ${JSON.stringify(event.payload)}`
      ]);
    },
    onClose: () => {
      setConnected(false);
      setEvents(prev => [...prev, `Disconnected at ${new Date().toLocaleTimeString()}`]);
    },
    onError: (error) => {
      setEvents(prev => [...prev, `Error: ${error}`]);
    }
  });

  return (
    <div className="realtime-updates">
      <h2>Real-time Updates</h2>
      <div className="controls">
        <button onClick={connect} disabled={connected}>
          Connect
        </button>
        <button onClick={disconnect} disabled={!connected}>
          Disconnect
        </button>
        <span className={`status ${connectionState}`}>
          {connectionState.toUpperCase()}
        </span>
      </div>
      
      <div className="events">
        <h3>Recent Events</h3>
        {events.length === 0 ? (
          <p>No events yet...</p>
        ) : (
          events.map((event, index) => (
            <div key={index} className="event">{event}</div>
          ))
        )}
      </div>
    </div>
  );
}

// Profile card component
function ProfileCard({
  profile,
  onEdit,
  onDelete
}: {
  profile: ConfigProfile;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="profile-card">
      <div className="profile-header">
        <h3>{profile.name}</h3>
        <span className="version">v{profile.version}</span>
      </div>
      
      {profile.description && (
        <p className="description">{profile.description}</p>
      )}

      {profile.settings?.languages && (
        <div className="languages">
          Languages: {profile.settings.languages.join(', ')}
        </div>
      )}

      {profile.metadata?.tags && (
        <div className="tags">
          {profile.metadata.tags.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      )}

      <div className="actions">
        <button onClick={onEdit}>Edit</button>
        <button onClick={onDelete} className="danger">Delete</button>
      </div>
    </div>
  );
}

// Create profile form component
function CreateProfileForm({
  onSubmit,
  onCancel
}: {
  onSubmit: (profile: Omit<ConfigProfile, 'profile_id'>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    version: '1.0.0',
    description: '',
    languages: '',
    tools: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const profile = {
      name: formData.name,
      version: formData.version,
      description: formData.description,
      settings: {
        languages: formData.languages.split(',').map(l => l.trim()).filter(Boolean),
        tools: formData.tools.split(',').map(t => t.trim()).filter(Boolean)
      }
    };

    onSubmit(profile);
  };

  return (
    <div className="modal">
      <form onSubmit={handleSubmit} className="profile-form">
        <h3>Create New Profile</h3>
        
        <div className="form-group">
          <label>Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Version *</label>
          <input
            type="text"
            value={formData.version}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Languages (comma-separated)</label>
          <input
            type="text"
            value={formData.languages}
            onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
            placeholder="typescript, javascript, python"
          />
        </div>

        <div className="form-group">
          <label>Tools (comma-separated)</label>
          <input
            type="text"
            value={formData.tools}
            onChange={(e) => setFormData({ ...formData, tools: e.target.value })}
            placeholder="npm, vite, eslint"
          />
        </div>

        <div className="form-actions">
          <button type="submit">Create Profile</button>
          <button type="button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// Edit profile form component
function EditProfileForm({
  profile,
  onSubmit,
  onCancel
}: {
  profile: ConfigProfile;
  onSubmit: (profile: ConfigProfile) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: profile.name,
    version: profile.version,
    description: profile.description || '',
    languages: profile.settings?.languages?.join(', ') || '',
    tools: profile.settings?.tools?.join(', ') || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedProfile = {
      ...profile,
      name: formData.name,
      version: formData.version,
      description: formData.description,
      settings: {
        ...profile.settings,
        languages: formData.languages.split(',').map(l => l.trim()).filter(Boolean),
        tools: formData.tools.split(',').map(t => t.trim()).filter(Boolean)
      }
    };

    onSubmit(updatedProfile);
  };

  return (
    <div className="modal">
      <form onSubmit={handleSubmit} className="profile-form">
        <h3>Edit Profile</h3>
        
        <div className="form-group">
          <label>Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Version *</label>
          <input
            type="text"
            value={formData.version}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Languages (comma-separated)</label>
          <input
            type="text"
            value={formData.languages}
            onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Tools (comma-separated)</label>
          <input
            type="text"
            value={formData.tools}
            onChange={(e) => setFormData({ ...formData, tools: e.target.value })}
          />
        </div>

        <div className="form-actions">
          <button type="submit">Update Profile</button>
          <button type="button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default App;