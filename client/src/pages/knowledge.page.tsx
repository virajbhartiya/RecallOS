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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm font-mono text-gray-600">Loading knowledge dashboard...</div>
      </div>
    )
  }

  const formatScore = (score: number | null | undefined): string => {
    if (score === null || score === undefined) return 'N/A'
    return Math.round(score).toString()
  }

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-50 border-green-200'
    if (score >= 60) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  return (
    <div
      className="min-h-screen bg-white"
      style={{
        backgroundImage: 'linear-gradient(135deg, #f9fafb, #ffffff, #f3f4f6)',
      }}
    >
      <header className="fixed top-0 inset-x-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <button
                onClick={() => navigate('/')}
                className="text-sm font-medium text-gray-700 hover:text-black transition-colors relative group"
              >
                <span className="relative z-10">← Home</span>
                <div className="absolute inset-0 bg-gray-100 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left -z-10 rounded"></div>
              </button>
              <div className="h-4 w-px bg-gray-300"></div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-lg font-mono">
                  K
                </div>
                <div className="text-sm font-medium text-gray-900">Knowledge Dashboard</div>
              </div>
            </div>
            <button
              onClick={handleCalculate}
              disabled={isCalculating}
              className="px-3 py-1.5 text-xs font-mono text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300 transition-colors disabled:opacity-50"
            >
              {isCalculating ? 'Calculating...' : 'Calculate Scores'}
            </button>
          </div>
        </div>
      </header>
      <div className="h-14" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Knowledge Dashboard</h1>
          <p className="text-xs text-gray-600">Track your learning velocity and knowledge impact</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className={`bg-white border-2 rounded-lg p-6 shadow-sm transition-all ${
                scores?.velocity?.velocityScore
                  ? getScoreBgColor(scores.velocity.velocityScore)
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Knowledge Velocity Score</h2>
                <div className="text-xs text-gray-500 uppercase tracking-wider">KVS</div>
              </div>
              <div className={`text-5xl font-bold mb-6 ${getScoreColor(scores?.velocity?.velocityScore || 0)}`}>
                {formatScore(scores?.velocity?.velocityScore)}
              </div>
              {scores?.velocity ? (
                <div className="space-y-2.5 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Topic Rate</span>
                    <span className="font-semibold text-gray-900">{formatScore(scores.velocity.topicRate)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Diversity</span>
                    <span className="font-semibold text-gray-900">
                      {formatScore(scores.velocity.diversityIndex)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Consistency</span>
                    <span className="font-semibold text-gray-900">
                      {formatScore(scores.velocity.consistencyScore)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Depth Balance</span>
                    <span className="font-semibold text-gray-900">
                      {formatScore(scores.velocity.depthBalance)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
                  No data available. Click "Calculate Scores" to generate.
                </div>
              )}
            </div>

            <div
              className={`bg-white border-2 rounded-lg p-6 shadow-sm transition-all ${
                scores?.impact?.impactScore ? getScoreBgColor(scores.impact.impactScore) : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Knowledge Impact Score</h2>
                <div className="text-xs text-gray-500 uppercase tracking-wider">KIS</div>
              </div>
              <div className={`text-5xl font-bold mb-6 ${getScoreColor(scores?.impact?.impactScore || 0)}`}>
                {formatScore(scores?.impact?.impactScore)}
              </div>
              {scores?.impact ? (
                <div className="space-y-2.5 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Search Frequency</span>
                    <span className="font-semibold text-gray-900">
                      {formatScore(scores.impact.searchFrequency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Recall Efficiency</span>
                    <span className="font-semibold text-gray-900">
                      {formatScore(scores.impact.recallEfficiency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Connection Strength</span>
                    <span className="font-semibold text-gray-900">
                      {formatScore(scores.impact.connectionStrength)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Access Quality</span>
                    <span className="font-semibold text-gray-900">{formatScore(scores.impact.accessQuality)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
                  No data available. Click "Calculate Scores" to generate.
                </div>
              )}
            </div>
          </div>

          {benchmarks && (benchmarks.velocityPercentile !== null || benchmarks.impactPercentile !== null) && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Your Rankings</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {benchmarks.velocityPercentile !== null && (
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Velocity</div>
                    <div className="text-lg font-bold text-gray-900">
                      Top {Math.round(100 - benchmarks.velocityPercentile)}%
                    </div>
                  </div>
                )}
                {benchmarks.impactPercentile !== null && (
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Impact</div>
                    <div className="text-lg font-bold text-gray-900">
                      Top {Math.round(100 - benchmarks.impactPercentile)}%
                    </div>
                  </div>
                )}
                {benchmarks.connectionPercentile !== null && (
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Connections</div>
                    <div className="text-lg font-bold text-gray-900">
                      Top {Math.round(100 - benchmarks.connectionPercentile)}%
                    </div>
                  </div>
                )}
                {benchmarks.diversityPercentile !== null && (
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">Diversity</div>
                    <div className="text-lg font-bold text-gray-900">
                      Top {Math.round(100 - benchmarks.diversityPercentile)}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Achievements</h2>
            {achievements.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.badgeType}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      achievement.unlocked
                        ? 'border-green-500 bg-green-50 shadow-sm'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="text-xs font-semibold text-gray-900 mb-2 min-h-[2.5rem]">
                      {achievement.badgeName}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          achievement.unlocked ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${Math.min(100, achievement.progress)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs font-medium text-gray-600 text-center">
                      {Math.round(achievement.progress)}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500 text-center py-8">
                No achievements yet. Keep learning to unlock badges!
              </div>
            )}
          </div>

          {learningPath && learningPath.recommendations.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Learning Path</h2>
              <div className="space-y-3">
                {learningPath.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-gray-500 bg-white px-2 py-0.5 rounded border">
                            #{index + 1}
                          </span>
                          <h3 className="text-sm font-semibold text-gray-900">{rec.topic}</h3>
                        </div>
                        <p className="text-xs text-gray-600 mb-2 leading-relaxed">{rec.reason}</p>
                        {rec.prerequisites && rec.prerequisites.length > 0 && (
                          <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                            <span className="font-medium">Prerequisites:</span>{' '}
                            {rec.prerequisites.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <div className="text-xs font-semibold text-gray-600 bg-white px-2.5 py-1 rounded border">
                          Priority {rec.priority}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {learningPath && learningPath.recommendations.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Learning Path</h2>
              <div className="text-xs text-gray-500 text-center py-8">
                No recommendations available. Generate a learning path to get personalized suggestions.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
