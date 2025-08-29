import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { 
  AlertCircle, 
  Clock, 
  Users, 
  FileText,
  MessageSquare,
  Paperclip,
  Calendar,
  Target
} from 'lucide-react';

// Components  
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';

// Types
interface SecurityCase {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  severity: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  tags: string[];
  category: string;
  subcategory: string;
  affectedAssets: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  relatedEvents: any[];
  evidence: any[];
  timeline: any[];
  playbooks: any[];
  metrics: {
    timeToDetection?: number;
    timeToContainment?: number;
    timeToResolution?: number;
    escalationCount: number;
    falsePositiveFlag: boolean;
  };
  sla: {
    responseTime: number;
    resolutionTime: number;
    breached: boolean;
  };
}

interface CaseManagementBoardProps {
  cases: SecurityCase[];
  onCaseSelect: (case: SecurityCase) => void;
  selectedCase: SecurityCase | null;
  className?: string;
}

const COLUMNS = [
  { id: 'OPEN', title: 'Open', color: 'border-blue-500' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-orange-500' },
  { id: 'RESOLVED', title: 'Resolved', color: 'border-green-500' },
  { id: 'CLOSED', title: 'Closed', color: 'border-gray-500' }
];

const PRIORITY_COLORS = {
  LOW: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20'
};

export const CaseManagementBoard: React.FC<CaseManagementBoardProps> = ({
  cases,
  onCaseSelect,
  selectedCase,
  className = ''
}) => {
  const [draggedCase, setDraggedCase] = useState<string | null>(null);

  // Group cases by status
  const casesByStatus = useMemo(() => {
    return COLUMNS.reduce((acc, column) => {
      acc[column.id] = cases.filter(c => c.status === column.id);
      return acc;
    }, {} as Record<string, SecurityCase[]>);
  }, [cases]);

  const handleDragStart = (result: any) => {
    setDraggedCase(result.draggableId);
  };

  const handleDragEnd = (result: DropResult) => {
    setDraggedCase(null);
    
    const { destination, source, draggableId } = result;
    
    if (!destination || destination.droppableId === source.droppableId) {
      return;
    }

    // Here you would update the case status in your backend
    console.log(`Move case ${draggableId} from ${source.droppableId} to ${destination.droppableId}`);
  };

  const CaseCard: React.FC<{ securityCase: SecurityCase; index: number }> = ({ 
    securityCase, 
    index 
  }) => {
    const isSelected = selectedCase?.id === securityCase.id;
    const isDueOverdue = securityCase.dueDate && 
      new Date(securityCase.dueDate).getTime() < Date.now();

    return (
      <Draggable draggableId={securityCase.id} index={index}>
        {(provided, snapshot) => (
          <motion.div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`p-4 rounded-lg border cursor-pointer mb-3 transition-all duration-200 ${
              snapshot.isDragging 
                ? 'shadow-2xl rotate-2 scale-105 bg-gray-700 border-blue-500' 
                : isSelected
                  ? 'border-blue-500 bg-blue-500/10 shadow-md'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600 hover:bg-gray-700'
            }`}
            onClick={() => onCaseSelect(securityCase)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Badge 
                  className={`${PRIORITY_COLORS[securityCase.priority]} text-xs`}
                  variant="outline"
                >
                  {securityCase.priority}
                </Badge>
                {isDueOverdue && (
                  <Badge className="text-red-400 bg-red-500/10 border-red-500/20 text-xs">
                    OVERDUE
                  </Badge>
                )}
              </div>
              
              <div className="text-xs text-gray-400">
                #{securityCase.id.slice(-6)}
              </div>
            </div>

            {/* Title */}
            <h4 className="font-semibold text-white mb-2 text-sm line-clamp-2">
              {securityCase.title}
            </h4>

            {/* Description */}
            <p className="text-xs text-gray-300 mb-3 line-clamp-3">
              {securityCase.description}
            </p>

            {/* Tags */}
            {securityCase.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {securityCase.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {securityCase.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs text-gray-400">
                    +{securityCase.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Assignee */}
            {securityCase.assignedTo && (
              <div className="flex items-center space-x-2 mb-3">
                <Avatar className="w-6 h-6">
                  <span className="text-xs font-medium">
                    {securityCase.assignedTo.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </Avatar>
                <span className="text-xs text-gray-300">
                  {securityCase.assignedTo.name}
                </span>
              </div>
            )}

            {/* Metrics */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <FileText className="w-3 h-3" />
                  <span>{securityCase.relatedEvents.length}</span>
                </div>
                
                {securityCase.evidence.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Paperclip className="w-3 h-3" />
                    <span>{securityCase.evidence.length}</span>
                  </div>
                )}
                
                {securityCase.timeline.length > 1 && (
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>{securityCase.timeline.length}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>
                  {new Date(securityCase.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* SLA Status */}
            {securityCase.sla.breached && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="flex items-center space-x-1 text-xs text-red-400">
                  <AlertCircle className="w-3 h-3" />
                  <span>SLA Breached</span>
                </div>
              </div>
            )}

            {/* Due Date */}
            {securityCase.dueDate && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className={`flex items-center space-x-1 text-xs ${
                  isDueOverdue ? 'text-red-400' : 'text-gray-400'
                }`}>
                  <Calendar className="w-3 h-3" />
                  <span>
                    Due: {new Date(securityCase.dueDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}

            {/* Playbook Progress */}
            {securityCase.playbooks.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">
                    {securityCase.playbooks[0].name}
                  </span>
                  <span className="text-xs text-white font-medium">
                    {securityCase.playbooks[0].progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1">
                  <div 
                    className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${securityCase.playbooks[0].progress}%` }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </Draggable>
    );
  };

  return (
    <div className={`${className}`}>
      <DragDropContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {COLUMNS.map((column) => {
            const columnCases = casesByStatus[column.id] || [];
            
            return (
              <Card key={column.id} className="flex flex-col h-full">
                <div className={`p-4 border-b border-gray-700 border-l-4 ${column.color}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">{column.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      {columnCases.length}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex-1 p-4">
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[500px] transition-colors duration-200 rounded-lg ${
                          snapshot.isDraggingOver 
                            ? 'bg-blue-500/5 border-2 border-dashed border-blue-500/30' 
                            : ''
                        }`}
                      >
                        {columnCases.map((securityCase, index) => (
                          <CaseCard
                            key={securityCase.id}
                            securityCase={securityCase}
                            index={index}
                          />
                        ))}
                        {provided.placeholder}
                        
                        {columnCases.length === 0 && (
                          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                            No cases in {column.title.toLowerCase()}
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              </Card>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

export default CaseManagementBoard;