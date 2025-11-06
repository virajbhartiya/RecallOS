import { getRequest, postRequest } from '../utility/generalServices'
import { requireAuthToken } from '../utils/userId'

export interface StaticProfile {
  interests: string[]
  skills: string[]
  profession?: string
  demographics?: {
    age_range?: string
    location?: string
    education?: string
  }
  long_term_patterns: string[]
  domains: string[]
  expertise_areas: string[]
}

export interface DynamicProfile {
  recent_activities: string[]
  current_projects: string[]
  temporary_interests: string[]
  recent_changes: string[]
  current_context: string[]
}

export interface UserProfile {
  id: string
  user_id: string
  static_profile: {
    json: StaticProfile
    text: string | null
  }
  dynamic_profile: {
    json: DynamicProfile
    text: string | null
  }
  last_updated: string
  last_memory_analyzed: string | null
  version: number
}

export interface ProfileResponse {
  success: boolean
  data: {
    profile: UserProfile | null
    message?: string
  }
}

export async function getProfile(): Promise<UserProfile | null> {
  requireAuthToken()
  
  try {
    const response = await getRequest('/profile')
    
    if (response.data?.success === false) {
      console.error('API error:', response.data?.error)
      throw new Error(response.data?.error || 'API returned error')
    }
    
    return response.data?.data?.profile || null
  } catch (error) {
    console.error('Error fetching profile:', error)
    throw error
  }
}

export async function refreshProfile(): Promise<UserProfile> {
  requireAuthToken()
  
  try {
    const response = await postRequest('/profile/refresh', {})
    
    if (response.data?.success === false) {
      console.error('API error:', response.data?.error)
      throw new Error(response.data?.error || 'API returned error')
    }
    
    return response.data?.data?.profile
  } catch (error) {
    console.error('Error refreshing profile:', error)
    throw error
  }
}

export async function getProfileContext(): Promise<string> {
  requireAuthToken()
  
  try {
    const response = await getRequest('/profile/context')
    
    if (response.data?.success === false) {
      console.error('API error:', response.data?.error)
      throw new Error(response.data?.error || 'API returned error')
    }
    
    return response.data?.data?.context || ''
  } catch (error) {
    console.error('Error fetching profile context:', error)
    return ''
  }
}

