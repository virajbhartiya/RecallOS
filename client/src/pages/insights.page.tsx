import React, { useEffect, useState } from "react"
import {
  generateSummary,
  getSummaries,
  type BrowsingSummary,
  type PeriodType,
} from "@/services/insights.service"
import { requireAuthToken } from "@/utils/user-id.util"
import { useNavigate } from "react-router-dom"

export const Insights: React.FC = () => {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [periodType, setPeriodType] = useState<PeriodType>("daily")
  const [summaries, setSummaries] = useState<BrowsingSummary[]>([])
  const [selectedSummary, setSelectedSummary] =
    useState<BrowsingSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      requireAuthToken()
      setIsAuthenticated(true)
    } catch (error) {
      navigate("/login")
    }
  }, [navigate])

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchSummaries = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getSummaries(periodType)
        console.log("[Insights Page] Fetched summaries:", {
          periodType,
          count: data.summaries.length,
          summaries: data.summaries,
        })
        setSummaries(data.summaries)
        if (data.summaries.length > 0) {
          setSelectedSummary(data.summaries[0])
        } else {
          setSelectedSummary(null)
        }
      } catch (err) {
        const error = err as { message?: string }
        console.error("Error fetching summaries:", err)
        setError(error.message || "Failed to load summaries")
      } finally {
        setIsLoading(false)
      }
    }

    fetchSummaries()
  }, [isAuthenticated, periodType])

  const handleGenerate = async () => {
    try {
      setIsGenerating(true)
      setError(null)
      await generateSummary(periodType)

      let attempts = 0
      const maxAttempts = 30
      const pollInterval = 2000

      const pollForSummary = async () => {
        try {
          const data = await getSummaries(periodType)
          if (data.summaries.length > 0) {
            setSummaries(data.summaries)
            setSelectedSummary(data.summaries[0])
            setIsGenerating(false)
            return
          }

          attempts++
          if (attempts < maxAttempts) {
            setTimeout(pollForSummary, pollInterval)
          } else {
            setIsGenerating(false)
            setError(
              "Summary generation is taking longer than expected. Please refresh the page."
            )
          }
        } catch (err) {
          setIsGenerating(false)
          const error = err as { message?: string }
          setError(error.message || "Error checking for summary")
        }
      }

      setTimeout(pollForSummary, pollInterval)
    } catch (err) {
      setIsGenerating(false)
      const error = err as { message?: string }
      console.error("Error generating summary:", err)
      setError(error.message || "Failed to generate summary")
    }
  }

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm font-mono text-gray-600">
          Loading insights...
        </div>
      </div>
    )
  }

  if (error && summaries.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm font-mono text-red-600">Error: {error}</div>
      </div>
    )
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return (
    <div
      className="min-h-screen bg-white"
      style={{
        backgroundImage: "linear-gradient(135deg, #f9fafb, #ffffff, #f3f4f6)",
      }}
    >
      <header className="fixed top-0 inset-x-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <button
                onClick={() => (window.location.href = "/")}
                className="text-sm font-medium text-gray-700 hover:text-black transition-colors relative group"
              >
                <span className="relative z-10">← Home</span>
                <div className="absolute inset-0 bg-gray-100 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left -z-10 rounded"></div>
              </button>
              <div className="h-4 w-px bg-gray-300"></div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-lg font-mono">
                  R
                </div>
                <div className="text-sm font-medium text-gray-900">
                  Insights
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-3 py-1.5 text-xs font-mono text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? "Generating..." : "Generate"}
              </button>
              <button
                onClick={() => (window.location.href = "/inbox")}
                className="px-3 py-1.5 text-xs font-mono text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300 transition-colors"
              >
                Inbox
              </button>
              <button
                onClick={() => (window.location.href = "/knowledge-health")}
                className="px-3 py-1.5 text-xs font-mono text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300 transition-colors"
              >
                Knowledge Health
              </button>
              <button
                onClick={() => (window.location.href = "/memories")}
                className="px-3 py-1.5 text-xs font-mono text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300 transition-colors"
              >
                Memories
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="h-14" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Browsing Insights
            </h1>
            <p className="text-xs text-gray-600">
              AI-generated summaries of your browsing activity
            </p>
          </div>

          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setPeriodType("daily")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                periodType === "daily"
                  ? "text-gray-900 border-b-2 border-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setPeriodType("weekly")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                periodType === "weekly"
                  ? "text-gray-900 border-b-2 border-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Weekly
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {summaries.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded p-8 text-center">
              <p className="text-sm text-gray-600 mb-4">
                No {periodType} summaries available yet.
              </p>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? "Generating..." : "Generate Summary"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-900 mb-3">
                    {periodType === "daily" ? "Daily" : "Weekly"} Summaries
                  </h2>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {summaries.map((summary) => (
                      <button
                        key={summary.id}
                        onClick={() => setSelectedSummary(summary)}
                        className={`w-full text-left px-3 py-2 text-xs rounded transition-colors ${
                          selectedSummary?.id === summary.id
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <div className="font-medium">
                          {formatDate(summary.period_start)}
                        </div>
                        <div className="text-gray-500">
                          {summary.period_type === "daily" ? "Daily" : "Weekly"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                {selectedSummary ? (
                  <>
                    <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">
                            {formatDate(selectedSummary.period_start)} -{" "}
                            {formatDate(selectedSummary.period_end)}
                          </h2>
                          <p className="text-xs text-gray-500 mt-1">
                            Generated{" "}
                            {formatDateTime(selectedSummary.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {selectedSummary.wow_facts &&
                      selectedSummary.wow_facts.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
                          <h2 className="text-sm font-semibold text-gray-900 mb-3">
                            Wow Facts
                          </h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedSummary.wow_facts.map((fact, index) => (
                              <div
                                key={index}
                                className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded p-3"
                              >
                                <p className="text-sm text-gray-900">{fact}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {selectedSummary.narrative_summary && (
                      <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-900 mb-3">
                          Summary
                        </h2>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {selectedSummary.narrative_summary}
                        </p>
                      </div>
                    )}

                    {selectedSummary.domain_stats &&
                      Object.keys(selectedSummary.domain_stats).length > 0 && (
                        <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
                          <h2 className="text-sm font-semibold text-gray-900 mb-3">
                            Domain Statistics
                          </h2>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {Object.entries(selectedSummary.domain_stats)
                              .sort(([, a], [, b]) => b - a)
                              .slice(0, 20)
                              .map(([domain, count]) => (
                                <div
                                  key={domain}
                                  className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0"
                                >
                                  <div className="font-medium text-gray-900 truncate flex-1">
                                    {domain}
                                  </div>
                                  <div className="font-semibold text-gray-600 ml-4">
                                    {count} {count === 1 ? "visit" : "visits"}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                    {selectedSummary.topics_explored &&
                      selectedSummary.topics_explored.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
                          <h2 className="text-sm font-semibold text-gray-900 mb-3">
                            Topics Explored
                          </h2>
                          <div className="flex flex-wrap gap-2">
                            {selectedSummary.topics_explored.map(
                              (topic, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                                >
                                  {topic}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {selectedSummary.categories_explored &&
                      selectedSummary.categories_explored.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
                          <h2 className="text-sm font-semibold text-gray-900 mb-3">
                            Categories Explored
                          </h2>
                          <div className="flex flex-wrap gap-2">
                            {selectedSummary.categories_explored.map(
                              (category, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                                >
                                  {category}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {selectedSummary.time_estimates &&
                      Object.keys(selectedSummary.time_estimates).length >
                        0 && (
                        <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
                          <h2 className="text-sm font-semibold text-gray-900 mb-3">
                            Time Estimates
                          </h2>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {Object.entries(selectedSummary.time_estimates)
                              .sort(([, a], [, b]) => b - a)
                              .slice(0, 15)
                              .map(([domain, minutes]) => (
                                <div
                                  key={domain}
                                  className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0"
                                >
                                  <div className="font-medium text-gray-900 truncate flex-1">
                                    {domain}
                                  </div>
                                  <div className="font-semibold text-gray-600 ml-4">
                                    ~{Math.round(minutes)} min
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                    {selectedSummary.key_insights &&
                      selectedSummary.key_insights.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
                          <h2 className="text-sm font-semibold text-gray-900 mb-3">
                            Key Insights
                          </h2>
                          <ul className="space-y-2">
                            {selectedSummary.key_insights.map(
                              (insight, index) => (
                                <li
                                  key={index}
                                  className="text-sm text-gray-700 flex items-start"
                                >
                                  <span className="text-gray-400 mr-2">•</span>
                                  <span>{insight}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                  </>
                ) : (
                  <div className="bg-white border border-gray-200 rounded p-8 text-center">
                    <p className="text-sm text-gray-600">
                      Select a summary to view details
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
