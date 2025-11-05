import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../utility/axiosInterceptor'

interface User {
  id: string
  email: string
  created_at: string
}

export const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login'
      const response = await axiosInstance.post(endpoint, { 
        email: email.trim(), 
        password: password.trim() 
      })
      
      setUser(response.data.user)
      // Persist JWT for Authorization header usage
      if (response.data?.token) {
        try { 
          localStorage.setItem('auth_token', response.data.token)
          // Also store user ID from token for quick access
          if (response.data.user?.id) {
            localStorage.setItem('user_id', response.data.user.id)
          }
        } catch {}
      }
      
      // Redirect to memories page after successful login
      setTimeout(() => {
        navigate('/memories')
      }, 1000)
    } catch (err: any) {
      console.error('Auth error:', err)
      setError(err.response?.data?.message || `Failed to ${isRegister ? 'register' : 'login'}. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/auth/logout')
      setUser(null)
      try { 
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_id')
      } catch {}
      setEmail('')
      setPassword('')
      setError('')
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
      // Clear local state even if logout request fails
      setUser(null)
      try { 
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_id')
      } catch {}
      navigate('/login')
    }
  }

  const checkCurrentUser = async () => {
    try {
      const response = await axiosInstance.get('/auth/me')
      if (response.data?.user) {
        setUser(response.data.user)
        // Update user ID in localStorage if we have it
        if (response.data.user.id) {
          try {
            localStorage.setItem('user_id', response.data.user.id)
          } catch {}
        }
      }
    } catch (err) {
      // User not logged in
      setUser(null)
      try {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_id')
      } catch {}
    }
  }

  // Check if user is already logged in
  React.useEffect(() => {
    checkCurrentUser()
  }, [])

  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-light text-gray-900 mb-4">
              Welcome back!
            </h2>
            <p className="text-gray-600 mb-6">
              Logged in as <strong>{user.email}</strong>
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/memories')}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              >
                Go to Memories
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-light text-gray-900">
            {isRegister ? 'Create Account' : 'Sign In'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isRegister 
              ? 'Create a new account to start using RecallOS'
              : 'Sign in to your RecallOS account'
            }
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading 
                ? (isRegister ? 'Creating Account...' : 'Signing In...') 
                : (isRegister ? 'Create Account' : 'Sign In')
              }
            </button>
            
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
              {isRegister ? 'Already have an account? Sign In' : 'Need an account? Register'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Home
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-gray-100 rounded-md">
          <h3 className="text-sm font-medium text-gray-900 mb-2">How it works:</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• {isRegister ? 'Create an account with email/password' : 'Sign in with your email/password'}</li>
            <li>• Session cookie is set automatically (HttpOnly, Secure)</li>
            <li>• Session persists across browser tabs</li>
            <li>• Extension will automatically send this cookie</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
