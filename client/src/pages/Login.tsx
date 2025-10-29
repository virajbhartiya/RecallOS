import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../utility/axiosInterceptor'

export const Login = () => {
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) {
      setError('Please enter a token')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Set the session cookie
      await axiosInstance.post('/auth/session', { token: token.trim() })
      
      // Redirect to memories page
      navigate('/memories')
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.response?.data?.message || 'Failed to set session. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await axiosInstance.delete('/auth/session')
      setToken('')
      setError('')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-light text-gray-900">
            Session Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter a token to set your session cookie
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="token" className="sr-only">
              Token
            </label>
            <input
              id="token"
              name="token"
              type="text"
              required
              className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
              placeholder="Enter your token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
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
              {isLoading ? 'Setting Session...' : 'Set Session'}
            </button>
            
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
              Clear Session
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
            <li>• Enter any token string to set a session cookie</li>
            <li>• Cookie is HttpOnly, Secure, and SameSite=None</li>
            <li>• Session persists across browser tabs</li>
            <li>• Extension will automatically send this cookie</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
