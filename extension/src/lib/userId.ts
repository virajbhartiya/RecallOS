import { storage, cookies } from './browser';

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

export async function getUserId(): Promise<string> {
  // First check localStorage/chrome.storage
  let authUserId = getAuthenticatedUserId();
  if (authUserId) {
    return authUserId;
  }
  
  // Try to get token from cookie if not in localStorage
  try {
    const token = await getTokenFromCookie();
    if (token) {
      // Sync to storage (works in service worker)
      try {
        await storage.local.set({ auth_token: token });
      } catch (e) {
        // Ignore errors
      }
      
      // Try to sync to localStorage if available (content scripts only)
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('auth_token', token);
        }
      } catch (e) {
        // localStorage not available in service worker, that's fine
      }
      
      // Parse user ID from token
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
    }
  } catch (e) {
    // Error getting token from cookie
  }
  
  throw new Error('User not authenticated. Please log in through the web client first.');
}

async function getTokenFromCookie(): Promise<string | null> {
  try {
    // Try both cookie names - production and dev
    const cookieNames = ['recallos_session', 'recallos_session_dev'];
    const apiUrl = await getApiBaseUrl();
    
    if (!apiUrl) {
      return null;
    }
    
    const apiUrlObj = new URL(apiUrl);
    const domain = apiUrlObj.hostname;
    const protocol = apiUrlObj.protocol;
    const port = apiUrlObj.port;
    
    // Build URL with port - default to 3000 for localhost
    const defaultPort = domain === 'localhost' || domain === '127.0.0.1' ? '3000' : (port || '');
    const baseUrl = `${protocol}//${domain}${defaultPort ? `:${defaultPort}` : ''}`;
    
    // Try multiple URL variations - include exact API URL with path
    const urlsToTry = [
      baseUrl, // Base URL with port (e.g., http://localhost:3000)
      `${baseUrl}/api`, // API path
      `${baseUrl}/`, // Root path
      apiUrl, // Original API URL if different
      `http://localhost:3000`, // Explicit localhost:3000
      `http://localhost:3000/api`, // localhost:3000/api
      `http://localhost:3000/`, // localhost:3000/
      `http://127.0.0.1:3000`, // 127.0.0.1:3000
      `http://127.0.0.1:3000/api`, // 127.0.0.1:3000/api
      `http://127.0.0.1:3000/`, // 127.0.0.1:3000/
    ];
    
    // Try each cookie name with each URL
    for (const cookieName of cookieNames) {
      for (const url of urlsToTry) {
        try {
          const cookie = await cookies.get({
            url: url,
            name: cookieName,
          });
          
          if (cookie?.value) {
            return cookie.value;
          }
        } catch (e) {
          // Continue to next URL
        }
      }
    }
    
    // Then try to get all cookies for the domain (including subdomains)
    const domainsToTry = [
      domain, // localhost
      `.${domain}`, // .localhost
      'localhost', // localhost
      '.localhost', // .localhost
      '127.0.0.1', // 127.0.0.1
    ];
    
    for (const domainToTry of domainsToTry) {
      try {
        const allCookies = await cookies.getAll({
          domain: domainToTry,
        });
        
        if (allCookies && allCookies.length > 0) {
          // Try each cookie name
          for (const cookieName of cookieNames) {
            const sessionCookie = allCookies.find(c => c.name === cookieName);
            if (sessionCookie?.value) {
              return sessionCookie.value;
            }
          }
        }
      } catch (e) {
        // Continue to next domain
      }
    }
    
    // Try with domain pattern (for subdomain cookies like .localhost)
    try {
      const domainPattern = domain.startsWith('.') ? domain : `.${domain}`;
      const allCookies = await cookies.getAll({
        domain: domainPattern,
      });
      
      if (allCookies && allCookies.length > 0) {
        // Try each cookie name
        for (const cookieName of cookieNames) {
          const sessionCookie = allCookies.find(c => c.name === cookieName);
          if (sessionCookie?.value) {
            return sessionCookie.value;
          }
        }
      }
    } catch (e) {
      // Continue
    }
    
    // Get all cookies to see what we have
    try {
      const allCookies = await cookies.getAll({});
      if (allCookies) {
        // Try each cookie name
        for (const cookieName of cookieNames) {
          const matchingCookies = allCookies.filter(c => c.name === cookieName);
          if (matchingCookies.length > 0) {
            return matchingCookies[0].value;
          }
        }
      }
    } catch (e) {
      // Continue
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function getApiBaseUrl(): Promise<string | null> {
  try {
    const cfg = await storage.sync.get(['apiEndpoint']);
    const endpoint = cfg?.apiEndpoint as string | undefined;
    if (endpoint) {
      const u = new URL(endpoint);
      return `${u.protocol}//${u.host}`;
    }
    return 'http://localhost:3000';
  } catch {
    return 'http://localhost:3000';
  }
}

export async function requireAuthToken(): Promise<string> {
  try {
    // Try storage.local first (works in service worker)
    let token: string | null = null;
    try {
      const stored = await storage.local.get(['auth_token']);
      if (stored && stored.auth_token) {
        token = stored.auth_token as string;
      }
    } catch {}

    // Try localStorage (for content scripts)
    if (!token) {
      token = getAuthToken();
    }

    // Try reading from cookie (set by web client)
    if (!token) {
      token = await getTokenFromCookie();
      // If we found a token in cookie, sync it to storage
      if (token) {
        try {
          await storage.local.set({ auth_token: token });
        } catch {}
        try {
          setAuthToken(token);
        } catch {}
      }
    }

    if (!token) {
      throw new Error('Authentication required. Please log in through the web client first.');
    }

    // Verify token is still valid
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      if (exp <= Date.now()) {
        // Token expired
        await storage.local.remove('auth_token');
        clearAuthToken();
        throw new Error('Authentication token expired. Please log in again.');
      }
      return token;
    } catch (e) {
      if (e instanceof Error && (e.message.includes('expired') || e.message.includes('required'))) {
        throw e;
      }
      // Invalid token format
      await storage.local.remove('auth_token');
      clearAuthToken();
      throw new Error('Invalid authentication token. Please log in again.');
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Authentication required. Please log in through the web client first.');
  }
}

export function getAuthToken(): string | null {
  try {
    // Try localStorage first (content scripts)
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
  } catch {
    // localStorage not available
  }
  return null;
}

export function setAuthToken(token: string): void {
  try {
    // Only use localStorage if available (content scripts)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
    // Also store in storage if available (works everywhere)
    storage.local.set({ auth_token: token }).catch(() => {
      // Ignore errors
    });
  } catch (error) {
    // localStorage/storage not available, that's fine
  }
}

export function clearAuthToken(): void {
  try {
    // Clear localStorage if available (content scripts)
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
    // Clear storage if available (works everywhere)
    storage.local.remove('auth_token').catch(() => {
      // Ignore errors
    });
  } catch (error) {
    // localStorage/storage not available, that's fine
  }
}



