import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { requireAuthToken } from '@/utils/userId'
import { getAnalytics, type AnalyticsData } from '@/services/analytics'

export const Analytics: React.FC = () => {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      requireAuthToken()
      setIsAuthenticated(true)
    } catch (error) {
      navigate('/login')
    }
  }, [navigate])

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchAnalytics = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getAnalytics()
        setAnalytics(data)
      } catch (err: any) {
        console.error('Error fetching analytics:', err)
        setError(err.message || 'Failed to load analytics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm font-mono text-gray-600">Loading analytics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm font-mono text-red-600">Error: {error}</div>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const sortedDates = Object.keys(analytics.tokenUsage.byDate).sort()

  return (
    <div className="min-h-screen bg-white" style={{
      backgroundImage: 'linear-gradient(135deg, #f9fafb, #ffffff, #f3f4f6)',
    }}>
      <header className="fixed top-0 inset-x-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <button 
                onClick={() => window.location.href = '/'}
                className="text-sm font-medium text-gray-700 hover:text-black transition-colors relative group"
              >
                <span className="relative z-10">← Home</span>
                <div className="absolute inset-0 bg-gray-100 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left -z-10 rounded"></div>
              </button>
              <div className="h-4 w-px bg-gray-300"></div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-lg font-mono">R</div>
                <div className="text-sm font-medium text-gray-900">Analytics</div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="h-16 sm:h-20" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p className="text-sm text-gray-600">Comprehensive statistics about your memories and usage</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 p-4">
              <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Total Memories</div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(analytics.overview.totalMemories)}</div>
            </div>
            <div className="bg-white border border-gray-200 p-4">
              <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Total Tokens</div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(analytics.overview.totalTokens)}</div>
            </div>
            <div className="bg-white border border-gray-200 p-4">
              <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Total Searches</div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(analytics.overview.totalSearches)}</div>
            </div>
            <div className="bg-white border border-gray-200 p-4">
              <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Top Domain</div>
              <div className="text-2xl font-bold text-gray-900 truncate">{analytics.overview.mostActiveDomain || 'N/A'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Token Usage by Operation</h2>
              <div className="space-y-3">
                {Object.entries(analytics.tokenUsage.byOperation).map(([op, stats]) => (
                  <div key={op} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 capitalize">{op.replace('_', ' ')}</div>
                      <div className="text-xs text-gray-600">{stats.count} operations</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{formatNumber(stats.total)}</div>
                      <div className="text-xs text-gray-500">tokens</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Domains</h2>
              <div className="space-y-3">
                {analytics.domainAnalytics.topDomains.slice(0, 10).map(({ domain, count }) => (
                  <div key={domain} className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900 truncate flex-1">{domain}</div>
                    <div className="text-sm font-semibold text-gray-600 ml-4">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Token Usage Over Time</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sortedDates.slice(-30).map(date => {
                  const usage = analytics.tokenUsage.byDate[date]
                  return (
                    <div key={date} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{formatDate(date)}</span>
                      <span className="font-medium text-gray-900">{formatNumber(usage.total)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Memories by Source</h2>
              <div className="space-y-3">
                {Object.entries(analytics.memoryStatistics.bySource).map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900 capitalize">{source}</div>
                    <div className="text-sm font-semibold text-gray-600">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Categories</h2>
              <div className="space-y-3">
                {analytics.categoryTopicAnalytics.topCategories.slice(0, 10).map(({ category, count }) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900 capitalize">{category}</div>
                    <div className="text-sm font-semibold text-gray-600">{count}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Topics</h2>
              <div className="space-y-3">
                {analytics.categoryTopicAnalytics.topTopics.slice(0, 10).map(({ topic, count }) => (
                  <div key={topic} className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900 capitalize">{topic}</div>
                    <div className="text-sm font-semibold text-gray-600">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Content Statistics</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Average Length</span>
                  <span className="text-sm font-semibold text-gray-900">{formatNumber(analytics.contentAnalytics.averageContentLength)} chars</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Processed</span>
                  <span className="text-sm font-semibold text-gray-900">{formatNumber(analytics.contentAnalytics.totalContentProcessed)} chars</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Relationships</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Relations</span>
                  <span className="text-sm font-semibold text-gray-900">{formatNumber(analytics.relationshipAnalytics.totalRelations)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg per Memory</span>
                  <span className="text-sm font-semibold text-gray-900">{analytics.relationshipAnalytics.averageConnectionsPerMemory.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Snapshots</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Snapshots</span>
                  <span className="text-sm font-semibold text-gray-900">{formatNumber(analytics.snapshotAnalytics.totalSnapshots)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg per Memory</span>
                  <span className="text-sm font-semibold text-gray-900">{analytics.snapshotAnalytics.averageSnapshotsPerMemory.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Distribution</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(analytics.categoryTopicAnalytics.sentimentDistribution).map(([sentiment, count]) => (
                <div key={sentiment} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-600 capitalize">{sentiment}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

