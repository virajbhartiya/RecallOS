import { prisma } from '../lib/prisma.lib'

interface CachedUser {
  id: string
  email?: string | null
  timestamp: number
}

const userCache = new Map<string, CachedUser>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getUserWithCache(userId: string): Promise<CachedUser | null> {
  const cached = userCache.get(userId)
  const now = Date.now()

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
    },
  })

  if (!user) {
    return null
  }

  const cachedUser: CachedUser = {
    id: user.id,
    email: user.email,
    timestamp: now,
  }

  userCache.set(userId, cachedUser)
  return cachedUser
}

export function clearUserCache(userId?: string): void {
  if (userId) {
    userCache.delete(userId)
  } else {
    userCache.clear()
  }
}

setInterval(() => {
  const now = Date.now()
  for (const [userId, user] of userCache.entries()) {
    if (now - user.timestamp >= CACHE_TTL) {
      userCache.delete(userId)
    }
  }
}, CACHE_TTL)
