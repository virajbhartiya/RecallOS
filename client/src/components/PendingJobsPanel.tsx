import React, { useCallback, useEffect, useMemo, useState } from "react"
import { MemoryService } from "@/services/memory.service"
import { requireAuthToken } from "@/utils/user-id.util"
import {
  AlertCircle,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader,
  RefreshCw,
  RotateCcw,
  Search,
  Square,
  Trash2,
  X,
} from "lucide-react"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  EmptyState,
  ErrorMessage,
  LoadingCard,
} from "@/components/ui/loading-spinner"

interface PendingJob {
  id: string
  user_id: string
  raw_text: string
  full_text_length: number
  metadata: Record<string, unknown>
  status: "waiting" | "active" | "delayed" | "failed"
  created_at: string
  processed_on: string | null
  finished_on: string | null
  failed_reason: string | null
  attempts: number
}

interface PendingJobsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export const PendingJobsPanel: React.FC<PendingJobsPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [jobs, setJobs] = useState<PendingJob[]>([])
  const [counts, setCounts] = useState({
    total: 0,
    waiting: 0,
    active: 0,
    delayed: 0,
    failed: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<
    "all" | "waiting" | "active" | "delayed" | "failed"
  >("all")
  const [failedJobsExpanded, setFailedJobsExpanded] = useState(true)
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set())
  const [resubmittingJobs, setResubmittingJobs] = useState<Set<string>>(
    new Set()
  )
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    jobId: string | null
    jobIds?: string[]
  }>({
    isOpen: false,
    jobId: null,
  })

  const fetchPendingJobs = useCallback(async () => {
    try {
      requireAuthToken()
      setIsLoading(true)
      setError(null)

      const result = await MemoryService.getPendingJobs()
      setJobs(result.jobs)
      setCounts(result.counts)
    } catch (err) {
      const error = err as { message?: string }
      console.error("Error fetching pending jobs:", err)
      setError(error.message || "Failed to fetch pending jobs")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleDeleteJobClick = useCallback((jobId: string) => {
    setDeleteConfirm({ isOpen: true, jobId, jobIds: undefined })
  }, [])

  const handleBatchDeleteClick = useCallback(() => {
    if (selectedJobs.size === 0) return
    setDeleteConfirm({
      isOpen: true,
      jobId: null,
      jobIds: Array.from(selectedJobs),
    })
  }, [selectedJobs])

  const handleDeleteJobConfirm = useCallback(async () => {
    const jobId = deleteConfirm.jobId
    const jobIds = deleteConfirm.jobIds
    setDeleteConfirm({ isOpen: false, jobId: null, jobIds: undefined })

    try {
      requireAuthToken()

      if (jobIds && jobIds.length > 0) {
        // Batch delete multiple jobs
        await Promise.all(
          jobIds.map((id) => MemoryService.deletePendingJob(id))
        )
        setSelectedJobs(new Set())
      } else if (jobId) {
        // Single job delete
        await MemoryService.deletePendingJob(jobId)
      }

      await fetchPendingJobs()
    } catch (err) {
      const error = err as { message?: string }
      console.error("Error deleting job(s):", err)
      setError(error.message || "Failed to delete job(s)")
    }
  }, [deleteConfirm.jobId, deleteConfirm.jobIds, fetchPendingJobs])

  // Filter jobs based on search query and status filter
  const filteredJobs = useMemo(() => {
    let filtered = jobs

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((job) => job.status === statusFilter)
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((job) => {
        // Search in job ID
        if (job.id.toLowerCase().includes(query)) return true

        // Search in user ID
        if (job.user_id.toLowerCase().includes(query)) return true

        // Search in status
        if (job.status.toLowerCase().includes(query)) return true

        // Search in raw text
        if (job.raw_text.toLowerCase().includes(query)) return true

        // Search in metadata title
        const title = job.metadata?.title
        if (
          title &&
          typeof title === "string" &&
          title.toLowerCase().includes(query)
        )
          return true

        // Search in metadata URL
        const url = job.metadata?.url
        if (url && typeof url === "string" && url.toLowerCase().includes(query))
          return true

        return false
      })
    }

    return filtered
  }, [jobs, searchQuery, statusFilter])

  // Separate failed jobs from other jobs (only when showing all statuses)
  const { failedJobs, otherJobs } = useMemo(() => {
    if (statusFilter === "all") {
      const failed = filteredJobs.filter((job) => job.status === "failed")
      const other = filteredJobs.filter((job) => job.status !== "failed")
      return { failedJobs: failed, otherJobs: other }
    } else {
      // When filtering by status, show all filtered jobs in the main list
      return { failedJobs: [], otherJobs: filteredJobs }
    }
  }, [filteredJobs, statusFilter])

  const handleResubmitJob = useCallback(
    async (jobId: string) => {
      try {
        requireAuthToken()
        setResubmittingJobs((prev) => new Set(prev).add(jobId))
        setError(null)

        await MemoryService.resubmitPendingJob(jobId)
        await fetchPendingJobs()
      } catch (err) {
        const error = err as { message?: string }
        console.error("Error resubmitting job:", err)
        setError(error.message || "Failed to resubmit job")
      } finally {
        setResubmittingJobs((prev) => {
          const next = new Set(prev)
          next.delete(jobId)
          return next
        })
      }
    },
    [fetchPendingJobs]
  )

  const handleSelectJob = useCallback((jobId: string) => {
    setSelectedJobs((prev) => {
      const next = new Set(prev)
      if (next.has(jobId)) {
        next.delete(jobId)
      } else {
        next.add(jobId)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    const jobsToSelect = statusFilter === "all" ? otherJobs : filteredJobs
    const allSelected = jobsToSelect.every((job) => selectedJobs.has(job.id))

    if (allSelected) {
      // Deselect all
      setSelectedJobs(new Set())
    } else {
      // Select all jobs in the current view
      const newSelected = new Set(selectedJobs)
      jobsToSelect.forEach((job) => newSelected.add(job.id))
      setSelectedJobs(newSelected)
    }
  }, [selectedJobs, statusFilter, otherJobs, filteredJobs])

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
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "waiting":
        return <Clock className="w-4 h-4 text-yellow-600" />
      case "active":
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />
      case "delayed":
        return <AlertCircle className="w-4 h-4 text-orange-600" />
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "text-xs font-mono px-2 py-1 border uppercase"
    switch (status) {
      case "waiting":
        return (
          <span
            className={`${baseClasses} bg-yellow-50 text-yellow-800 border-yellow-200`}
          >
            WAITING
          </span>
        )
      case "active":
        return (
          <span
            className={`${baseClasses} bg-blue-50 text-blue-800 border-blue-200`}
          >
            ACTIVE
          </span>
        )
      case "delayed":
        return (
          <span
            className={`${baseClasses} bg-orange-50 text-orange-800 border-orange-200`}
          >
            DELAYED
          </span>
        )
      case "failed":
        return (
          <span
            className={`${baseClasses} bg-red-50 text-red-800 border-red-200`}
          >
            FAILED
          </span>
        )
      default:
        return (
          <span
            className={`${baseClasses} bg-gray-50 text-gray-800 border-gray-200`}
          >
            {status}
          </span>
        )
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-hidden"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 shadow-xl w-[90vw] max-w-6xl h-[90vh] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-mono font-semibold text-gray-900 truncate">
              Pending Memory Jobs
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              View all memories currently in the Redis processing queue
            </p>
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
              <div className="flex items-center space-x-4 flex-wrap flex-1 min-w-0">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search jobs by ID, text, title, URL, status..."
                    className="w-full pl-10 pr-4 py-2 text-sm font-mono border border-gray-200 bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as typeof statusFilter)
                  }
                  className="px-4 py-2 text-sm font-mono border border-gray-200 bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                >
                  <option value="all">All Status</option>
                  <option value="waiting">Waiting</option>
                  <option value="active">Active</option>
                  <option value="delayed">Delayed</option>
                  <option value="failed">Failed</option>
                </select>
                {selectedJobs.size > 0 && (
                  <button
                    onClick={handleBatchDeleteClick}
                    className="px-4 py-2 text-sm font-mono bg-red-600 text-white hover:bg-red-700 border border-red-600 flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Selected ({selectedJobs.size})</span>
                  </button>
                )}
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-4 py-2 text-sm font-mono border flex items-center space-x-2 ${
                    autoRefresh
                      ? "bg-green-50 text-green-800 border-green-200"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`}
                  />
                  <span>
                    {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
                  </span>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-xs font-mono text-gray-500 uppercase mb-1">
                  Total
                </div>
                <div className="text-2xl font-mono font-bold text-gray-900">
                  {counts.total}
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-xs font-mono text-gray-500 uppercase mb-1 flex items-center space-x-2">
                  <Clock className="w-3 h-3 text-yellow-600" />
                  <span>Waiting</span>
                </div>
                <div className="text-2xl font-mono font-bold text-yellow-600">
                  {counts.waiting}
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-xs font-mono text-gray-500 uppercase mb-1 flex items-center space-x-2">
                  <Loader className="w-3 h-3 text-blue-600" />
                  <span>Active</span>
                </div>
                <div className="text-2xl font-mono font-bold text-blue-600">
                  {counts.active}
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-xs font-mono text-gray-500 uppercase mb-1 flex items-center space-x-2">
                  <AlertCircle className="w-3 h-3 text-orange-600" />
                  <span>Delayed</span>
                </div>
                <div className="text-2xl font-mono font-bold text-orange-600">
                  {counts.delayed}
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-xs font-mono text-gray-500 uppercase mb-1 flex items-center space-x-2">
                  <AlertCircle className="w-3 h-3 text-red-600" />
                  <span>Failed</span>
                </div>
                <div className="text-2xl font-mono font-bold text-red-600">
                  {counts.failed}
                </div>
              </div>
            </div>
          </div>

          {error && <ErrorMessage message={error} />}

          {isLoading && jobs.length === 0 ? (
            <LoadingCard />
          ) : filteredJobs.length === 0 ? (
            <EmptyState
              title={
                searchQuery || statusFilter !== "all"
                  ? `No jobs found matching your filters`
                  : "No pending jobs found in the queue"
              }
            />
          ) : (
            <div className="space-y-4">
              {failedJobs.length > 0 && statusFilter === "all" && (
                <div className="bg-red-50 border border-red-200">
                  <button
                    onClick={() => setFailedJobsExpanded(!failedJobsExpanded)}
                    className="w-full flex items-center justify-between p-4 hover:bg-red-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="text-lg font-mono font-semibold text-red-900">
                        Failed Jobs ({failedJobs.length})
                      </span>
                    </div>
                    {failedJobsExpanded ? (
                      <ChevronUp className="w-5 h-5 text-red-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-red-600" />
                    )}
                  </button>
                  {failedJobsExpanded && (
                    <div className="border-t border-red-200 p-4 space-y-4">
                      {failedJobs.map((job) => (
                        <div
                          key={job.id}
                          className={`bg-white border p-6 overflow-hidden ${selectedJobs.has(job.id) ? "border-black bg-gray-50" : "border-gray-200"}`}
                        >
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3 flex-wrap gap-2">
                                <button
                                  onClick={() => handleSelectJob(job.id)}
                                  className="text-gray-600 hover:text-black transition-colors"
                                  title={
                                    selectedJobs.has(job.id)
                                      ? "Deselect"
                                      : "Select"
                                  }
                                >
                                  {selectedJobs.has(job.id) ? (
                                    <CheckSquare className="w-5 h-5" />
                                  ) : (
                                    <Square className="w-5 h-5" />
                                  )}
                                </button>
                                {getStatusIcon(job.status)}
                                {getStatusBadge(job.status)}
                                <span className="text-xs font-mono text-gray-500 break-all">
                                  ID: {job.id}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleResubmitJob(job.id)}
                                  disabled={resubmittingJobs.has(job.id)}
                                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 border border-blue-200 hover:border-blue-300 transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Resubmit job"
                                >
                                  {resubmittingJobs.has(job.id) ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteJobClick(job.id)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 border border-red-200 hover:border-red-300 transition-colors flex items-center space-x-1"
                                  title="Delete job"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="text-sm font-mono text-gray-600 mb-2 break-all">
                              User: {job.user_id}
                            </div>
                            {(() => {
                              const title = job.metadata?.title
                              if (title && typeof title === "string") {
                                return (
                                  <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2 break-words">
                                    {title}
                                  </h3>
                                )
                              }
                              return null
                            })()}
                            {(() => {
                              const url = job.metadata?.url
                              if (url && typeof url === "string") {
                                return (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-mono text-blue-600 hover:underline mb-2 block break-all"
                                  >
                                    {url}
                                  </a>
                                )
                              }
                              return null
                            })()}
                            <div className="text-sm text-gray-700 mb-3 bg-gray-50 p-3 border border-gray-200 font-mono break-words whitespace-pre-wrap">
                              {job.raw_text}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="min-w-0">
                              <div className="text-xs font-mono text-gray-500 uppercase mb-1">
                                Created
                              </div>
                              <div className="text-xs font-mono text-gray-900 break-words">
                                {formatDate(job.created_at)}
                              </div>
                            </div>
                            {job.processed_on && (
                              <div className="min-w-0">
                                <div className="text-xs font-mono text-gray-500 uppercase mb-1">
                                  Processed
                                </div>
                                <div className="text-xs font-mono text-gray-900 break-words">
                                  {formatDate(job.processed_on)}
                                </div>
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-mono text-gray-500 uppercase mb-1">
                                Length
                              </div>
                              <div className="text-xs font-mono text-gray-900">
                                {job.full_text_length.toLocaleString()} chars
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-mono text-gray-500 uppercase mb-1">
                                Attempts
                              </div>
                              <div className="text-xs font-mono text-gray-900">
                                {job.attempts}
                              </div>
                            </div>
                          </div>

                          {job.failed_reason && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 overflow-hidden">
                              <div className="text-xs font-mono text-red-800 uppercase mb-1">
                                Failed Reason
                              </div>
                              <div className="text-sm font-mono text-red-900 break-words">
                                {job.failed_reason}
                              </div>
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
              )}

              <div className="flex items-center justify-between mb-2">
                {(searchQuery || statusFilter !== "all") && (
                  <div className="text-sm font-mono text-gray-600">
                    Showing {otherJobs.length} of {jobs.length} jobs
                    {statusFilter === "all" &&
                      failedJobs.length > 0 &&
                      ` (${failedJobs.length} failed shown above)`}
                  </div>
                )}
                {otherJobs.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="text-sm font-mono text-gray-700 hover:text-gray-900 flex items-center space-x-2 px-3 py-1 border border-gray-200 hover:bg-gray-50"
                  >
                    {otherJobs.every((job) => selectedJobs.has(job.id)) ? (
                      <>
                        <CheckSquare className="w-4 h-4" />
                        <span>Deselect All</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4" />
                        <span>Select All</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              {otherJobs.map((job) => (
                <div
                  key={job.id}
                  className={`bg-white border p-6 overflow-hidden ${selectedJobs.has(job.id) ? "border-black bg-gray-50" : "border-gray-200"}`}
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3 flex-wrap gap-2">
                        <button
                          onClick={() => handleSelectJob(job.id)}
                          className="text-gray-600 hover:text-black transition-colors"
                          title={
                            selectedJobs.has(job.id) ? "Deselect" : "Select"
                          }
                        >
                          {selectedJobs.has(job.id) ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                        {getStatusIcon(job.status)}
                        {getStatusBadge(job.status)}
                        <span className="text-xs font-mono text-gray-500 break-all">
                          ID: {job.id}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {job.status === "failed" && (
                          <button
                            onClick={() => handleResubmitJob(job.id)}
                            disabled={resubmittingJobs.has(job.id)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 border border-blue-200 hover:border-blue-300 transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Resubmit job"
                          >
                            {resubmittingJobs.has(job.id) ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteJobClick(job.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 border border-red-200 hover:border-red-300 transition-colors flex items-center space-x-1"
                          title="Delete job"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm font-mono text-gray-600 mb-2 break-all">
                      User: {job.user_id}
                    </div>
                    {(() => {
                      const title = job.metadata?.title
                      if (title && typeof title === "string") {
                        return (
                          <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2 break-words">
                            {title}
                          </h3>
                        )
                      }
                      return null
                    })()}
                    {(() => {
                      const url = job.metadata?.url
                      if (url && typeof url === "string") {
                        return (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-mono text-blue-600 hover:underline mb-2 block break-all"
                          >
                            {url}
                          </a>
                        )
                      }
                      return null
                    })()}
                    <div className="text-sm text-gray-700 mb-3 bg-gray-50 p-3 border border-gray-200 font-mono break-words whitespace-pre-wrap">
                      {job.raw_text}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-gray-500 uppercase mb-1">
                        Created
                      </div>
                      <div className="text-xs font-mono text-gray-900 break-words">
                        {formatDate(job.created_at)}
                      </div>
                    </div>
                    {job.processed_on && (
                      <div className="min-w-0">
                        <div className="text-xs font-mono text-gray-500 uppercase mb-1">
                          Processed
                        </div>
                        <div className="text-xs font-mono text-gray-900 break-words">
                          {formatDate(job.processed_on)}
                        </div>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-gray-500 uppercase mb-1">
                        Length
                      </div>
                      <div className="text-xs font-mono text-gray-900">
                        {job.full_text_length.toLocaleString()} chars
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-gray-500 uppercase mb-1">
                        Attempts
                      </div>
                      <div className="text-xs font-mono text-gray-900">
                        {job.attempts}
                      </div>
                    </div>
                  </div>

                  {job.failed_reason && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 overflow-hidden">
                      <div className="text-xs font-mono text-red-800 uppercase mb-1">
                        Failed Reason
                      </div>
                      <div className="text-sm font-mono text-red-900 break-words">
                        {job.failed_reason}
                      </div>
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

        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          title={
            deleteConfirm.jobIds
              ? `Delete ${deleteConfirm.jobIds.length} Jobs`
              : "Delete Job"
          }
          message={
            deleteConfirm.jobIds
              ? `Are you sure you want to delete ${deleteConfirm.jobIds.length} selected job(s) from the queue?`
              : "Are you sure you want to delete this job from the queue?"
          }
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleDeleteJobConfirm}
          onCancel={() => {
            setDeleteConfirm({ isOpen: false, jobId: null, jobIds: undefined })
          }}
        />
      </div>
    </div>
  )
}
