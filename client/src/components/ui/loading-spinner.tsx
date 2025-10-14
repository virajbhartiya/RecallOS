import React from 'react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'border-2 border-gray-300 border-t-black rounded-full animate-spin',
          sizeClasses[size]
        )}
      />
    </div>
  )
}

interface LoadingSkeletonProps {
  className?: string
  lines?: number
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  className = '', 
  lines = 1 
}) => {
  return (
    <div className={cn('animate-pulse', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-gray-200 rounded mb-2 last:mb-0"
          style={{
            width: `${Math.random() * 40 + 60}%`
          }}
        />
      ))}
    </div>
  )
}

interface LoadingCardProps {
  className?: string
}

export const LoadingCard: React.FC<LoadingCardProps> = ({ className = '' }) => {
  return (
    <div className={cn('bg-white border border-gray-200 p-4', className)}>
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded mb-2 w-1/2"></div>
        <div className="h-3 bg-gray-200 rounded mb-2 w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  )
}

interface ErrorMessageProps {
  message: string
  className?: string
  onRetry?: () => void
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  className = '',
  onRetry 
}) => {
  return (
    <div className={cn('bg-red-50 border border-red-200 p-4 text-center', className)}>
      <div className="text-sm font-mono text-red-600 mb-2">
        [ERROR] {message}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 text-xs font-mono uppercase tracking-wide border border-red-300 bg-white hover:bg-red-50 hover:border-red-500 text-red-600 hover:text-red-700 transition-all duration-200"
        >
          RETRY
        </button>
      )}
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  className?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  description,
  className = '',
  action 
}) => {
  return (
    <div className={cn('text-center py-8', className)}>
      <div className="text-sm font-mono text-gray-600 mb-2">
        [EMPTY] {title}
      </div>
      {description && (
        <div className="text-sm text-gray-500 mb-4">
          {description}
        </div>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-sm font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
