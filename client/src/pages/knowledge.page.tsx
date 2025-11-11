import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { requireAuthToken } from '@/utils/user-id.util'
import {
  getScores,
  getAchievements,
  getLearningPath,
  getBenchmarks,
  calculateScores,
  type KnowledgeScores,
  type Achievement,
  type LearningPath,
  type Benchmarks,
} from '@/services/knowledge.service'
import { toast } from 'sonner'

export const Knowledge: React.FC = () => {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [scores, setScores] = useState<KnowledgeScores | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null)
  const [benchmarks, setBenchmarks] = useState<Benchmarks | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCalculating, setIsCalculating] = useState(false)

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

    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [scoresData, achievementsData, pathData, benchmarksData] = await Promise.all([
          getScores(),
          getAchievements(),
          getLearningPath(),
          getBenchmarks(),
        ])
        setScores(scoresData)
        setAchievements(achievementsData)
        setLearningPath(pathData)
        setBenchmarks(benchmarksData)
      } catch (err) {
        console.error('Error fetching knowledge data:', err)
        toast.error('Failed to load knowledge data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [isAuthenticated])

  const handleCalculate = async () => {
    try {
      setIsCalculating(true)
      const result = await calculateScores()
      if (result.newlyUnlockedAchievements?.length > 0) {
        result.newlyUnlockedAchievements.forEach((badge: string) => {
          toast.success(`Achievement unlocked: ${badge}!`)
        })
      }
      const [scoresData, achievementsData] = await Promise.all([getScores(), getAchievements()])
      setScores(scoresData)
      setAchievements(achievementsData)
      toast.success('Scores calculated successfully')
    } catch (err) {
      console.error('Error calculating scores:', err)
      toast.error('Failed to calculate scores')
    } finally {
      setIsCalculating(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <div className="text-sm font-medium text-gray-600">Loading knowledge dashboard...</div>
        </div>
      </div>
    )
  }

  const formatScore = (score: number | null | undefined): string => {
    if (score === null || score === undefined) return 'N/A'
    return Math.round(score).toString()
  }

  const getScoreColor = (score: number): { text: string; bg: string; ring: string; gradient: string } => {
    if (score >= 80) return { text: 'text-green-600', bg: 'bg-green-50', ring: 'ring-green-200', gradient: 'from-green-400 to-emerald-500' }
    if (score >= 60) return { text: 'text-yellow-600', bg: 'bg-yellow-50', ring: 'ring-yellow-200', gradient: 'from-yellow-400 to-orange-500' }
    return { text: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-200', gradient: 'from-red-400 to-pink-500' }
  }

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Needs Improvement'
  }

  const CircularProgress = ({ score, size = 120 }: { score: number; size?: number }) => {
    const colors = getScoreColor(score)
    const circumference = 2 * Math.PI * (size / 2 - 8)
    const offset = circumference - (score / 100) * circumference

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 8}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 8}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${colors.text} transition-all duration-1000`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-3xl font-bold ${colors.text}`}>{Math.round(score)}</div>
          <div className="text-xs text-gray-500">/ 100</div>
        </div>
      </div>
    )
  }

  const MetricBar = ({ label, value, max = 100 }: { label: string; value: number; max?: number }) => {
    const percentage = Math.min(100, (value / max) * 100)
    const color = percentage >= 70 ? 'bg-green-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">{label}</span>
          <span className="font-semibold text-gray-900">{Math.round(value)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${color} transition-all duration-500 rounded-full`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <header className="fixed top-0 inset-x-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <button
                onClick={() => navigate('/')}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors relative group"
              >
                <span className="relative z-10">← Home</span>
                <div className="absolute inset-0 bg-gray-100 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left -z-10 rounded"></div>
              </button>
              <div className="h-4 w-px bg-gray-300"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 text-white flex items-center justify-center font-bold text-lg rounded-lg shadow-lg">
                  K
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Knowledge Dashboard</div>
                  <div className="text-xs text-gray-500">Track your learning velocity & impact</div>
                </div>
              </div>
            </div>
            <button
              onClick={handleCalculate}
              disabled={isCalculating}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCalculating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Calculating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Calculate Scores
                </>
              )}
            </button>
          </div>
        </div>
      </header>
      <div className="h-20" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {(!scores?.velocity && !scores?.impact) ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Scores Available</h3>
              <p className="text-sm text-gray-600 mb-6">Calculate your knowledge scores to see your learning metrics</p>
              <button
                onClick={handleCalculate}
                disabled={isCalculating}
                className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isCalculating ? 'Calculating...' : 'Calculate Now'}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {scores?.velocity && (
                  <div className={`bg-white rounded-2xl shadow-lg border-2 ${getScoreColor(scores.velocity.velocityScore).ring} overflow-hidden transition-all hover:shadow-xl`}>
                    <div className={`bg-gradient-to-r ${getScoreColor(scores.velocity.velocityScore).gradient} p-6 text-white`}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-lg font-semibold mb-1">Knowledge Velocity</h2>
                          <p className="text-sm opacity-90">How fast you're learning</p>
                        </div>
                        <div className="text-4xl">🚀</div>
                      </div>
                      <div className="flex items-center gap-6">
                        <CircularProgress score={scores.velocity.velocityScore} />
                        <div className="flex-1">
                          <div className="text-3xl font-bold mb-1">{formatScore(scores.velocity.velocityScore)}</div>
                          <div className="text-sm opacity-90">{getScoreLabel(scores.velocity.velocityScore)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <MetricBar label="Topic Rate" value={scores.velocity.topicRate} />
                      <MetricBar label="Diversity" value={scores.velocity.diversityIndex} />
                      <MetricBar label="Consistency" value={scores.velocity.consistencyScore} />
                      <MetricBar label="Depth Balance" value={scores.velocity.depthBalance} />
                    </div>
                  </div>
                )}

                {scores?.impact && (
                  <div className={`bg-white rounded-2xl shadow-lg border-2 ${getScoreColor(scores.impact.impactScore).ring} overflow-hidden transition-all hover:shadow-xl`}>
                    <div className={`bg-gradient-to-r ${getScoreColor(scores.impact.impactScore).gradient} p-6 text-white`}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-lg font-semibold mb-1">Knowledge Impact</h2>
                          <p className="text-sm opacity-90">How well you use knowledge</p>
                        </div>
                        <div className="text-4xl">💡</div>
                      </div>
                      <div className="flex items-center gap-6">
                        <CircularProgress score={scores.impact.impactScore} />
                        <div className="flex-1">
                          <div className="text-3xl font-bold mb-1">{formatScore(scores.impact.impactScore)}</div>
                          <div className="text-sm opacity-90">{getScoreLabel(scores.impact.impactScore)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <MetricBar label="Search Frequency" value={scores.impact.searchFrequency} />
                      <MetricBar label="Recall Efficiency" value={scores.impact.recallEfficiency} />
                      <MetricBar label="Connection Strength" value={scores.impact.connectionStrength} />
                      <MetricBar label="Access Quality" value={scores.impact.accessQuality} />
                    </div>
                  </div>
                )}
              </div>

              {benchmarks && (benchmarks.velocityPercentile !== null || benchmarks.impactPercentile !== null || benchmarks.connectionPercentile !== null || benchmarks.diversityPercentile !== null) && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl shadow-lg border border-purple-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🏆</span>
                    Your Rankings
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {benchmarks.velocityPercentile !== null && (
                      <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                        <div className="text-2xl font-bold text-purple-600 mb-1">
                          Top {Math.round(100 - benchmarks.velocityPercentile)}%
                        </div>
                        <div className="text-xs text-gray-600">Velocity</div>
                      </div>
                    )}
                    {benchmarks.impactPercentile !== null && (
                      <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          Top {Math.round(100 - benchmarks.impactPercentile)}%
                        </div>
                        <div className="text-xs text-gray-600">Impact</div>
                      </div>
                    )}
                    {benchmarks.connectionPercentile !== null && (
                      <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          Top {Math.round(100 - benchmarks.connectionPercentile)}%
                        </div>
                        <div className="text-xs text-gray-600">Connections</div>
                      </div>
                    )}
                    {benchmarks.diversityPercentile !== null && (
                      <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                        <div className="text-2xl font-bold text-orange-600 mb-1">
                          Top {Math.round(100 - benchmarks.diversityPercentile)}%
                        </div>
                        <div className="text-xs text-gray-600">Diversity</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🎖️</span>
                  Achievements
                </h2>
                {achievements.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {achievements.map((achievement) => (
                      <div
                        key={achievement.badgeType}
                        className={`p-4 border-2 rounded-xl transition-all hover:scale-105 ${
                          achievement.unlocked
                            ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`text-2xl ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}>
                            {achievement.unlocked ? '🏅' : '🔒'}
                          </div>
                          <div className="flex-1">
                            <div className={`text-sm font-semibold ${achievement.unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                              {achievement.badgeName}
                            </div>
                            {achievement.unlocked && (
                              <div className="text-xs text-green-600 font-medium">Unlocked!</div>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              achievement.unlocked ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-400'
                            }`}
                            style={{ width: `${Math.min(100, achievement.progress)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-600 text-center">{Math.round(achievement.progress)}%</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🎯</div>
                    <div className="text-sm">Start learning to unlock achievements!</div>
                  </div>
                )}
              </div>

              {learningPath && learningPath.recommendations.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🗺️</span>
                    Learning Path
                  </h2>
                  <div className="space-y-3">
                    {learningPath.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="p-4 border-2 border-gray-200 rounded-xl hover:border-purple-300 hover:shadow-md transition-all bg-gradient-to-r from-white to-gray-50"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </div>
                              <div className="text-base font-semibold text-gray-900">{rec.topic}</div>
                            </div>
                            <div className="text-sm text-gray-600 mb-2 ml-10">{rec.reason}</div>
                            {rec.prerequisites && rec.prerequisites.length > 0 && (
                              <div className="text-xs text-gray-500 ml-10 flex items-center gap-1">
                                <span>📚</span>
                                <span>Prerequisites: {rec.prerequisites.join(', ')}</span>
                              </div>
                            )}
                          </div>
                          <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                            Priority {rec.priority}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
