import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  CloudArrowUpIcon,
  PhotoIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Item, Room, CapturedPhoto, PhotoAngle, PhotoMetadata } from '../types';

interface BulkUploadZoneProps {
  items: Item[];
  rooms: Room[];
  onPhotosUploaded: (matches: PhotoMatch[]) => void;
}

interface UploadedFile {
  file: File;
  id: string;
  name: string;
  size: number;
  preview: string;
  processed: boolean;
  matched: boolean;
  suggestedItem?: Item;
  confidence?: number;
}

interface PhotoMatch {
  file: UploadedFile;
  itemId: string;
  angle: PhotoAngle;
  confirmed: boolean;
}

interface SmartMatch {
  file: UploadedFile;
  matches: {
    item: Item;
    confidence: number;
    reasons: string[];
  }[];
}

const BulkUploadZone: React.FC<BulkUploadZoneProps> = ({
  items,
  rooms,
  onPhotosUploaded
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [photoMatches, setPhotoMatches] = useState<PhotoMatch[]>([]);
  const [smartMatches, setSmartMatches] = useState<SmartMatch[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAngle, setSelectedAngle] = useState<PhotoAngle>('main');
  const [autoMatchEnabled, setAutoMatchEnabled] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Parse filename to extract item information
  const parseFilename = useCallback((filename: string): {
    itemName?: string;
    room?: string;
    category?: string;
    angle?: PhotoAngle;
    itemId?: string;
  } => {
    const name = filename.toLowerCase().replace(/\.[^/.]+$/, '');
    const parts = name.split(/[-_\s]+/);

    const result: any = {};

    // Look for item ID patterns
    const idMatch = name.match(/(?:item|id)[-_]?(\w+)/);
    if (idMatch) result.itemId = idMatch[1];

    // Look for room names
    const roomNames = rooms.map(r => r.name.toLowerCase());
    const foundRoom = parts.find(part =>
      roomNames.some(roomName => roomName.includes(part) || part.includes(roomName))
    );
    if (foundRoom) result.room = foundRoom;

    // Look for angle indicators
    const angleKeywords = {
      main: ['main', 'primary', 'front'],
      detail: ['detail', 'close', 'zoom'],
      label: ['label', 'tag', 'sticker'],
      damage: ['damage', 'issue', 'problem'],
      angle2: ['side', 'left', 'right'],
      angle3: ['back', 'rear', 'behind']
    };

    for (const [angle, keywords] of Object.entries(angleKeywords)) {
      if (parts.some(part => keywords.includes(part))) {
        result.angle = angle as PhotoAngle;
        break;
      }
    }

    // Extract potential item name (longest meaningful part)
    const meaningfulParts = parts.filter(part =>
      part.length > 2 &&
      !angleKeywords.main.concat(...Object.values(angleKeywords)).includes(part) &&
      !roomNames.some(roomName => roomName.includes(part))
    );

    if (meaningfulParts.length > 0) {
      result.itemName = meaningfulParts.join(' ');
    }

    return result;
  }, [rooms]);

  // Generate smart matches for a file
  const generateSmartMatches = useCallback((file: UploadedFile): SmartMatch => {
    const parsed = parseFilename(file.name);
    const matches: { item: Item; confidence: number; reasons: string[] }[] = [];

    items.forEach(item => {
      let confidence = 0;
      const reasons: string[] = [];

      // Exact ID match
      if (parsed.itemId && item.id.toLowerCase().includes(parsed.itemId.toLowerCase())) {
        confidence += 90;
        reasons.push(`ID match: ${parsed.itemId}`);
      }

      // Name similarity
      if (parsed.itemName) {
        const itemNameWords = item.name.toLowerCase().split(/\s+/);
        const fileNameWords = parsed.itemName.split(/\s+/);
        const commonWords = itemNameWords.filter(word =>
          fileNameWords.some(fileWord =>
            word.includes(fileWord) || fileWord.includes(word)
          )
        );

        if (commonWords.length > 0) {
          const similarity = (commonWords.length / Math.max(itemNameWords.length, fileNameWords.length)) * 60;
          confidence += similarity;
          reasons.push(`Name similarity: ${commonWords.join(', ')}`);
        }
      }

      // Room match
      if (parsed.room) {
        const itemRoom = rooms.find(r => r.id === item.room_id);
        if (itemRoom && itemRoom.name.toLowerCase().includes(parsed.room)) {
          confidence += 20;
          reasons.push(`Room match: ${itemRoom.name}`);
        }
      }

      // Category match (less reliable)
      if (parsed.itemName) {
        const categoryKeywords = {
          'Furniture': ['chair', 'table', 'desk', 'sofa', 'couch', 'bed'],
          'Art / Decor': ['art', 'painting', 'decor', 'frame', 'sculpture'],
          'Electronics': ['tv', 'computer', 'phone', 'speaker', 'device'],
          'Lighting': ['lamp', 'light', 'fixture', 'chandelier'],
          'Rug / Carpet': ['rug', 'carpet', 'mat']
        };

        const categoryWords = categoryKeywords[item.category] || [];
        if (categoryWords.some(word => parsed.itemName!.includes(word))) {
          confidence += 15;
          reasons.push(`Category match: ${item.category}`);
        }
      }

      // Existing photos penalty (prefer items without photos)
      if (!item.images || item.images.length === 0) {
        confidence += 5;
        reasons.push('No existing photos');
      }

      if (confidence > 10) {
        matches.push({ item, confidence: Math.round(confidence), reasons });
      }
    });

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    return { file, matches: matches.slice(0, 5) };
  }, [items, rooms, parseFilename]);

  // Process uploaded files
  const processFiles = useCallback(async (files: FileList | File[]) => {
    setIsProcessing(true);
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => file.type.startsWith('image/'));

    const newUploadedFiles: UploadedFile[] = [];
    const newSmartMatches: SmartMatch[] = [];

    for (const file of validFiles) {
      const id = crypto.randomUUID();
      const preview = URL.createObjectURL(file);

      const uploadedFile: UploadedFile = {
        file,
        id,
        name: file.name,
        size: file.size,
        preview,
        processed: false,
        matched: false
      };

      newUploadedFiles.push(uploadedFile);

      if (autoMatchEnabled) {
        const smartMatch = generateSmartMatches(uploadedFile);
        newSmartMatches.push(smartMatch);

        // Auto-match if confidence is high enough
        if (smartMatch.matches.length > 0 && smartMatch.matches[0].confidence > 70) {
          uploadedFile.suggestedItem = smartMatch.matches[0].item;
          uploadedFile.confidence = smartMatch.matches[0].confidence;
          uploadedFile.matched = true;
        }
      }

      uploadedFile.processed = true;
    }

    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
    setSmartMatches(prev => [...prev, ...newSmartMatches]);
    setIsProcessing(false);
  }, [autoMatchEnabled, generateSmartMatches]);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  // Handle file input
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      processFiles(files);
    }
  }, [processFiles]);

  // Manual match assignment
  const assignMatch = useCallback((fileId: string, itemId: string, angle: PhotoAngle = 'main') => {
    setPhotoMatches(prev => {
      const existing = prev.findIndex(match => match.file.id === fileId);
      const file = uploadedFiles.find(f => f.id === fileId);

      if (!file) return prev;

      const newMatch: PhotoMatch = {
        file,
        itemId,
        angle,
        confirmed: false
      };

      if (existing >= 0) {
        return prev.map((match, index) => index === existing ? newMatch : match);
      } else {
        return [...prev, newMatch];
      }
    });

    // Update file matched status
    setUploadedFiles(prev => prev.map(file =>
      file.id === fileId ? { ...file, matched: true } : file
    ));
  }, [uploadedFiles]);

  // Confirm matches and upload
  const confirmMatches = useCallback(() => {
    const confirmedMatches = photoMatches.map(match => ({
      ...match,
      confirmed: true
    }));

    onPhotosUploaded(confirmedMatches);

    // Reset state
    setUploadedFiles([]);
    setPhotoMatches([]);
    setSmartMatches([]);
  }, [photoMatches, onPhotosUploaded]);

  // Filter items for search
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;

    const query = searchQuery.toLowerCase();
    return items.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      rooms.find(r => r.id === item.room_id)?.name.toLowerCase().includes(query)
    );
  }, [items, rooms, searchQuery]);

  const totalFiles = uploadedFiles.length;
  const matchedFiles = uploadedFiles.filter(f => f.matched).length;
  const confirmedMatches = photoMatches.filter(m => m.confirmed).length;

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          accept="image/*"
          webkitdirectory=""
          onChange={handleFileInput}
          className="hidden"
        />

        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <h3 className="text-lg font-medium text-gray-900">Upload Photos</h3>
          <p className="mt-2 text-sm text-gray-500">
            Drag and drop photos here, or click to select files
          </p>
        </div>

        <div className="mt-6 flex justify-center space-x-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <PhotoIcon className="h-4 w-4 mr-2" />
            Select Files
          </button>
          <button
            onClick={() => folderInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            Select Folder
          </button>
        </div>

        {isProcessing && (
          <div className="mt-4">
            <div className="inline-flex items-center text-sm text-gray-500">
              <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
              Processing files...
            </div>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoMatchEnabled}
              onChange={(e) => setAutoMatchEnabled(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Auto-match files to items</span>
          </label>
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Default Angle</label>
              <select
                value={selectedAngle}
                onChange={(e) => setSelectedAngle(e.target.value as PhotoAngle)}
                className="text-sm border-gray-300 rounded-md"
              >
                <option value="main">Main</option>
                <option value="detail">Detail</option>
                <option value="label">Label</option>
                <option value="damage">Damage</option>
                <option value="angle2">Side View</option>
                <option value="angle3">Back View</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      {totalFiles > 0 && (
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Upload Progress</h4>
              <p className="text-sm text-gray-500">
                {totalFiles} files • {matchedFiles} matched • {confirmedMatches} confirmed
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setUploadedFiles([]);
                  setPhotoMatches([]);
                  setSmartMatches([]);
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear All
              </button>
              {photoMatches.length > 0 && (
                <button
                  onClick={confirmMatches}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Confirm & Upload ({photoMatches.length})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File List and Matching Interface */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Match Photos to Items</h3>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {uploadedFiles.map(file => {
              const smartMatch = smartMatches.find(sm => sm.file.id === file.id);
              const currentMatch = photoMatches.find(pm => pm.file.id === file.id);

              return (
                <div key={file.id} className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Photo Preview */}
                    <div className="flex-shrink-0">
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-24 h-24 object-cover rounded-lg border"
                      />
                      <div className="mt-2 text-xs text-gray-500 text-center">
                        {(file.size / 1024).toFixed(0)}KB
                      </div>
                    </div>

                    {/* File Info and Matching */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {file.matched && (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          )}
                          <button
                            onClick={() => {
                              setUploadedFiles(prev => prev.filter(f => f.id !== file.id));
                              setPhotoMatches(prev => prev.filter(pm => pm.file.id !== file.id));
                              setSmartMatches(prev => prev.filter(sm => sm.file.id !== file.id));
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Smart Matches */}
                      {smartMatch && smartMatch.matches.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-gray-700">Suggested matches:</div>
                          {smartMatch.matches.slice(0, 3).map((match, index) => {
                            const room = rooms.find(r => r.id === match.item.room_id);
                            return (
                              <button
                                key={match.item.id}
                                onClick={() => assignMatch(file.id, match.item.id, selectedAngle)}
                                className={`w-full text-left p-2 rounded border text-sm hover:bg-gray-50 ${
                                  currentMatch?.itemId === match.item.id
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-gray-900">{match.item.name}</div>
                                    <div className="text-gray-500">
                                      {room?.name} • {match.item.category}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-xs font-medium ${
                                      match.confidence > 70 ? 'text-green-600' :
                                      match.confidence > 40 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      {match.confidence}%
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {match.reasons[0]}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Manual Item Search */}
                      {(!smartMatch?.matches.length || !file.matched) && (
                        <div className="mt-4">
                          <div className="text-xs font-medium text-gray-700 mb-2">Or select manually:</div>
                          <div className="max-h-32 overflow-y-auto space-y-1 border border-gray-200 rounded">
                            {filteredItems.slice(0, 10).map(item => {
                              const room = rooms.find(r => r.id === item.room_id);
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => assignMatch(file.id, item.id, selectedAngle)}
                                  className={`w-full text-left p-2 text-xs hover:bg-gray-50 ${
                                    currentMatch?.itemId === item.id ? 'bg-indigo-50' : ''
                                  }`}
                                >
                                  <div className="font-medium text-gray-900">{item.name}</div>
                                  <div className="text-gray-500">{room?.name} • {item.category}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkUploadZone;
