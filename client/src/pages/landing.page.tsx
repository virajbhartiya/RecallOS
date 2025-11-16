import { useEffect, useState } from "react"

import { ConsoleButton, Section } from "../components/sections"

const WaitlistForm = ({ compact = false }: { compact?: boolean }) => {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    setSubmitted(true)
    setIsSubmitting(false)
    setEmail("")
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-3">✓</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          You're on the list!
        </h3>
        <p className="text-sm text-gray-600">
          We'll send you an email when Cognia is ready.
        </p>
        {!compact && (
          <button
            onClick={() => setSubmitted(false)}
            className="mt-6 text-sm text-gray-700 hover:text-black underline"
          >
            Add another email
          </button>
        )}
      </div>
    )
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black transition-colors rounded-none bg-white/80 backdrop-blur"
            placeholder="your@email.com"
          />
          <ConsoleButton
            variant="console_key"
            className="group relative overflow-hidden rounded-none px-6 py-3 transition-all duration-200 hover:shadow-md disabled:opacity-50 whitespace-nowrap"
            type="submit"
            disabled={isSubmitting}
          >
            <span className="relative z-10 text-sm font-medium">
              {isSubmitting ? "Joining..." : "Join Waitlist"}
            </span>
            <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
          </ConsoleButton>
        </div>
        <p className="text-xs text-gray-500 text-center">
          Be among the first to experience Cognia. No spam, unsubscribe anytime.
        </p>
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
        We respect your privacy. No spam, unsubscribe anytime.
      </p>
    </form>
  )
}

// Values inlined into the component for clarity

export const Landing = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    // Prevent browser from restoring previous scroll position and ensure top on load
    if (typeof window !== "undefined" && typeof history !== "undefined") {
      try {
        if ("scrollRestoration" in history) {
          const historyWithScrollRestoration = history as {
            scrollRestoration?: string
          }
          historyWithScrollRestoration.scrollRestoration = "manual"
        }
      } catch {
        // Ignore errors setting scroll restoration
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    }

    setIsVisible(true)

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  return (
    <div
      className="min-h-screen text-black relative font-primary overflow-hidden"
      role="main"
      style={{
        backgroundImage: "linear-gradient(135deg, #f9fafb, #ffffff, #f3f4f6)",
        color: "#000000",
      }}
    >
      {/* Configurable gradient blur overlays */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        {[
          {
            className: "absolute -top-28 -left-24 w-[28rem] h-[28rem]",
            from: "#a5b4fc",
            via: "#fbcfe8",
            to: "#fde68a",
            opacity: 0.35,
          },
          {
            className: "absolute -bottom-28 right-0 w-[28rem] h-[28rem]",
            from: "#99f6e4",
            via: "#6ee7b7",
            to: "#a7f3d0",
            opacity: 0.3,
          },
        ].map((b, i) => (
          <div
            key={i}
            className={`${b.className} rounded-full blur-3xl`}
            style={{
              backgroundImage: `linear-gradient(135deg, ${b.from}, ${b.via}, ${b.to})`,
              opacity: b.opacity as number,
              filter: "blur(64px)",
            }}
          />
        ))}
      </div>
      {/* Dynamic cursor trail */}
      <div
        className="fixed w-4 h-4 bg-black/5 rounded-full pointer-events-none z-50 transition-all duration-100 ease-out"
        style={{
          left: mousePosition.x - 8,
          top: mousePosition.y - 8,
          transform: `scale(${isVisible ? 1 : 0})`,
        }}
      />

      {/* Animated background grid */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
          `,
            backgroundSize: "24px 24px",
            animation: "gridMove 20s linear infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(24px, 24px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,0,0,0.1); }
          50% { box-shadow: 0 0 0 8px rgba(0,0,0,0.05); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes typewriter {
          from { width: 0; }
          to { width: 100%; }
        }
        @keyframes blink {
          0%, 50% { border-color: transparent; }
          51%, 100% { border-color: currentColor; }
        }
      `}</style>

      {/* Logo Header */}
      <header className="fixed top-0 inset-x-0 z-40 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src="/black-transparent.png"
              alt="Cognia"
              className="w-10 h-10"
            />
            <div className="flex flex-col">
              <span className="text-xl font-bold text-italics font-editorial text-black">
                Cognia
              </span>
              <span className="text-xs text-gray-600 font-mono -mt-1">
                Remember what the web showed you
              </span>
            </div>
          </div>
        </div>
      </header>
      {/* spacer to offset fixed header height */}
      <div className="h-20 sm:h-24" aria-hidden="true" />

      {/* Hero Section */}
      <Section className="min-h-screen bg-transparent relative overflow-hidden py-16 sm:py-20 lg:py-28">
        {/* Enhanced Animated Background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Floating geometric shapes with enhanced animations */}
          <div
            className="absolute top-20 left-10 w-6 h-6 border-2 border-gray-300/60 rounded-lg animate-pulse"
            style={{
              animation:
                "float 6s ease-in-out infinite, pulse-glow 4s ease-in-out infinite",
            }}
          />
          <div
            className="absolute top-40 right-20 w-8 h-8 border-2 border-gray-300/60 rotate-45"
            style={{
              animation:
                "float 8s ease-in-out infinite reverse, pulse-glow 3s ease-in-out infinite 1s",
            }}
          />
          <div
            className="absolute bottom-40 left-1/4 w-4 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full"
            style={{
              animation:
                "float 5s ease-in-out infinite 0.5s, pulse-glow 2s ease-in-out infinite 2s",
            }}
          />
          <div
            className="absolute top-1/2 right-1/3 w-3 h-12 border-l-2 border-gray-300/60"
            style={{
              animation:
                "float 7s ease-in-out infinite 1s, pulse-glow 3s ease-in-out infinite 0.5s",
            }}
          />
          <div
            className="absolute top-1/3 left-1/3 w-5 h-5 border-2 border-gray-300/40 rounded-full"
            style={{
              animation:
                "float 9s ease-in-out infinite 2s, pulse-glow 4s ease-in-out infinite 1.5s",
            }}
          />

          {/* Enhanced grid pattern */}
          <div className="absolute inset-0 opacity-5">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `
                linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)
              `,
                backgroundSize: "32px 32px",
                animation: "gridMove 25s linear infinite reverse",
              }}
            />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 h-full flex items-center">
          <div className="w-full text-center space-y-8 sm:space-y-10 mx-auto">
            {/* Announcement */}
            <div
              className="flex justify-center"
              style={{
                animation: isVisible
                  ? "fadeInScale 0.8s ease-out 0.1s both"
                  : "none",
              }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-300/80 bg-white/80 backdrop-blur px-3 py-1 text-xs sm:text-sm text-gray-700">
                <span className="inline-flex items-center rounded-full bg-black text-white px-2 py-0.5 text-[10px] sm:text-xs uppercase tracking-wider">
                  New
                </span>
                <span className="whitespace-nowrap">
                  Instant search for anything you saw online
                </span>
                <button
                  className="underline underline-offset-2 hover:no-underline"
                  onClick={() => (window.location.href = "/docs")}
                >
                  Learn more
                </button>
              </div>
            </div>
            {/* Headline */}
            <div className="overflow-hidden">
              <h1
                className="text-5xl sm:text-6xl lg:text-7xl font-light leading-tight font-editorial tracking-tight"
                style={{
                  animation: isVisible ? "slideInUp 1s ease-out" : "none",
                }}
              >
                <span className="block text-black">
                  <span className="align-baseline">A</span>{" "}
                  <span className="font-editorial italic">searchable</span>{" "}
                  <span className="align-baseline">memory</span>
                </span>
                <span
                  className="block text-3xl sm:text-4xl lg:text-5xl font-normal mt-2"
                  style={{
                    animation: isVisible
                      ? "slideInUp 1s ease-out 0.2s both"
                      : "none",
                  }}
                >
                  for everything you see
                </span>
                <span
                  className="block text-2xl sm:text-3xl lg:text-4xl font-light mt-1"
                  style={{
                    animation: isVisible
                      ? "slideInUp 1s ease-out 0.4s both"
                      : "none",
                  }}
                >
                  online
                </span>
              </h1>
            </div>

            {/* Concise value proposition */}
            <p
              className="mx-auto max-w-2xl text-lg sm:text-xl text-gray-800 leading-relaxed font-primary font-medium"
              style={{
                animation: isVisible
                  ? "slideInUp 1s ease-out 0.6s both"
                  : "none",
              }}
            >
              Cognia is your photographic memory for the web, capturing text,
              links and context as you browse so you can find it in seconds.
            </p>

            {/* Waitlist Form */}
            <div
              className="mt-8 sm:mt-10"
              style={{
                animation: isVisible
                  ? "slideInUp 1s ease-out 0.8s both"
                  : "none",
              }}
            >
              <div className="max-w-md mx-auto">
                <WaitlistForm compact />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Product Explanation Section */}
      <Section className="bg-transparent py-16 sm:py-20 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light font-editorial mb-4">
              How it works
            </h2>
            <p className="text-lg sm:text-xl text-gray-700 max-w-2xl mx-auto">
              Cognia captures everything you see online, making it instantly
              searchable with natural language queries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                title: "Automatic Capture",
                description:
                  "As you browse, Cognia silently captures text, links, and context from every page you visit. No manual saving required—your browsing history becomes a searchable knowledge base.",
                icon: "📸",
              },
              {
                title: "Smart Indexing",
                description:
                  "Everything is processed and indexed locally on your device. Your data stays private while being organized for lightning-fast retrieval when you need it.",
                icon: "🔍",
              },
              {
                title: "Natural Search",
                description:
                  "Search like you remember—type a few words, describe what you saw, or ask a question. Cognia finds the exact page and section instantly.",
                icon: "💭",
              },
              {
                title: "Context Preservation",
                description:
                  "Every memory includes the full context: the page URL, surrounding text, and when you saw it. Never lose track of where information came from.",
                icon: "🔗",
              },
              {
                title: "Privacy First",
                description:
                  "All processing happens on your device by default. Your browsing data never leaves your computer unless you explicitly choose to sync.",
                icon: "🔒",
              },
              {
                title: "Always Available",
                description:
                  "Access your memories from any device. Whether you're on your laptop, phone, or tablet, your searchable memory follows you everywhere.",
                icon: "☁️",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group text-left rounded-lg border border-gray-200 bg-white/80 backdrop-blur p-6 sm:p-8 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
                style={{
                  animation: isVisible
                    ? `fadeInScale 0.6s ease-out ${0.1 * i + 0.2}s both`
                    : "none",
                }}
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <div className="space-y-2">
                  <div className="text-lg font-semibold text-gray-900 tracking-tight">
                    {feature.title}
                  </div>
                  <div className="text-sm text-gray-600 leading-relaxed">
                    {feature.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
            {/* Brand + Newsletter */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-lg font-mono">
                  R
                </div>
                <div className="text-sm text-gray-800 font-medium">Cognia</div>
              </div>
              <p className="text-sm text-gray-600">
                A searchable memory for everything you see online.
              </p>
              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={() =>
                    window.open("https://github.com/cogniahq/Cognia", "_blank")
                  }
                  className="block text-sm text-gray-700 hover:underline text-left"
                >
                  GitHub
                </button>
                <button
                  onClick={() => window.open("https://x.com", "_blank")}
                  className="block text-sm text-gray-700 hover:underline text-left"
                >
                  X
                </button>
              </div>
            </div>

            {/* Columns (only existing routes) */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                Product
              </div>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <button
                  className="block hover:underline text-left"
                  onClick={() => (window.location.href = "/memories")}
                >
                  Memories
                </button>
                <button
                  className="block hover:underline text-left"
                  onClick={() => (window.location.href = "/search")}
                >
                  Search
                </button>
                <button
                  className="block hover:underline text-left"
                  onClick={() => (window.location.href = "/login")}
                >
                  Download
                </button>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                Resources
              </div>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <button
                  className="block hover:underline text-left"
                  onClick={() => (window.location.href = "/docs")}
                >
                  Docs
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[12px] text-gray-600">
            <div>
              © {new Date().getFullYear()} Cognia. All rights reserved.
            </div>
            <div className="flex flex-wrap gap-4">
              <button
                className="block hover:underline"
                onClick={() =>
                  window.open("https://github.com/cogniahq/Cognia", "_blank")
                }
              >
                GitHub
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
