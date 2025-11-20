import React, { useState } from "react"
import { doc, serverTimestamp, setDoc } from "firebase/firestore"

import { db } from "../../lib/firebase"
import { ConsoleButton } from "../sections"

export const WaitlistForm = ({ compact = false }: { compact?: boolean }) => {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (!db) {
        throw new Error("Firebase is not initialized")
      }

      const normalizedEmail = email.trim().toLowerCase()

      // Create document with email as ID (Firestore automatically prevents duplicates)
      const waitlistDocRef = doc(db, "waitlist", normalizedEmail)
      await setDoc(waitlistDocRef, {
        email: normalizedEmail,
        createdAt: serverTimestamp(),
        source: "landing_page",
      })

      setSubmitted(true)
      setIsDuplicate(false)
      setEmail("")
    } catch (err: unknown) {
      console.error("Error adding to waitlist:", err)

      // Check if it's a permission error (likely duplicate email)
      const firebaseError = err as { code?: string }
      if (
        firebaseError?.code === "permission-denied" ||
        firebaseError?.code === "permissions-denied"
      ) {
        setSubmitted(true)
        setIsDuplicate(true)
        setEmail("")
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <div className="mb-4 flex justify-center">
          <div className="w-12 h-12 border border-gray-300 rounded-full flex items-center justify-center bg-white/50">
            <svg
              className="w-5 h-5 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        <h3 className="text-xl sm:text-2xl font-light font-editorial text-black mb-3">
          {isDuplicate ? "Already saved" : "Your memory awaits"}
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed font-primary max-w-md mx-auto">
          {isDuplicate
            ? "We already have your memory saved. We'll notify you when Cognia is ready."
            : "We'll notify you when Cognia is ready. Never forget what you see online."}
        </p>
        {!compact && (
          <button
            onClick={() => {
              setSubmitted(false)
              setIsDuplicate(false)
            }}
            className="mt-6 text-sm text-gray-600 hover:text-black underline transition-colors"
          >
            Add another email
          </button>
        )}
      </div>
    )
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 border border-gray-300 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm outline-none focus:border-black transition-colors rounded-none bg-white/80 backdrop-blur"
            placeholder="your@email.com"
          />
          <ConsoleButton
            variant="console_key"
            className="group relative overflow-hidden rounded-none px-4 sm:px-6 py-2.5 sm:py-3 transition-all duration-200 hover:shadow-md disabled:opacity-50 whitespace-nowrap"
            type="submit"
            disabled={isSubmitting}
          >
            <span className="relative z-10 text-xs sm:text-sm font-medium">
              {isSubmitting ? "Joining..." : "Join Waitlist"}
            </span>
            <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
          </ConsoleButton>
        </div>
        <p className="text-[10px] sm:text-xs text-gray-500 text-center">
          Be among the first ones to experience Cognia.
        </p>
        {error && (
          <p className="text-[10px] sm:text-xs text-red-600 text-center mt-1.5 sm:mt-2">
            {error}
          </p>
        )}
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black transition-colors rounded-none bg-white"
          placeholder="your@email.com"
        />
      </div>
      <ConsoleButton
        variant="console_key"
        className="w-full group relative overflow-hidden rounded-none px-6 py-3 transition-all duration-200 hover:shadow-md disabled:opacity-50"
        type="submit"
        disabled={isSubmitting}
      >
        <span className="relative z-10 text-sm font-medium">
          {isSubmitting ? "Joining..." : "Join Waitlist"}
        </span>
        <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
      </ConsoleButton>
      <p className="text-xs text-gray-500 text-center">
        We respect your privacy.
      </p>
      {error && (
        <p className="text-xs text-red-600 text-center mt-2">{error}</p>
      )}
    </form>
  )
}
