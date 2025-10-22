import { useState, useEffect, useCallback } from 'react'
import { HyperIndexService, HyperIndexMemoryStored, HyperIndexUser, HyperIndexSystemStats } from '../services/hyperindexService'

export interface UseHyperIndexReturn {
  isAvailable: boolean
  isLoading: boolean
  error: string | null
  systemStats: HyperIndexSystemStats | null
  recentMemories: HyperIndexMemoryStored[]
  getUserStats: (userAddress: string) => Promise<HyperIndexUser | null>
  getUserMemories: (userAddress: string, limit?: number) => Promise<HyperIndexMemoryStored[]>
  getUserActivity: (userAddress: string) => Promise<any>
  refreshData: () => Promise<void>
}

export function useHyperIndex(): UseHyperIndexReturn {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [systemStats, setSystemStats] = useState<HyperIndexSystemStats | null>(null)
  const [recentMemories, setRecentMemories] = useState<HyperIndexMemoryStored[]>([])

  const checkAvailability = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const available = await HyperIndexService.isAvailable()
      setIsAvailable(available)
      
      if (available) {
        // Load initial data
        console.log('Loading system stats and memories...')
        const [stats, memories] = await Promise.all([
          HyperIndexService.getSystemStats(),
          HyperIndexService.getRecentMemoryStoredEvents(10)
        ])
        
        console.log('System stats loaded:', stats)
        setSystemStats(stats)
        setRecentMemories(memories)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsAvailable(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getUserStats = useCallback(async (userAddress: string): Promise<HyperIndexUser | null> => {
    if (!isAvailable) return null
    
    try {
      return await HyperIndexService.getUserStats(userAddress)
    } catch (err) {
      console.error('Error fetching user stats:', err)
      return null
    }
  }, [isAvailable])

  const getUserMemories = useCallback(async (userAddress: string, limit: number = 20): Promise<HyperIndexMemoryStored[]> => {
    if (!isAvailable) return []
    
    try {
      return await HyperIndexService.getUserMemoryEvents(userAddress, limit)
    } catch (err) {
      console.error('Error fetching user memories:', err)
      return []
    }
  }, [isAvailable])

  const getUserActivity = useCallback(async (userAddress: string) => {
    if (!isAvailable) return null
    
    try {
      return await HyperIndexService.getUserActivity(userAddress)
    } catch (err) {
      console.error('Error fetching user activity:', err)
      return null
    }
  }, [isAvailable])

  const refreshData = useCallback(async () => {
    if (!isAvailable) return
    
    try {
      console.log('Refreshing system stats and memories...')
      const [stats, memories] = await Promise.all([
        HyperIndexService.getSystemStats(),
        HyperIndexService.getRecentMemoryStoredEvents(10)
      ])
      
      console.log('Refreshed system stats:', stats)
      setSystemStats(stats)
      setRecentMemories(memories)
    } catch (err) {
      console.error('Error refreshing data:', err)
    }
  }, [isAvailable])

  useEffect(() => {
    checkAvailability()
  }, []) // Remove checkAvailability dependency to prevent infinite loops

  return {
    isAvailable,
    isLoading,
    error,
    systemStats,
    recentMemories,
    getUserStats,
    getUserMemories,
    getUserActivity,
    refreshData
  }
}

// Hook for user-specific HyperIndex data
export function useUserHyperIndex(userAddress: string | null) {
  const [userStats, setUserStats] = useState<HyperIndexUser | null>(null)
  const [userMemories, setUserMemories] = useState<HyperIndexMemoryStored[]>([])
  const [userActivity, setUserActivity] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadUserData = useCallback(async () => {
    if (!userAddress) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const activity = await HyperIndexService.getUserActivity(userAddress)
      setUserActivity(activity)
      setUserStats(activity.userStats)
      setUserMemories(activity.memories)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [userAddress])

  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  return {
    userStats,
    userMemories,
    userActivity,
    isLoading,
    error,
    refresh: loadUserData
  }
}
