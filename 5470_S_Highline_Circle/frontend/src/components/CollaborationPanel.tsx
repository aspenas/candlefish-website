import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ItemNote, InterestLevel, NoteRequest, InterestRequest, UserRole } from '../types';

interface CollaborationPanelProps {
  itemId: string;
  userRole: UserRole;
  onInterestChange?: (level: InterestLevel) => void;
  onNotesUpdate?: (count: number) => void;
}

const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  itemId,
  userRole,
  onInterestChange,
  onNotesUpdate
}) => {
  const [notes, setNotes] = useState<ItemNote[]>([]);
  const [interest, setInterest] = useState<any>(null);
  const [newNote, setNewNote] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<string | null>(null);

  // Interest level colors and icons
  const interestConfig = {
    high: { color: 'text-red-600', bg: 'bg-red-50', icon: '🔥', label: 'High Interest' },
    medium: { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: '💫', label: 'Medium Interest' },
    low: { color: 'text-blue-600', bg: 'bg-blue-50', icon: '💭', label: 'Low Interest' },
    none: { color: 'text-gray-600', bg: 'bg-gray-50', icon: '⭕', label: 'No Interest' }
  };

  useEffect(() => {
    loadCollaborationData();
  }, [itemId]);

  const loadCollaborationData = async () => {
    try {
      setLoading(true);

      // Load notes and interest in parallel
      const [notesResponse, interestResponse] = await Promise.all([
        api.getItemNotes(itemId, userRole),
        api.getItemInterest(itemId)
      ]);

      setNotes(notesResponse.notes || []);
      setInterest(interestResponse.interest || { interest_level: 'none' });

      onNotesUpdate?.(notesResponse.notes?.length || 0);
    } catch (error) {
      console.error('Failed to load collaboration data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      const noteRequest: NoteRequest = {
        note: newNote,
        is_private: isPrivate && userRole === 'owner' // Only owner can make private notes
      };

      const response = await api.addItemNote(itemId, noteRequest, userRole);
      if (response.success) {
        await loadCollaborationData();
        setNewNote('');
        setIsPrivate(false);
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleUpdateNote = async (noteId: string, updatedNote: string) => {
    try {
      const noteRequest: NoteRequest = {
        note: updatedNote,
        is_private: false // Simplified for demo
      };

      await api.updateNote(noteId, noteRequest, userRole);
      await loadCollaborationData();
      setEditingNote(null);
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;

    try {
      await api.deleteNote(noteId, userRole);
      await loadCollaborationData();
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleInterestChange = async (level: InterestLevel, maxPrice?: number, notes?: string) => {
    try {
      const interestRequest: InterestRequest = {
        interest_level: level,
        max_price: maxPrice,
        notes: notes
      };

      await api.setItemInterest(itemId, interestRequest);
      setInterest({ ...interest, interest_level: level, max_price: maxPrice, notes });
      onInterestChange?.(level);
    } catch (error) {
      console.error('Failed to update interest:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Collaboration</h3>

        {/* Buyer Interest Section */}
        {userRole === 'buyer' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interest Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(interestConfig).map(([level, config]) => (
                <button
                  key={level}
                  onClick={() => handleInterestChange(level as InterestLevel)}
                  className={`
                    p-2 rounded-lg border-2 text-sm font-medium transition-all
                    ${interest?.interest_level === level
                      ? `${config.color} ${config.bg} border-current shadow-sm`
                      : 'text-gray-500 bg-gray-50 border-gray-200 hover:border-gray-300'}
                  `}
                >
                  <span className="mr-1">{config.icon}</span>
                  {config.label}
                </button>
              ))}
            </div>

            {interest?.interest_level && interest.interest_level !== 'none' && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  Current: <span className={interestConfig[interest.interest_level as InterestLevel]?.color}>
                    {interestConfig[interest.interest_level as InterestLevel]?.icon} {interestConfig[interest.interest_level as InterestLevel]?.label}
                  </span>
                </div>
                {interest.max_price && (
                  <div className="text-sm text-gray-600 mt-1">
                    Max Price: ${interest.max_price.toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Owner Interest Display */}
        {userRole === 'owner' && interest?.interest_level && interest.interest_level !== 'none' && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-1">Buyer Interest</div>
            <div className={`text-sm ${interestConfig[interest.interest_level as InterestLevel]?.color}`}>
              {interestConfig[interest.interest_level as InterestLevel]?.icon} {interestConfig[interest.interest_level as InterestLevel]?.label}
            </div>
            {interest.max_price && (
              <div className="text-sm text-gray-600 mt-1">
                Max Price: ${interest.max_price.toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes Section */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">
            Notes ({notes.length})
          </h4>
          <div className="text-sm text-gray-500">
            {userRole === 'owner' ? 'Owner View' : 'Buyer View'}
          </div>
        </div>

        {/* Add Note */}
        <div className="mb-4">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note or question..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
          <div className="flex items-center justify-between mt-2">
            {userRole === 'owner' && (
              <label className="flex items-center text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="mr-2"
                />
                Private note (owner only)
              </label>
            )}
            <div className="flex-1"></div>
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Note
            </button>
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">💬</div>
              <div className="text-sm">No notes yet. Start the conversation!</div>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={`
                  p-3 rounded-lg border ${
                    note.author === userRole
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className={`
                        text-xs font-medium px-2 py-1 rounded-full
                        ${note.author === 'owner'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'}
                      `}>
                        {note.author === 'owner' ? '🏠 Owner' : '👤 Buyer'}
                      </span>
                      {note.is_private && (
                        <span className="ml-2 text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-800">
                          🔒 Private
                        </span>
                      )}
                      <span className="ml-2 text-xs text-gray-500">
                        {formatDate(note.created_at)}
                      </span>
                    </div>

                    {editingNote === note.id ? (
                      <div className="space-y-2">
                        <textarea
                          defaultValue={note.note}
                          className="w-full p-2 border border-gray-300 rounded text-sm resize-none focus:ring-1 focus:ring-blue-500"
                          rows={3}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              handleUpdateNote(note.id, (e.target as HTMLTextAreaElement).value);
                            }
                          }}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              const textarea = document.querySelector(`textarea[defaultValue="${note.note}"]`) as HTMLTextAreaElement;
                              handleUpdateNote(note.id, textarea.value);
                            }}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingNote(null)}
                            className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {note.note}
                      </div>
                    )}
                  </div>

                  {note.author === userRole && editingNote !== note.id && (
                    <div className="flex space-x-1 ml-2">
                      <button
                        onClick={() => setEditingNote(note.id)}
                        className="text-gray-400 hover:text-blue-600 p-1"
                        title="Edit note"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-gray-400 hover:text-red-600 p-1"
                        title="Delete note"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaborationPanel;
