import React, { useEffect, useState } from "react"
import {
  calculateScores,
  getAchievements,
  getBenchmarks,
  getLearningPath,
  getScores,
  type Achievement,
  type Benchmarks,
  type KnowledgeScores,
  type LearningPath,
  type LearningRecommendation,
} from "@/services/knowledge.service"
import { requireAuthToken } from "@/utils/user-id.util"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

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
      navigate("/login")
    }
  }, [navigate])

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [scoresData, achievementsData, pathData, benchmarksData] =
          await Promise.all([
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
        console.error("Error fetching knowledge data:", err)
        toast.error("Failed to load knowledge data")
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
      const [scoresData, achievementsData] = await Promise.all([
        getScores(),
        getAchievements(),
      ])
      setScores(scoresData)
      setAchievements(achievementsData)
      toast.success("Scores calculated successfully")
    } catch (err) {
      console.error("Error calculating scores:", err)
      toast.error("Failed to calculate scores")
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
        <div className="text-sm font-mono text-gray-600">
          Loading knowledge dashboard...
        </div>
      </div>
    )
  }

  const formatScore = (score: number | null | undefined): string => {
    if (score === null || score === undefined) return "N/A"
    return Math.round(score).toString()
  }

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="min-h-screen bg-white">
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
                  Knowledge Dashboard
                </div>
              </div>
            </div>
            <button
              onClick={handleCalculate}
              disabled={isCalculating}
              className="px-3 py-1.5 text-xs font-mono text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300 transition-colors disabled:opacity-50"
            >
              {isCalculating ? "Calculating..." : "Calculate Scores"}
            </button>
          </div>
        </div>
      </header>
      <div className="h-14" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">
                Knowledge Velocity Score
              </h2>
              <div
                className={`text-4xl font-bold ${getScoreColor(scores?.velocity?.velocityScore || 0)}`}
              >
                {formatScore(scores?.velocity?.velocityScore)}
              </div>
              {scores?.velocity && (
                <div className="mt-4 space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Topic Rate:</span>
                    <span className="font-semibold">
                      {formatScore(scores.velocity.topicRate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diversity:</span>
                    <span className="font-semibold">
                      {formatScore(scores.velocity.diversityIndex)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Consistency:</span>
                    <span className="font-semibold">
                      {formatScore(scores.velocity.consistencyScore)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Depth Balance:</span>
                    <span className="font-semibold">
                      {formatScore(scores.velocity.depthBalance)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">
                Knowledge Impact Score
              </h2>
              <div
                className={`text-4xl font-bold ${getScoreColor(scores?.impact?.impactScore || 0)}`}
              >
                {formatScore(scores?.impact?.impactScore)}
              </div>
              {scores?.impact && (
                <div className="mt-4 space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Search Frequency:</span>
                    <span className="font-semibold">
                      {formatScore(scores.impact.searchFrequency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Retrieval Efficiency:</span>
                    <span className="font-semibold">
                      {formatScore(scores.impact.retrievalEfficiency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Connection Strength:</span>
                    <span className="font-semibold">
                      {formatScore(scores.impact.connectionStrength)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Access Quality:</span>
                    <span className="font-semibold">
                      {formatScore(scores.impact.accessQuality)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {benchmarks && (
            <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Your Rankings
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                {benchmarks.velocityPercentile !== null && (
                  <div>
                    <div className="text-gray-600">Velocity</div>
                    <div className="font-semibold text-gray-900">
                      Top {Math.round(100 - benchmarks.velocityPercentile)}%
                    </div>
                  </div>
                )}
                {benchmarks.impactPercentile !== null && (
                  <div>
                    <div className="text-gray-600">Impact</div>
                    <div className="font-semibold text-gray-900">
                      Top {Math.round(100 - benchmarks.impactPercentile)}%
                    </div>
                  </div>
                )}
                {benchmarks.connectionPercentile !== null && (
                  <div>
                    <div className="text-gray-600">Connections</div>
                    <div className="font-semibold text-gray-900">
                      Top {Math.round(100 - benchmarks.connectionPercentile)}%
                    </div>
                  </div>
                )}
                {benchmarks.diversityPercentile !== null && (
                  <div>
                    <div className="text-gray-600">Diversity</div>
                    <div className="font-semibold text-gray-900">
                      Top {Math.round(100 - benchmarks.diversityPercentile)}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Achievements
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {achievements.map((achievement) => (
                <div
                  key={achievement.badgeType}
                  className={`p-3 border rounded ${
                    achievement.unlocked
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="text-xs font-medium text-gray-900 mb-1">
                    {achievement.badgeName}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                    <div
                      className={`h-1.5 rounded-full ${
                        achievement.unlocked ? "bg-green-500" : "bg-gray-400"
                      }`}
                      style={{
                        width: `${Math.min(100, achievement.progress)}%`,
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-600">
                    {Math.round(achievement.progress)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {learningPath && (
            <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Learning Path
              </h2>
              {learningPath.recommendations.length > 0 ? (
                <div className="space-y-2">
                  {learningPath.recommendations.map(
                    (rec: LearningRecommendation, index: number) => (
                      <div
                        key={index}
                        className="p-3 border border-gray-200 rounded"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {rec.topic}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {rec.reason}
                            </div>
                            {rec.prerequisites &&
                              rec.prerequisites.length > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Prerequisites: {rec.prerequisites.join(", ")}
                                </div>
                              )}
                          </div>
                          <div className="text-xs font-semibold text-gray-600">
                            Priority: {rec.priority}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  No recommendations available
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
