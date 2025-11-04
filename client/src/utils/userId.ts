export function getAuthenticatedUserId(): string | null {
  try {
    const token = getAuthToken();
    if (!token) return null;
    
    // Parse JWT token to get user ID
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.userId) {
        return payload.userId;
      }
      if (payload.externalId) {
        return payload.externalId;
      }
    } catch (e) {
      // Invalid token format
    }
    return null;
  } catch {
    return null;
  }
}

export function getUserId(): string {
  const authUserId = getAuthenticatedUserId();
  if (!authUserId) {
    throw new Error('User not authenticated. Please log in.');
  }
  return authUserId;
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem('auth_token', token);
    
    // Also sync to chrome.storage for extension access
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
        chrome.runtime.sendMessage(chrome.runtime.id, {
          type: 'SYNC_AUTH_TOKEN',
          token: token
        }).catch(() => {
          // Extension might not be installed or not ready
        });
      }
    } catch (e) {
      // Not in extension context or extension not available
    }
  } catch (error) {
    console.error('Failed to store auth token:', error);
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem('auth_token');
  } catch (error) {
    console.error('Failed to clear auth token:', error);
  }
}

export function requireAuthToken(): string {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }
  
  // Verify token is still valid
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    if (exp <= Date.now()) {
      clearAuthToken();
      throw new Error('Authentication token expired. Please log in again.');
    }
    return token;
  } catch (e) {
    clearAuthToken();
    throw new Error('Invalid authentication token. Please log in again.');
  }
}


