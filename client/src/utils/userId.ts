export function getOrCreateUserId(): string {
  try {
    const key = 'user_id';
    let id = localStorage.getItem(key);
    if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return id;
    }
    id = generateUuidV4();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return generateUuidV4();
  }
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

export async function getOrCreateAuthToken(): Promise<string | null> {
  try {
    let token = getAuthToken();
    if (token) {
      return token;
    }
    
    const userId = getOrCreateUserId();
    const baseURL = (import.meta.env.VITE_SERVER_URL || 'http://localhost:3000') + '/api';
    const response = await fetch(`${baseURL}/auth/extension-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      console.error('Failed to get auth token:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    if (data.token) {
      setAuthToken(data.token);
      return data.token;
    }
    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

function generateUuidV4(): string {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;
    const bth = Array.from(buf).map((b) => b.toString(16).padStart(2, '0'));
    return (
      bth[0] + bth[1] + bth[2] + bth[3] + '-' +
      bth[4] + bth[5] + '-' +
      bth[6] + bth[7] + '-' +
      bth[8] + bth[9] + '-' +
      bth[10] + bth[11] + bth[12] + bth[13] + bth[14] + bth[15]
    );
  }
  let d = new Date().getTime();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    d += performance.now();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}


