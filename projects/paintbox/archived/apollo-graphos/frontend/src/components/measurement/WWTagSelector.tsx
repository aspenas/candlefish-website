import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, TagIcon, CheckIcon } from '@heroicons/react/24/outline';
import type { WWTagType } from '@/types/graphql';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';

interface WWTagSelectorProps {
  selectedTags: WWTagType[];
  onSave: (tags: WWTagType[]) => void;
  onClose: () => void;
}

// WW Tag definitions with descriptions
const WWTagDefinitions: Record<WWTagType, { category: string; description: string; color: string }> = {
  WW1: { category: 'Siding', description: 'Main siding area - primary surface', color: 'blue' },
  WW2: { category: 'Siding', description: 'Secondary siding section', color: 'blue' },
  WW3: { category: 'Siding', description: 'Accent siding or different material', color: 'blue' },
  WW4: { category: 'Siding', description: 'Gable or upper level siding', color: 'blue' },
  WW5: { category: 'Siding', description: 'Foundation or lower siding', color: 'blue' },

  WW6: { category: 'Trim', description: 'Window trim - all windows', color: 'green' },
  WW7: { category: 'Trim', description: 'Door trim and casings', color: 'green' },
  WW8: { category: 'Trim', description: 'Corner boards and vertical trim', color: 'green' },
  WW9: { category: 'Trim', description: 'Fascia boards', color: 'green' },
  WW10: { category: 'Trim', description: 'Soffit and eave details', color: 'green' },

  WW11: { category: 'Doors', description: 'Front entry door', color: 'red' },
  WW12: { category: 'Doors', description: 'Garage doors', color: 'red' },
  WW13: { category: 'Doors', description: 'Side/back entry doors', color: 'red' },
  WW14: { category: 'Doors', description: 'Sliding patio doors', color: 'red' },
  WW15: { category: 'Doors', description: 'Storm/screen doors', color: 'red' },

  WW16: { category: 'Windows', description: 'Main floor windows', color: 'yellow' },
  WW17: { category: 'Windows', description: 'Upper floor windows', color: 'yellow' },
  WW18: { category: 'Windows', description: 'Basement windows', color: 'yellow' },
  WW19: { category: 'Windows', description: 'Specialty windows (bay, bow)', color: 'yellow' },
  WW20: { category: 'Windows', description: 'Window shutters', color: 'yellow' },

  WW21: { category: 'Railings', description: 'Front porch railings', color: 'purple' },
  WW22: { category: 'Railings', description: 'Deck railings', color: 'purple' },
  WW23: { category: 'Railings', description: 'Stair railings', color: 'purple' },
  WW24: { category: 'Railings', description: 'Balcony railings', color: 'purple' },
  WW25: { category: 'Railings', description: 'Handrails and balusters', color: 'purple' },

  WW26: { category: 'Specialty', description: 'Columns and pillars', color: 'gray' },
  WW27: { category: 'Specialty', description: 'Lattice work', color: 'gray' },
  WW28: { category: 'Specialty', description: 'Decorative elements', color: 'gray' },
  WW29: { category: 'Specialty', description: 'Utility areas (vents, meters)', color: 'gray' },
  WW30: { category: 'Specialty', description: 'Other/miscellaneous items', color: 'gray' },
};

const categoryColors = {
  Siding: 'blue',
  Trim: 'green',
  Doors: 'red',
  Windows: 'yellow',
  Railings: 'purple',
  Specialty: 'gray',
};

export const WWTagSelector: React.FC<WWTagSelectorProps> = ({
  selectedTags,
  onSave,
  onClose,
}) => {
  const [currentTags, setCurrentTags] = useState<WWTagType[]>(selectedTags);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = Object.keys(categoryColors);

  // Get all WW tags grouped by category
  const tagsByCategory = Object.entries(WWTagDefinitions).reduce((acc, [tag, info]) => {
    if (!acc[info.category]) {
      acc[info.category] = [];
    }
    acc[info.category].push(tag as WWTagType);
    return acc;
  }, {} as Record<string, WWTagType[]>);

  // Filter tags based on search and category
  const getFilteredTags = () => {
    let tags = Object.keys(WWTagDefinitions) as WWTagType[];

    if (selectedCategory !== 'all') {
      tags = tags.filter(tag => WWTagDefinitions[tag].category === selectedCategory);
    }

    if (searchQuery) {
      tags = tags.filter(tag =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        WWTagDefinitions[tag].description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return tags;
  };

  const toggleTag = (tag: WWTagType) => {
    setCurrentTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const selectAllInCategory = (category: string) => {
    const categoryTags = tagsByCategory[category];
    const allSelected = categoryTags.every(tag => currentTags.includes(tag));

    if (allSelected) {
      setCurrentTags(prev => prev.filter(tag => !categoryTags.includes(tag)));
    } else {
      setCurrentTags(prev => {
        const newTags = [...prev];
        categoryTags.forEach(tag => {
          if (!newTags.includes(tag)) {
            newTags.push(tag);
          }
        });
        return newTags;
      });
    }
  };

  const handleSave = () => {
    onSave(currentTags);
  };

  const filteredTags = getFilteredTags();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <TagIcon className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Select WW Tags</h2>
                <p className="text-sm text-gray-500">
                  Choose Company Cam tags to organize this photo
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search tags or descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category} ({tagsByCategory[category]?.length || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Selected Tags Summary */}
          {currentTags.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                Selected Tags ({currentTags.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {currentTags.map(tag => (
                  <Badge
                    key={tag}
                    variant="info"
                    className="cursor-pointer hover:bg-blue-200"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    <XMarkIcon className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tags by Category */}
          <div className="space-y-6">
            {categories.map(category => {
              const categoryTags = tagsByCategory[category]?.filter(tag =>
                selectedCategory === 'all' || selectedCategory === category
              ) || [];

              const visibleTags = categoryTags.filter(tag => filteredTags.includes(tag));

              if (visibleTags.length === 0) return null;

              const allSelected = visibleTags.every(tag => currentTags.includes(tag));
              const someSelected = visibleTags.some(tag => currentTags.includes(tag));
              const color = categoryColors[category as keyof typeof categoryColors];

              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={clsx(
                      'text-lg font-medium',
                      `text-${color}-700`
                    )}>
                      {category}
                    </h3>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectAllInCategory(category)}
                      className={clsx(
                        'text-xs',
                        allSelected && `bg-${color}-100 text-${color}-700 border-${color}-300`
                      )}
                    >
                      {allSelected ? (
                        <>
                          <CheckIcon className="w-3 h-3 mr-1" />
                          Deselect All
                        </>
                      ) : (
                        `Select All ${someSelected ? `(${visibleTags.filter(tag => currentTags.includes(tag)).length}/${visibleTags.length})` : ''}`
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {visibleTags.map(tag => {
                      const isSelected = currentTags.includes(tag);
                      const tagInfo = WWTagDefinitions[tag];

                      return (
                        <motion.div
                          key={tag}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <button
                            onClick={() => toggleTag(tag)}
                            className={clsx(
                              'w-full p-3 text-left rounded-lg border-2 transition-all duration-200',
                              isSelected
                                ? `border-${color}-300 bg-${color}-50`
                                : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={clsx(
                                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white',
                                  `bg-${color}-500`
                                )}>
                                  {tag.replace('WW', '')}
                                </div>

                                <div>
                                  <div className="font-medium text-gray-900">{tag}</div>
                                  <div className="text-sm text-gray-500">{tagInfo.description}</div>
                                </div>
                              </div>

                              {isSelected && (
                                <CheckIcon className={clsx('w-5 h-5', `text-${color}-600`)} />
                              )}
                            </div>
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* No Results */}
          {filteredTags.length === 0 && (
            <div className="text-center py-12">
              <TagIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tags found</h3>
              <p className="text-gray-500">Try adjusting your search criteria</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              {currentTags.length} tag{currentTags.length !== 1 ? 's' : ''} selected
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Save Tags
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};
