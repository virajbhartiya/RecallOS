import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { requireAuthToken } from '@/utils/userId'
import { getProfile, refreshProfile, type UserProfile } from '@/services/profile'
import { ErrorMessage, EmptyState } from '../components/ui/loading-spinner'

export const Profile: React.FC = () => {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
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

    const fetchProfile = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getProfile()
        setProfile(data)
      } catch (err: any) {
        console.error('Error fetching profile:', err)
        setError(err.message || 'Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [isAuthenticated])

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      setError(null)
      const data = await refreshProfile()
      setProfile(data)
    } catch (err: any) {
      console.error('Error refreshing profile:', err)
      setError(err.message || 'Failed to refresh profile')
    } finally {
      setIsRefreshing(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <div className="text-sm text-gray-600">Loading profile...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Your Profile
              </h1>
              <p className="text-gray-600">
                Automatically maintained profile based on your processed content
              </p>
            </div>
            <div className="flex items-center gap-3">
              {profile && (
                <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-md">
                  Version {profile.version}
                </div>
              )}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-6 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isRefreshing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Refreshing...
                  </>
                ) : (
                  'Refresh Profile'
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage 
              message={error}
              onRetry={() => setError(null)}
            />
          </div>
        )}

        {!profile && !error && (
          <EmptyState
            title="No profile available"
            description="Process some content to generate your profile"
            action={{
              label: "Go to Memories",
              onClick: () => navigate('/memories')
            }}
          />
        )}

        {profile && (
          <div className="space-y-8">
            {/* Profile Metadata */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500 mb-1">Version</span>
                  <span className="text-base font-medium text-gray-900">{profile.version}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500 mb-1">Last Updated</span>
                  <span className="text-base font-medium text-gray-900">
                    {new Date(profile.last_updated).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {profile.last_memory_analyzed && (
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500 mb-1">Last Memory Analyzed</span>
                    <span className="text-base font-medium text-gray-900">
                      {new Date(profile.last_memory_analyzed).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Static Profile */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Static Profile</h2>
                <p className="text-sm text-gray-600">Long-term facts and characteristics about you</p>
              </div>
              
              {profile.static_profile.text && (
                <div className="mb-8 p-5 bg-blue-50 rounded-lg border border-blue-100">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3 uppercase tracking-wide">
                    Summary
                  </h3>
                  <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {profile.static_profile.text}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Interests */}
                {Array.isArray(profile.static_profile.json.interests) && profile.static_profile.json.interests.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Interests
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.static_profile.json.interests.map((interest, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-md"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {Array.isArray(profile.static_profile.json.skills) && profile.static_profile.json.skills.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.static_profile.json.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-md"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Profession */}
                {profile.static_profile.json.profession && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Profession
                    </h3>
                    <p className="text-base font-medium text-gray-900">
                      {profile.static_profile.json.profession}
                    </p>
                  </div>
                )}

                {/* Domains */}
                {Array.isArray(profile.static_profile.json.domains) && profile.static_profile.json.domains.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Domains
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.static_profile.json.domains.map((domain, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-md"
                        >
                          {domain}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expertise Areas */}
                {Array.isArray(profile.static_profile.json.expertise_areas) && profile.static_profile.json.expertise_areas.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Expertise Areas
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.static_profile.json.expertise_areas.map((area, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-md"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Long-term Patterns */}
                {Array.isArray(profile.static_profile.json.long_term_patterns) && profile.static_profile.json.long_term_patterns.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Long-term Patterns
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.static_profile.json.long_term_patterns.map((pattern, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-md"
                        >
                          {pattern}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Demographics */}
                {profile.static_profile.json.demographics && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Demographics
                    </h3>
                    <div className="space-y-2">
                      {profile.static_profile.json.demographics.age_range && (
                        <div>
                          <span className="text-sm text-gray-600">Age Range:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.demographics.age_range}
                          </span>
                        </div>
                      )}
                      {profile.static_profile.json.demographics.location && (
                        <div>
                          <span className="text-sm text-gray-600">Location:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.demographics.location}
                          </span>
                        </div>
                      )}
                      {profile.static_profile.json.demographics.education && (
                        <div>
                          <span className="text-sm text-gray-600">Education:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.demographics.education}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Personality Traits */}
                {Array.isArray(profile.static_profile.json.personality_traits) && profile.static_profile.json.personality_traits.length > 0 && (
                  <div className="bg-purple-50 rounded-lg p-5 border border-purple-200">
                    <h3 className="text-sm font-semibold text-purple-900 mb-3 uppercase tracking-wide">
                      Personality Traits
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.static_profile.json.personality_traits.map((trait, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-sm font-medium bg-white border border-purple-300 text-purple-900 rounded-md"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Work Style */}
                {profile.static_profile.json.work_style && Object.keys(profile.static_profile.json.work_style).length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Work Style
                    </h3>
                    <div className="space-y-2">
                      {profile.static_profile.json.work_style.preferred_work_hours && (
                        <div>
                          <span className="text-sm text-gray-600">Work Hours:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.work_style.preferred_work_hours}
                          </span>
                        </div>
                      )}
                      {profile.static_profile.json.work_style.collaboration_style && (
                        <div>
                          <span className="text-sm text-gray-600">Collaboration:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.work_style.collaboration_style}
                          </span>
                        </div>
                      )}
                      {profile.static_profile.json.work_style.decision_making_style && (
                        <div>
                          <span className="text-sm text-gray-600">Decision Making:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.work_style.decision_making_style}
                          </span>
                        </div>
                      )}
                      {profile.static_profile.json.work_style.problem_solving_approach && (
                        <div>
                          <span className="text-sm text-gray-600">Problem Solving:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.work_style.problem_solving_approach}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Communication Style */}
                {profile.static_profile.json.communication_style && Object.keys(profile.static_profile.json.communication_style).length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Communication Style
                    </h3>
                    <div className="space-y-2">
                      {Array.isArray(profile.static_profile.json.communication_style.preferred_channels) && profile.static_profile.json.communication_style.preferred_channels.length > 0 && (
                        <div>
                          <span className="text-sm text-gray-600">Channels:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.communication_style.preferred_channels.join(', ')}
                          </span>
                        </div>
                      )}
                      {profile.static_profile.json.communication_style.communication_frequency && (
                        <div>
                          <span className="text-sm text-gray-600">Frequency:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.communication_style.communication_frequency}
                          </span>
                        </div>
                      )}
                      {profile.static_profile.json.communication_style.tone_preference && (
                        <div>
                          <span className="text-sm text-gray-600">Tone:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.communication_style.tone_preference}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Learning Preferences */}
                {profile.static_profile.json.learning_preferences && Object.keys(profile.static_profile.json.learning_preferences).length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Learning Preferences
                    </h3>
                    <div className="space-y-2">
                      {Array.isArray(profile.static_profile.json.learning_preferences.preferred_learning_methods) && profile.static_profile.json.learning_preferences.preferred_learning_methods.length > 0 && (
                        <div>
                          <span className="text-sm text-gray-600">Methods:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.learning_preferences.preferred_learning_methods.join(', ')}
                          </span>
                        </div>
                      )}
                      {profile.static_profile.json.learning_preferences.learning_pace && (
                        <div>
                          <span className="text-sm text-gray-600">Pace:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.learning_preferences.learning_pace}
                          </span>
                        </div>
                      )}
                      {profile.static_profile.json.learning_preferences.knowledge_retention_style && (
                        <div>
                          <span className="text-sm text-gray-600">Retention Style:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.learning_preferences.knowledge_retention_style}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Values & Priorities */}
                {Array.isArray(profile.static_profile.json.values_and_priorities) && profile.static_profile.json.values_and_priorities.length > 0 && (
                  <div className="bg-green-50 rounded-lg p-5 border border-green-200">
                    <h3 className="text-sm font-semibold text-green-900 mb-3 uppercase tracking-wide">
                      Values & Priorities
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.static_profile.json.values_and_priorities.map((value, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-sm font-medium bg-white border border-green-300 text-green-900 rounded-md"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technology Preferences */}
                {profile.static_profile.json.technology_preferences && Object.keys(profile.static_profile.json.technology_preferences).length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Technology Preferences
                    </h3>
                    <div className="space-y-2">
                      {Array.isArray(profile.static_profile.json.technology_preferences.preferred_tools) && profile.static_profile.json.technology_preferences.preferred_tools.length > 0 && (
                        <div>
                          <span className="text-sm text-gray-600">Tools:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.technology_preferences.preferred_tools.join(', ')}
                          </span>
                        </div>
                      )}
                      {profile.static_profile.json.technology_preferences.tech_comfort_level && (
                        <div>
                          <span className="text-sm text-gray-600">Comfort Level:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.technology_preferences.tech_comfort_level}
                          </span>
                        </div>
                      )}
                      {Array.isArray(profile.static_profile.json.technology_preferences.preferred_platforms) && profile.static_profile.json.technology_preferences.preferred_platforms.length > 0 && (
                        <div>
                          <span className="text-sm text-gray-600">Platforms:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.technology_preferences.preferred_platforms.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Lifestyle Patterns */}
                {profile.static_profile.json.lifestyle_patterns && Object.keys(profile.static_profile.json.lifestyle_patterns).length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Lifestyle Patterns
                    </h3>
                    <div className="space-y-2">
                      {profile.static_profile.json.lifestyle_patterns.activity_level && (
                        <div>
                          <span className="text-sm text-gray-600">Activity Level:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.lifestyle_patterns.activity_level}
                          </span>
                        </div>
                      )}
                      {profile.static_profile.json.lifestyle_patterns.social_patterns && (
                        <div>
                          <span className="text-sm text-gray-600">Social Patterns:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.lifestyle_patterns.social_patterns}
                          </span>
                        </div>
                      )}
                      {profile.static_profile.json.lifestyle_patterns.productivity_patterns && (
                        <div>
                          <span className="text-sm text-gray-600">Productivity:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.lifestyle_patterns.productivity_patterns}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Cognitive Style */}
                {profile.static_profile.json.cognitive_style && Object.keys(profile.static_profile.json.cognitive_style).length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Cognitive Style
                    </h3>
                    <div className="space-y-2">
                      {profile.static_profile.json.cognitive_style.thinking_pattern && (
                        <div>
                          <span className="text-sm text-gray-600">Thinking:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.cognitive_style.thinking_pattern}
                          </span>
                        </div>
                      )}
                      {profile.static_profile.json.cognitive_style.information_processing && (
                        <div>
                          <span className="text-sm text-gray-600">Information Processing:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.cognitive_style.information_processing}
                          </span>
                        </div>
                      )}
                      {profile.static_profile.json.cognitive_style.creativity_level && (
                        <div>
                          <span className="text-sm text-gray-600">Creativity:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.static_profile.json.cognitive_style.creativity_level}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Profile */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Dynamic Profile</h2>
                <p className="text-sm text-gray-600">Recent context and current state</p>
              </div>
              
              {profile.dynamic_profile.text && (
                <div className="mb-8 p-5 bg-amber-50 rounded-lg border border-amber-100">
                  <h3 className="text-sm font-semibold text-amber-900 mb-3 uppercase tracking-wide">
                    Current Summary
                  </h3>
                  <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {profile.dynamic_profile.text}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activities */}
                {Array.isArray(profile.dynamic_profile.json.recent_activities) && profile.dynamic_profile.json.recent_activities.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Recent Activities
                    </h3>
                    <ul className="space-y-2">
                      {profile.dynamic_profile.json.recent_activities.map((activity, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-700">
                          <span className="mr-2 text-gray-400">•</span>
                          <span>{activity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Current Projects */}
                {Array.isArray(profile.dynamic_profile.json.current_projects) && profile.dynamic_profile.json.current_projects.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Current Projects
                    </h3>
                    <ul className="space-y-2">
                      {profile.dynamic_profile.json.current_projects.map((project, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-700">
                          <span className="mr-2 text-gray-400">•</span>
                          <span>{project}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Temporary Interests */}
                {Array.isArray(profile.dynamic_profile.json.temporary_interests) && profile.dynamic_profile.json.temporary_interests.length > 0 && (
                  <div className="bg-yellow-50 rounded-lg p-5 border border-yellow-200">
                    <h3 className="text-sm font-semibold text-yellow-900 mb-3 uppercase tracking-wide">
                      Temporary Interests
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.dynamic_profile.json.temporary_interests.map((interest, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-sm font-medium bg-white border border-yellow-300 text-yellow-900 rounded-md"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Changes */}
                {Array.isArray(profile.dynamic_profile.json.recent_changes) && profile.dynamic_profile.json.recent_changes.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Recent Changes
                    </h3>
                    <ul className="space-y-2">
                      {profile.dynamic_profile.json.recent_changes.map((change, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-700">
                          <span className="mr-2 text-gray-400">•</span>
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Current Context */}
                {Array.isArray(profile.dynamic_profile.json.current_context) && profile.dynamic_profile.json.current_context.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3 uppercase tracking-wide">
                      Current Context
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.dynamic_profile.json.current_context.map((context, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-sm font-medium bg-white border border-blue-300 text-blue-900 rounded-md"
                        >
                          {context}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Goals */}
                {Array.isArray(profile.dynamic_profile.json.active_goals) && profile.dynamic_profile.json.active_goals.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Active Goals
                    </h3>
                    <ul className="space-y-2">
                      {profile.dynamic_profile.json.active_goals.map((goal, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-700">
                          <span className="mr-2 text-gray-400">•</span>
                          <span>{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Current Challenges */}
                {Array.isArray(profile.dynamic_profile.json.current_challenges) && profile.dynamic_profile.json.current_challenges.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Current Challenges
                    </h3>
                    <ul className="space-y-2">
                      {profile.dynamic_profile.json.current_challenges.map((challenge, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-700">
                          <span className="mr-2 text-gray-400">•</span>
                          <span>{challenge}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recent Achievements */}
                {Array.isArray(profile.dynamic_profile.json.recent_achievements) && profile.dynamic_profile.json.recent_achievements.length > 0 && (
                  <div className="bg-green-50 rounded-lg p-5 border border-green-200">
                    <h3 className="text-sm font-semibold text-green-900 mb-3 uppercase tracking-wide">
                      Recent Achievements
                    </h3>
                    <ul className="space-y-2">
                      {profile.dynamic_profile.json.recent_achievements.map((achievement, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-700">
                          <span className="mr-2 text-gray-400">•</span>
                          <span>{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Current Focus Areas */}
                {Array.isArray(profile.dynamic_profile.json.current_focus_areas) && profile.dynamic_profile.json.current_focus_areas.length > 0 && (
                  <div className="bg-indigo-50 rounded-lg p-5 border border-indigo-200">
                    <h3 className="text-sm font-semibold text-indigo-900 mb-3 uppercase tracking-wide">
                      Current Focus Areas
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.dynamic_profile.json.current_focus_areas.map((area, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-sm font-medium bg-white border border-indigo-300 text-indigo-900 rounded-md"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emotional State */}
                {profile.dynamic_profile.json.emotional_state && Object.keys(profile.dynamic_profile.json.emotional_state).length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Emotional State
                    </h3>
                    <div className="space-y-2">
                      {Array.isArray(profile.dynamic_profile.json.emotional_state.current_concerns) && profile.dynamic_profile.json.emotional_state.current_concerns.length > 0 && (
                        <div>
                          <span className="text-sm text-gray-600">Concerns:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.dynamic_profile.json.emotional_state.current_concerns.join(', ')}
                          </span>
                        </div>
                      )}
                      {Array.isArray(profile.dynamic_profile.json.emotional_state.current_excitements) && profile.dynamic_profile.json.emotional_state.current_excitements.length > 0 && (
                        <div>
                          <span className="text-sm text-gray-600">Excitements:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.dynamic_profile.json.emotional_state.current_excitements.join(', ')}
                          </span>
                        </div>
                      )}
                      {profile.dynamic_profile.json.emotional_state.stress_level && (
                        <div>
                          <span className="text-sm text-gray-600">Stress Level:</span>{' '}
                          <span className="text-sm font-medium text-gray-900">
                            {profile.dynamic_profile.json.emotional_state.stress_level}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Active Research Topics */}
                {Array.isArray(profile.dynamic_profile.json.active_research_topics) && profile.dynamic_profile.json.active_research_topics.length > 0 && (
                  <div className="bg-orange-50 rounded-lg p-5 border border-orange-200">
                    <h3 className="text-sm font-semibold text-orange-900 mb-3 uppercase tracking-wide">
                      Active Research Topics
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.dynamic_profile.json.active_research_topics.map((topic, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-sm font-medium bg-white border border-orange-300 text-orange-900 rounded-md"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Events */}
                {Array.isArray(profile.dynamic_profile.json.upcoming_events) && profile.dynamic_profile.json.upcoming_events.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Upcoming Events
                    </h3>
                    <ul className="space-y-2">
                      {profile.dynamic_profile.json.upcoming_events.map((event, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-700">
                          <span className="mr-2 text-gray-400">•</span>
                          <span>{event}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
