import React, { useState, useEffect, useCallback } from 'react'
import { MemoryService } from '@/services/memoryService'
import { requireAuthToken } from '@/utils/userId'
import { Clock, RefreshCw, AlertCircle, Loader, X } from 'lucide-react'
import { LoadingCard, ErrorMessage, EmptyState } from '@/components/ui/loading-spinner'

interface PendingJob {
  id: string
  user_id: string
  raw_text: string
  full_text_length: number
  metadata: Record<string, unknown>
  status: 'waiting' | 'active' | 'delayed'
  created_at: string
  processed_on: string | null
  finished_on: string | null
  failed_reason: string | null
  attempts: number
}

interface PendingJobsPanelProps {
  userId: string | null
  isOpen: boolean
  onClose: () => void
}

export const PendingJobsPanel: React.FC<PendingJobsPanelProps> = ({ userId, isOpen, onClose }) => {
  const [jobs, setJobs] = useState<PendingJob[]>([])
  const [counts, setCounts] = useState({ total: 0, waiting: 0, active: 0, delayed: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchPendingJobs = useCallback(async () => {
    try {
      requireAuthToken()
      setIsLoading(true)
      setError(null)

      if (!userId) {
        setError('User ID is required')
        setIsLoading(false)
        return
      }

      const result = await MemoryService.getPendingJobs(userId)
      setJobs(result.jobs)
      setCounts(result.counts)
    } catch (err: any) {
      console.error('Error fetching pending jobs:', err)
      setError(err.message || 'Failed to fetch pending jobs')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!isOpen) return
    
    fetchPendingJobs()

    let interval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      interval = setInterval(fetchPendingJobs, 5000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isOpen, fetchPendingJobs, autoRefresh])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'active':
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />
      case 'delayed':
        return <AlertCircle className="w-4 h-4 text-orange-600" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = 'text-xs font-mono px-2 py-1 border uppercase'
    switch (status) {
      case 'waiting':
        return <span className={`${baseClasses} bg-yellow-50 text-yellow-800 border-yellow-200`}>WAITING</span>
      case 'active':
        return <span className={`${baseClasses} bg-blue-50 text-blue-800 border-blue-200`}>ACTIVE</span>
      case 'delayed':
        return <span className={`${baseClasses} bg-orange-50 text-orange-800 border-orange-200`}>DELAYED</span>
      default:
        return <span className={`${baseClasses} bg-gray-50 text-gray-800 border-gray-200`}>{status}</span>
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-hidden" onClick={onClose}>
      <div 
        className="bg-white border border-gray-200 shadow-xl w-[90vw] max-w-6xl h-[90vh] max-h-[90vh] flex flex-col overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-mono font-semibold text-gray-900 truncate">Pending Memory Jobs</h2>
            <p className="text-xs text-gray-600 mt-1">View all memories currently in the Redis processing queue</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded flex-shrink-0 ml-4"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-gray-50">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
              <div className="flex items-center space-x-4 flex-wrap">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-4 py-2 text-sm font-mono border flex items-center space-x-2 ${
                    autoRefresh
                      ? 'bg-green-50 text-green-800 border-green-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                  <span>{autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}</span>
                </button>
                <button
                  onClick={fetchPendingJobs}
                  className="px-4 py-2 text-sm font-mono bg-black text-white hover:bg-gray-800 border border-black flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-xs font-mono text-gray-500 uppercase mb-1">Total</div>
                <div className="text-2xl font-mono font-bold text-gray-900">{counts.total}</div>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-xs font-mono text-gray-500 uppercase mb-1 flex items-center space-x-2">
                  <Clock className="w-3 h-3 text-yellow-600" />
                  <span>Waiting</span>
                </div>
                <div className="text-2xl font-mono font-bold text-yellow-600">{counts.waiting}</div>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-xs font-mono text-gray-500 uppercase mb-1 flex items-center space-x-2">
                  <Loader className="w-3 h-3 text-blue-600" />
                  <span>Active</span>
                </div>
                <div className="text-2xl font-mono font-bold text-blue-600">{counts.active}</div>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-xs font-mono text-gray-500 uppercase mb-1 flex items-center space-x-2">
                  <AlertCircle className="w-3 h-3 text-orange-600" />
                  <span>Delayed</span>
                </div>
                <div className="text-2xl font-mono font-bold text-orange-600">{counts.delayed}</div>
              </div>
            </div>
          </div>

          {error && <ErrorMessage message={error} />}

          {isLoading && jobs.length === 0 ? (
            <LoadingCard />
          ) : jobs.length === 0 ? (
            <EmptyState title="No pending jobs found in the queue" />
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white border border-gray-200 p-6 overflow-hidden">
                  <div className="mb-4">
                    <div className="flex items-center space-x-3 mb-2 flex-wrap gap-2">
                      {getStatusIcon(job.status)}
                      {getStatusBadge(job.status)}
                      <span className="text-xs font-mono text-gray-500 break-all">ID: {job.id}</span>
                    </div>
                    <div className="text-sm font-mono text-gray-600 mb-2 break-all">
                      User: {job.user_id}
                    </div>
                    {(() => {
                      const title = job.metadata?.title;
                      if (title && typeof title === 'string') {
                        return (
                          <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2 break-words">
                            {title}
                          </h3>
                        );
                      }
                      return null;
                    })()}
                    {(() => {
                      const url = job.metadata?.url;
                      if (url && typeof url === 'string') {
                        return (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-mono text-blue-600 hover:underline mb-2 block break-all"
                          >
                            {url}
                          </a>
                        );
                      }
                      return null;
                    })()}
                    <div className="text-sm text-gray-700 mb-3 bg-gray-50 p-3 border border-gray-200 font-mono break-words whitespace-pre-wrap">
                      {job.raw_text}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-gray-500 uppercase mb-1">Created</div>
                      <div className="text-xs font-mono text-gray-900 break-words">{formatDate(job.created_at)}</div>
                    </div>
                    {job.processed_on && (
                      <div className="min-w-0">
                        <div className="text-xs font-mono text-gray-500 uppercase mb-1">Processed</div>
                        <div className="text-xs font-mono text-gray-900 break-words">{formatDate(job.processed_on)}</div>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-gray-500 uppercase mb-1">Length</div>
                      <div className="text-xs font-mono text-gray-900">{job.full_text_length.toLocaleString()} chars</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-gray-500 uppercase mb-1">Attempts</div>
                      <div className="text-xs font-mono text-gray-900">{job.attempts}</div>
                    </div>
                  </div>

                  {job.failed_reason && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 overflow-hidden">
                      <div className="text-xs font-mono text-red-800 uppercase mb-1">Failed Reason</div>
                      <div className="text-sm font-mono text-red-900 break-words">{job.failed_reason}</div>
                    </div>
                  )}

                  {Object.keys(job.metadata).length > 0 && (
                    <div className="mt-4">
                      <details className="text-sm">
                        <summary className="cursor-pointer font-mono text-gray-600 hover:text-gray-900">
                          View Metadata
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-50 border border-gray-200 text-xs font-mono text-gray-700 overflow-x-auto">
                          {JSON.stringify(job.metadata, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
