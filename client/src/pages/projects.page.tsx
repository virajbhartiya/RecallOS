import React, { useCallback, useEffect, useState } from 'react'
import { requireAuthToken } from '@/utils/user-id.util'
import { useNavigate } from 'react-router-dom'
import { ProjectService, ProjectGroup, ProjectChange } from '@/services/project.service'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { FolderOpen, Clock, FileText, Search, TrendingUp } from 'lucide-react'

export const Projects: React.FC = () => {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [projects, setProjects] = useState<ProjectGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [projectChanges, setProjectChanges] = useState<Map<string, ProjectChange>>(new Map())
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    try {
      requireAuthToken()
      setIsAuthenticated(true)
    } catch (error) {
      navigate('/login')
    }
  }, [navigate])

  const fetchProjects = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await ProjectService.getProjects({
        minMemories: 3,
        timeWindowDays: 90,
        maxProjects: 20,
      })
      setProjects(data)
    } catch (err) {
      setError('Failed to load projects.')
      console.error('Error fetching projects:', err)
      toast.error('Failed to load projects.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects()
    }
  }, [isAuthenticated, fetchProjects])

  const fetchProjectChanges = useCallback(async (projectId: string) => {
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      const changes = await ProjectService.getProjectChanges(projectId, since)
      setProjectChanges(prev => new Map(prev).set(projectId, changes))
    } catch (err) {
      console.error('Error fetching project changes:', err)
    }
  }, [])

  useEffect(() => {
    // Fetch changes for all projects
    projects.forEach(project => {
      fetchProjectChanges(project.id)
    })
  }, [projects, fetchProjectChanges])

  const handleProjectClick = (projectId: string) => {
    setSelectedProject(selectedProject === projectId ? null : projectId)
  }

  const filteredProjects = projects.filter(project => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      project.name.toLowerCase().includes(query) ||
      project.description.toLowerCase().includes(query) ||
      project.topics.some(t => t.toLowerCase().includes(query)) ||
      project.categories.some(c => c.toLowerCase().includes(query))
    )
  })

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm font-mono text-gray-600">Loading projects...</div>
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
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={() => navigate('/')}
              className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
            >
              ← Home
            </button>
            <div className="h-4 w-px bg-gray-300"></div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-lg font-mono">
                P
              </div>
              <div className="text-sm font-medium text-gray-900">Projects</div>
            </div>
          </div>
        </div>
      </header>
      <div className="h-14" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-mono font-bold text-gray-900">Project Groups</h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500 font-mono">
            {searchQuery ? 'No projects match your search.' : 'No projects found. Start capturing memories to see them grouped here.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map(project => {
              const changes = projectChanges.get(project.id)
              return (
                <div
                  key={project.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleProjectClick(project.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FolderOpen size={20} className="text-gray-600" />
                      <h2 className="text-lg font-semibold text-gray-800">{project.name}</h2>
                    </div>
                    {changes && changes.newMemories > 0 && (
                      <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        <TrendingUp size={12} />
                        {changes.newMemories} new
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <FileText size={14} />
                      {project.memoryCount} memories
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      {formatDistanceToNow(new Date(project.lastActivity))} ago
                    </div>
                  </div>

                  {project.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {project.topics.slice(0, 3).map((topic, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                        >
                          {topic}
                        </span>
                      ))}
                      {project.topics.length > 3 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{project.topics.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {selectedProject === project.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {changes && (
                        <div className="mb-2 text-xs text-gray-600">
                          <strong>Recent changes:</strong> {changes.summary}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 space-y-1">
                        {project.recentMemories.slice(0, 3).map(memory => (
                          <div key={memory.id} className="truncate">
                            {memory.title || 'Untitled'}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          navigate(`/projects/${project.id}`)
                        }}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View all memories →
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

