import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { IncidentPriority, IncidentStatus, Severity } from '../../types/security';
import clsx from 'clsx';

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (incident: {
    title: string;
    description: string;
    priority: IncidentPriority;
    severity: Severity;
    affectedSystems: string[];
  }) => void;
}

const CreateIncidentModal: React.FC<CreateIncidentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: IncidentPriority.MEDIUM,
    severity: Severity.MEDIUM,
    affectedSystems: [] as string[],
    systemInput: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      severity: formData.severity,
      affectedSystems: formData.affectedSystems,
    });
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setFormData({
      title: '',
      description: '',
      priority: IncidentPriority.MEDIUM,
      severity: Severity.MEDIUM,
      affectedSystems: [],
      systemInput: '',
    });
  };

  const handleAddSystem = () => {
    if (formData.systemInput && !formData.affectedSystems.includes(formData.systemInput)) {
      setFormData({
        ...formData,
        affectedSystems: [...formData.affectedSystems, formData.systemInput],
        systemInput: '',
      });
    }
  };

  const handleRemoveSystem = (system: string) => {
    setFormData({
      ...formData,
      affectedSystems: formData.affectedSystems.filter((s) => s !== system),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-soc-surface border border-soc-border rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-soc-border">
          <h2 className="text-xl font-semibold text-white">Create New Incident</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Incident Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="soc-input w-full"
              placeholder="Brief description of the incident"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Description
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="soc-input w-full min-h-[100px] resize-none"
              placeholder="Detailed description of the incident"
            />
          </div>

          {/* Priority and Severity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as IncidentPriority })}
                className="soc-input w-full"
              >
                <option value={IncidentPriority.LOW}>Low</option>
                <option value={IncidentPriority.MEDIUM}>Medium</option>
                <option value={IncidentPriority.HIGH}>High</option>
                <option value={IncidentPriority.CRITICAL}>Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Severity
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as Severity })}
                className="soc-input w-full"
              >
                <option value={Severity.INFO}>Info</option>
                <option value={Severity.LOW}>Low</option>
                <option value={Severity.MEDIUM}>Medium</option>
                <option value={Severity.HIGH}>High</option>
                <option value={Severity.CRITICAL}>Critical</option>
              </select>
            </div>
          </div>

          {/* Affected Systems */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Affected Systems
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.systemInput}
                onChange={(e) => setFormData({ ...formData, systemInput: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSystem())}
                className="soc-input flex-1"
                placeholder="Add affected system"
              />
              <button
                type="button"
                onClick={handleAddSystem}
                className="soc-button-primary px-4"
              >
                Add
              </button>
            </div>
            {formData.affectedSystems.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.affectedSystems.map((system) => (
                  <span
                    key={system}
                    className="px-3 py-1 bg-soc-elevated rounded-full text-sm text-white flex items-center gap-2"
                  >
                    {system}
                    <button
                      type="button"
                      onClick={() => handleRemoveSystem(system)}
                      className="text-muted hover:text-critical-400"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-soc-border">
          <button
            type="button"
            onClick={onClose}
            className="soc-button-secondary px-6 py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="soc-button-primary px-6 py-2"
          >
            Create Incident
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateIncidentModal;