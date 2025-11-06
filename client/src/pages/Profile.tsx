import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { requireAuthToken } from '@/utils/userId'
import { getProfile, refreshProfile, type UserProfile } from '@/services/profile'
import { LoadingCard, ErrorMessage, EmptyState } from '../components/ui/loading-spinner'

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm font-mono text-gray-600">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-mono font-bold text-gray-900">
              [USER PROFILE]
            </h1>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefreshing ? 'REFRESHING...' : 'REFRESH PROFILE'}
            </button>
          </div>
          <p className="text-gray-600 font-mono">
            Your automatically maintained profile based on processed content
          </p>
        </div>

        {error && (
          <ErrorMessage 
            message={error}
            onRetry={() => setError(null)}
          />
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
          <div className="space-y-6">
            {/* Profile Metadata */}
            <div className="bg-white border border-gray-200 p-4">
              <div className="text-sm font-mono text-gray-600 mb-2 uppercase tracking-wide">
                [PROFILE METADATA]
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-mono">
                <div>
                  <span className="text-gray-600">Version:</span>{' '}
                  <span className="text-gray-900">{profile.version}</span>
                </div>
                <div>
                  <span className="text-gray-600">Last Updated:</span>{' '}
                  <span className="text-gray-900">
                    {new Date(profile.last_updated).toLocaleString()}
                  </span>
                </div>
                {profile.last_memory_analyzed && (
                  <div>
                    <span className="text-gray-600">Last Memory Analyzed:</span>{' '}
                    <span className="text-gray-900">
                      {new Date(profile.last_memory_analyzed).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Static Profile */}
            <div className="bg-white border border-gray-200 p-4">
              <div className="text-sm font-mono text-gray-600 mb-4 uppercase tracking-wide">
                [STATIC PROFILE - LONG-TERM FACTS]
              </div>
              
              {profile.static_profile.text && (
                <div className="mb-4">
                  <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wide">
                    [NATURAL LANGUAGE SUMMARY]
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {profile.static_profile.text}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.static_profile.json.interests.length > 0 && (
                  <div>
                    <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wide">
                      [INTERESTS]
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.static_profile.json.interests.map((interest, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 text-gray-700"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {profile.static_profile.json.skills.length > 0 && (
                  <div>
                    <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wide">
                      [SKILLS]
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.static_profile.json.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 text-gray-700"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {profile.static_profile.json.profession && (
                  <div>
                    <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wide">
                      [PROFESSION]
                    </div>
                    <p className="text-sm font-mono text-gray-900">
                      {profile.static_profile.json.profession}
                    </p>
                  </div>
                )}

                {profile.static_profile.json.domains.length > 0 && (
                  <div>
                    <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wide">
                      [DOMAINS]
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.static_profile.json.domains.map((domain, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 text-gray-700"
                        >
                          {domain}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {profile.static_profile.json.expertise_areas.length > 0 && (
                  <div>
                    <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wide">
                      [EXPERTISE AREAS]
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.static_profile.json.expertise_areas.map((area, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 text-gray-700"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {profile.static_profile.json.long_term_patterns.length > 0 && (
                  <div>
                    <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wide">
                      [LONG-TERM PATTERNS]
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.static_profile.json.long_term_patterns.map((pattern, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 text-gray-700"
                        >
                          {pattern}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {profile.static_profile.json.demographics && (
                  <div>
                    <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wide">
                      [DEMOGRAPHICS]
                    </div>
                    <div className="space-y-1 text-sm font-mono">
                      {profile.static_profile.json.demographics.age_range && (
                        <div>
                          <span className="text-gray-600">Age Range:</span>{' '}
                          <span className="text-gray-900">
                            {profile.static_profile.json.demographics.age_range}
                          </span>
                        </div>
                      )}
                      {profile.static_profile.json.demographics.location && (
                        <div>
                          <span className="text-gray-600">Location:</span>{' '}
                          <span className="text-gray-900">
                            {profile.static_profile.json.demographics.location}
                          </span>
                        </div>
                      )}
                      {profile.static_profile.json.demographics.education && (
                        <div>
                          <span className="text-gray-600">Education:</span>{' '}
                          <span className="text-gray-900">
                            {profile.static_profile.json.demographics.education}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Profile */}
            <div className="bg-white border border-gray-200 p-4">
              <div className="text-sm font-mono text-gray-600 mb-4 uppercase tracking-wide">
                [DYNAMIC PROFILE - RECENT CONTEXT]
              </div>
              
              {profile.dynamic_profile.text && (
                <div className="mb-4">
                  <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wide">
                    [NATURAL LANGUAGE SUMMARY]
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {profile.dynamic_profile.text}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.dynamic_profile.json.recent_activities.length > 0 && (
                  <div>
                    <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wide">
                      [RECENT ACTIVITIES]
                    </div>
                    <ul className="space-y-1 text-sm font-mono text-gray-700">
                      {profile.dynamic_profile.json.recent_activities.map((activity, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{activity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {profile.dynamic_profile.json.current_projects.length > 0 && (
                  <div>
                    <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wide">
                      [CURRENT PROJECTS]
                    </div>
                    <ul className="space-y-1 text-sm font-mono text-gray-700">
                      {profile.dynamic_profile.json.current_projects.map((project, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{project}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {profile.dynamic_profile.json.temporary_interests.length > 0 && (
                  <div>
                    <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wide">
                      [TEMPORARY INTERESTS]
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.dynamic_profile.json.temporary_interests.map((interest, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs font-mono bg-yellow-50 border border-yellow-200 text-gray-700"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {profile.dynamic_profile.json.recent_changes.length > 0 && (
                  <div>
                    <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wide">
                      [RECENT CHANGES]
                    </div>
                    <ul className="space-y-1 text-sm font-mono text-gray-700">
                      {profile.dynamic_profile.json.recent_changes.map((change, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {profile.dynamic_profile.json.current_context.length > 0 && (
                  <div>
                    <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wide">
                      [CURRENT CONTEXT]
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.dynamic_profile.json.current_context.map((context, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs font-mono bg-blue-50 border border-blue-200 text-gray-700"
                        >
                          {context}
                        </span>
                      ))}
                    </div>
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

