import React, { useEffect, useState } from "react"
import { getRequest } from "@/utils/general-services.util"
import { requireAuthToken } from "@/utils/user-id.util"
import { useNavigate } from "react-router-dom"

interface KnowledgeScore {
  id: string
  period_type: string
  period_start: string
  period_end: string
  velocity_score: number
  impact_score: number
  topic_rate: number
  diversity_index: number
  consistency_score: number
}

interface Achievement {
  id: string
  badge_type: string
  badge_name: string
  progress: number
  unlocked_at: string | null
  created_at: string
}

interface UserBenchmark {
  velocity_percentile: number | null
  impact_percentile: number | null
  connection_percentile: number | null
  diversity_percentile: number | null
  last_calculated: string
  opt_in: boolean
}

interface KnowledgeHealthData {
  scores: KnowledgeScore[]
  achievements: Achievement[]
  benchmarks: UserBenchmark | null
}

export const KnowledgeHealth: React.FC = () => {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [data, setData] = useState<KnowledgeHealthData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<string>("weekly")

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

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [scoresRes, achievementsRes, benchmarksRes] = await Promise.all([
          getRequest("/knowledge/scores?periodType=" + selectedPeriod),
          getRequest("/knowledge/achievements"),
          getRequest("/knowledge/benchmarks"),
        ])

        const scoresData = scoresRes?.data?.data?.scores || []
        const achievementsData = achievementsRes?.data?.data?.achievements || []
        const benchmarksData = benchmarksRes?.data?.data?.benchmarks || null

        setData({
          scores: scoresData,
          achievements: achievementsData,
          benchmarks: benchmarksData,
        })
      } catch (err) {
        console.error("Error fetching knowledge health data:", err)
        setError("Failed to load knowledge health data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [isAuthenticated, selectedPeriod])

  if (!isAuthenticated) {
    return null
  }

  const latestScore = data?.scores?.[0]
  const historicalScores = data?.scores?.slice(0, 12) || []
  const unlockedAchievements =
    data?.achievements?.filter((a) => a.unlocked_at) || []
  const inProgressAchievements =
    data?.achievements?.filter((a) => !a.unlocked_at && a.progress > 0) || []

  const getPercentileColor = (percentile: number | null) => {
    if (!percentile) return "text-gray-500"
    if (percentile >= 75) return "text-green-600"
    if (percentile >= 50) return "text-yellow-600"
    if (percentile >= 25) return "text-orange-600"
    return "text-red-600"
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600"
    if (score >= 0.6) return "text-yellow-600"
    if (score >= 0.4) return "text-orange-600"
    return "text-red-600"
  }

  const generateSuggestions = () => {
    const suggestions: string[] = []

    if (!latestScore) {
      suggestions.push(
        "Start capturing more memories to generate your first knowledge score."
      )
      return suggestions
    }

    if (latestScore.velocity_score < 0.4) {
      suggestions.push(
        "Your memory capture rate is low. Try browsing more diverse content to increase velocity."
      )
    }

    if (latestScore.impact_score < 0.4) {
      suggestions.push(
        "Your memories have low impact. Focus on capturing high-quality, actionable content."
      )
    }

    if (latestScore.diversity_index < 0.5) {
      suggestions.push(
        "Your knowledge base lacks diversity. Explore different topics and domains."
      )
    }

    if (unlockedAchievements.length === 0) {
      suggestions.push(
        "You haven't unlocked any achievements yet. Keep using Cognia to earn badges!"
      )
    }

    if (data?.benchmarks) {
      if (
        data.benchmarks.velocity_percentile &&
        data.benchmarks.velocity_percentile < 25
      ) {
        suggestions.push(
          "Your velocity is below average. Consider increasing your browsing activity."
        )
      }
      if (
        data.benchmarks.impact_percentile &&
        data.benchmarks.impact_percentile < 25
      ) {
        suggestions.push(
          "Your impact score is below average. Focus on capturing more meaningful content."
        )
      }
    }

    if (suggestions.length === 0) {
      suggestions.push(
        "Great job! Your knowledge health metrics look strong. Keep it up!"
      )
    }

    return suggestions
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm font-mono text-gray-600">
          Loading knowledge health...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm font-mono text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="fixed top-0 inset-x-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <button
                onClick={() => navigate("/")}
                className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
              >
                ← Home
              </button>
              <div className="h-4 w-px bg-gray-300"></div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-lg font-mono">
                  K
                </div>
                <div className="text-sm font-medium text-gray-900">
                  Knowledge Health
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-2">
              <button
                onClick={() => navigate("/inbox")}
                className="px-2 sm:px-3 py-1.5 text-xs font-mono text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300 transition-colors whitespace-nowrap"
              >
                Inbox
              </button>
              <button
                onClick={() => navigate("/memories")}
                className="px-2 sm:px-3 py-1.5 text-xs font-mono text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300 transition-colors whitespace-nowrap"
              >
                Memories
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="h-14" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 py-8 overflow-x-hidden">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-mono font-bold text-gray-900 mb-2">
            [KNOWLEDGE HEALTH DASHBOARD]
          </h1>
          <p className="text-gray-600 font-mono">
            Track your knowledge growth, achievements, and benchmarks
          </p>
        </div>

        {/* Period Selector */}
        <div className="mb-6 bg-white border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-gray-600 uppercase tracking-wide">
              PERIOD:
            </span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-1 border border-gray-300 bg-white text-sm font-mono focus:outline-none focus:border-black"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        {/* Key Metrics Grid */}
        {latestScore && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 overflow-hidden">
            <div className="bg-white border border-gray-200 p-4">
              <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">
                VELOCITY
              </div>
              <div
                className={`text-2xl font-mono font-bold ${getScoreColor(latestScore.velocity_score)}`}
              >
                {(latestScore.velocity_score * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Memory capture rate
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-4">
              <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">
                IMPACT
              </div>
              <div
                className={`text-2xl font-mono font-bold ${getScoreColor(latestScore.impact_score)}`}
              >
                {(latestScore.impact_score * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Content quality</div>
            </div>

            <div className="bg-white border border-gray-200 p-4">
              <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">
                DIVERSITY
              </div>
              <div
                className={`text-2xl font-mono font-bold ${getScoreColor(latestScore.diversity_index)}`}
              >
                {(latestScore.diversity_index * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Topic variety</div>
            </div>

            <div className="bg-white border border-gray-200 p-4">
              <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">
                CONSISTENCY
              </div>
              <div
                className={`text-2xl font-mono font-bold ${getScoreColor(latestScore.consistency_score)}`}
              >
                {(latestScore.consistency_score * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Regular usage</div>
            </div>

            <div className="bg-white border border-gray-200 p-4">
              <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">
                TOPIC RATE
              </div>
              <div
                className={`text-2xl font-mono font-bold ${getScoreColor(latestScore.topic_rate)}`}
              >
                {latestScore.topic_rate.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Topics per period
              </div>
            </div>
          </div>
        )}

        {/* Benchmarks */}
        {data?.benchmarks && (
          <div className="bg-white border border-gray-200 p-6 mb-8">
            <div className="text-sm font-mono text-gray-700 font-semibold uppercase tracking-wide mb-4">
              [PERCENTILE RANKINGS]
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {data.benchmarks.velocity_percentile !== null && (
                <div>
                  <div className="text-xs font-mono text-gray-600 mb-1">
                    Velocity
                  </div>
                  <div
                    className={`text-xl font-mono font-bold ${getPercentileColor(data.benchmarks.velocity_percentile)}`}
                  >
                    {data.benchmarks.velocity_percentile.toFixed(0)}th
                  </div>
                </div>
              )}
              {data.benchmarks.impact_percentile !== null && (
                <div>
                  <div className="text-xs font-mono text-gray-600 mb-1">
                    Impact
                  </div>
                  <div
                    className={`text-xl font-mono font-bold ${getPercentileColor(data.benchmarks.impact_percentile)}`}
                  >
                    {data.benchmarks.impact_percentile.toFixed(0)}th
                  </div>
                </div>
              )}
              {data.benchmarks.connection_percentile !== null && (
                <div>
                  <div className="text-xs font-mono text-gray-600 mb-1">
                    Connections
                  </div>
                  <div
                    className={`text-xl font-mono font-bold ${getPercentileColor(data.benchmarks.connection_percentile)}`}
                  >
                    {data.benchmarks.connection_percentile.toFixed(0)}th
                  </div>
                </div>
              )}
              {data.benchmarks.diversity_percentile !== null && (
                <div>
                  <div className="text-xs font-mono text-gray-600 mb-1">
                    Diversity
                  </div>
                  <div
                    className={`text-xl font-mono font-bold ${getPercentileColor(data.benchmarks.diversity_percentile)}`}
                  >
                    {data.benchmarks.diversity_percentile.toFixed(0)}th
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 overflow-hidden">
          <div className="bg-white border border-gray-200 p-6 overflow-hidden">
            <div className="text-sm font-mono text-gray-700 font-semibold uppercase tracking-wide mb-4">
              [UNLOCKED ACHIEVEMENTS] ({unlockedAchievements.length})
            </div>
            {unlockedAchievements.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {unlockedAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono font-semibold text-gray-900 truncate">
                        {achievement.badge_name}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {achievement.badge_type}
                      </div>
                    </div>
                    <div className="text-xs font-mono text-gray-500 flex-shrink-0">
                      {new Date(achievement.unlocked_at!).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 font-mono">
                No achievements unlocked yet
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 p-6 overflow-hidden">
            <div className="text-sm font-mono text-gray-700 font-semibold uppercase tracking-wide mb-4">
              [IN PROGRESS] ({inProgressAchievements.length})
            </div>
            {inProgressAchievements.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {inProgressAchievements.map((achievement) => {
                  const progressPercent = Math.min(
                    achievement.progress * 100,
                    100
                  )
                  return (
                    <div
                      key={achievement.id}
                      className="p-3 bg-yellow-50 border border-yellow-200 rounded"
                    >
                      <div className="text-sm font-mono font-semibold text-gray-900 mb-1 truncate">
                        {achievement.badge_name}
                      </div>
                      <div className="text-xs text-gray-600 mb-2 truncate">
                        {achievement.badge_type}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-yellow-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${progressPercent}%`,
                            maxWidth: "100%",
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {progressPercent.toFixed(0)}% complete
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-500 font-mono">
                No achievements in progress
              </div>
            )}
          </div>
        </div>

        {/* Historical Scores Chart */}
        {historicalScores.length > 0 && (
          <div className="bg-white border border-gray-200 p-6 mb-8 overflow-hidden">
            <div className="text-sm font-mono text-gray-700 font-semibold uppercase tracking-wide mb-4">
              [HISTORICAL TRENDS]
            </div>
            <div className="space-y-4 overflow-x-auto">
              {historicalScores.slice(0, 6).map((score) => (
                <div key={score.id} className="flex items-center gap-4 min-w-0">
                  <div className="text-xs font-mono text-gray-600 w-24 flex-shrink-0">
                    {new Date(score.period_start).toLocaleDateString()}
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-2 min-w-0">
                    <div className="text-xs truncate">
                      <span className="text-gray-500">V:</span>{" "}
                      <span className={getScoreColor(score.velocity_score)}>
                        {(score.velocity_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-xs truncate">
                      <span className="text-gray-500">I:</span>{" "}
                      <span className={getScoreColor(score.impact_score)}>
                        {(score.impact_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-xs truncate">
                      <span className="text-gray-500">D:</span>{" "}
                      <span className={getScoreColor(score.diversity_index)}>
                        {(score.diversity_index * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-xs truncate">
                      <span className="text-gray-500">C:</span>{" "}
                      <span className={getScoreColor(score.consistency_score)}>
                        {(score.consistency_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        <div className="bg-blue-50 border border-blue-200 p-6">
          <div className="text-sm font-mono text-gray-700 font-semibold uppercase tracking-wide mb-4">
            [ACTIONABLE SUGGESTIONS]
          </div>
          <ul className="space-y-2">
            {generateSuggestions().map((suggestion, idx) => (
              <li
                key={idx}
                className="text-sm text-gray-800 flex items-start gap-2"
              >
                <span className="text-blue-600">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
