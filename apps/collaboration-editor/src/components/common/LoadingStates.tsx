'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  ClockIcon,
  SparklesIcon,
  UsersIcon,
  CloudArrowUpIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// Base loading spinner component
export function LoadingSpinner({
  size = 'medium',
  className,
}: {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}) {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-6 w-6',
    large: 'h-8 w-8',
  };

  return (
    <motion.div
      className={cn("animate-spin rounded-full border-2 border-b-primary", sizeClasses[size], className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  );
}

// Pulsing skeleton for text
export function TextSkeleton({
  lines = 1,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <motion.div
          key={index}
          className={cn(
            "h-4 bg-gray-200 rounded animate-pulse",
            index === lines - 1 ? "w-3/4" : "w-full"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 }}
        />
      ))}
    </div>
  );
}

// Card skeleton for structured content
export function CardSkeleton({
  count = 1,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// Tree skeleton for hierarchical content
export function TreeSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: 8 }).map((_, index) => (
        <motion.div
          key={index}
          className="flex items-center space-x-2"
          style={{ paddingLeft: `${(index % 3) * 16}px` }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
          <div className={cn(
            "h-3 bg-gray-200 rounded animate-pulse",
            index % 4 === 0 ? "w-24" : index % 4 === 1 ? "w-32" : index % 4 === 2 ? "w-20" : "w-28"
          )} />
        </motion.div>
      ))}
    </div>
  );
}

// Avatar skeleton
export function AvatarSkeleton({
  count = 1,
  size = 'medium',
  className,
}: {
  count?: number;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}) {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <div className={cn("flex -space-x-1", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          className={cn(
            "bg-gray-200 rounded-full border-2 border-white animate-pulse",
            sizeClasses[size]
          )}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
        />
      ))}
    </div>
  );
}

// Document loading state
export function DocumentLoading({ message = "Loading document..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
          <DocumentTextIcon className="w-8 h-8 text-blue-600" />
        </div>
        <motion.div
          className="absolute -top-1 -right-1 w-6 h-6"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <LoadingSpinner size="small" />
        </motion.div>
      </motion.div>
      
      <div className="text-center space-y-2">
        <motion.p
          className="text-lg font-medium text-gray-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>
        <motion.p
          className="text-sm text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          This might take a few seconds...
        </motion.p>
      </div>

      {/* Animated dots */}
      <div className="flex space-x-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <motion.div
            key={index}
            className="w-2 h-2 bg-blue-400 rounded-full"
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: index * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Collaboration loading state
export function CollaborationLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
          <UsersIcon className="w-8 h-8 text-green-600" />
        </div>
        <motion.div
          className="absolute -bottom-2 -right-2 flex -space-x-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <AvatarSkeleton count={3} size="small" />
        </motion.div>
      </motion.div>

      <div className="text-center space-y-2">
        <motion.p
          className="text-lg font-medium text-gray-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Connecting to collaboration session...
        </motion.p>
        <motion.p
          className="text-sm text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Setting up real-time editing
        </motion.p>
      </div>
    </div>
  );
}

// AI suggestions loading
export function AISuggestionsLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <SparklesIcon className="w-5 h-5 text-blue-500" />
        </motion.div>
        <span className="text-sm font-medium text-gray-600">Analyzing content...</span>
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.2 }}
            className="border rounded-lg p-3 bg-blue-50/50"
          >
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-200 rounded animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-blue-200 rounded w-3/4 animate-pulse" />
                <div className="h-2 bg-blue-200 rounded w-1/2 animate-pulse" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Version history loading
export function VersionHistoryLoading() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <ClockIcon className="w-5 h-5 text-gray-400" />
        <TextSkeleton lines={1} className="flex-1" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start space-x-3 p-3 border rounded-lg"
          >
            <div className="w-3 h-3 bg-gray-200 rounded-full mt-1 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse" />
                <div className="h-2 bg-gray-200 rounded w-16 animate-pulse" />
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-2 bg-gray-200 rounded w-24 animate-pulse" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Comments loading
export function CommentsLoading() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <ChatBubbleLeftRightIcon className="w-5 h-5 text-gray-400" />
        <span className="text-sm text-gray-500">Loading comments...</span>
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.15 }}
            className="border-l-4 border-blue-200 pl-4 py-2"
          >
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
                  <div className="h-2 bg-gray-200 rounded w-12 animate-pulse" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-full animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Sync status indicator
export function SyncStatusLoading({
  progress = 0,
  message = "Syncing...",
  stage = "Saving changes",
}: {
  progress?: number;
  message?: string;
  stage?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-blue-50 border border-blue-200 rounded-lg p-4"
    >
      <div className="flex items-center space-x-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <CloudArrowUpIcon className="w-5 h-5 text-blue-600" />
        </motion.div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-blue-900">{message}</span>
            <span className="text-xs text-blue-600">{Math.round(progress)}%</span>
          </div>
          <div className="flex items-center space-x-2">
            <Progress value={progress} className="flex-1 h-2" />
            <Badge variant="secondary" className="text-xs">
              {stage}
            </Badge>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Full page loading overlay
export function FullPageLoading({
  message = "Loading...",
  description,
  progress,
}: {
  message?: string;
  description?: string;
  progress?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div className="bg-background rounded-lg shadow-lg p-8 max-w-sm w-full mx-4">
        <div className="text-center space-y-4">
          <motion.div
            className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <LoadingSpinner size="large" />
          </motion.div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{message}</h3>
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
          </div>

          {typeof progress === 'number' && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-gray-500">{Math.round(progress)}% complete</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Lazy loading wrapper component
export function LazyLoadingWrapper({
  isLoading,
  error,
  children,
  loadingComponent,
  errorComponent,
  className,
}: {
  isLoading: boolean;
  error?: Error | null;
  children: ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  className?: string;
}) {
  if (error) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        {errorComponent || (
          <div className="text-center space-y-2">
            <p className="text-red-600">Failed to load content</p>
            <p className="text-sm text-gray-500">{error.message}</p>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        {loadingComponent || <LoadingSpinner />}
      </div>
    );
  }

  return <>{children}</>;
}

// Export all components
export {
  DocumentLoading,
  CollaborationLoading,
  AISuggestionsLoading,
  VersionHistoryLoading,
  CommentsLoading,
  SyncStatusLoading,
  FullPageLoading,
  LazyLoadingWrapper,
};