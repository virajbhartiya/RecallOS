import { useEffect, useState } from "react"

import { ConsoleButton, Section } from "../components/sections"

// Values inlined into the component for clarity

export const Landing = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [headerBlurProgress, setHeaderBlurProgress] = useState(0)

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

    const handleScroll = () => {
      const y = typeof window !== "undefined" ? window.scrollY || 0 : 0
      const progress = Math.max(0, Math.min(1, y / 120))
      setHeaderBlurProgress(progress)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("scroll", handleScroll)
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

      {/* Enhanced header with better navigation */}
      <header
        className="fixed top-0 inset-x-0 z-40 transition-all duration-300"
        style={{
          backgroundColor: `rgba(255,255,255, ${0.35 * headerBlurProgress})`,
          borderBottom: `1px solid rgba(0,0,0, ${0.06 * headerBlurProgress})`,
        }}
      >
        {/* Progressive blur overlay: strongest at top, fades to bottom */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backdropFilter: `saturate(180%) blur(${Math.round(headerBlurProgress * 16)}px)`,
            WebkitBackdropFilter: `saturate(180%) blur(${Math.round(headerBlurProgress * 16)}px)`,
            maskImage:
              "linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0))",
            WebkitMaskImage:
              "linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0))",
            opacity: Math.min(1, headerBlurProgress * 1.2),
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            {/* Enhanced Brand */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-bold text-xl font-mono shadow-lg">
                R
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-italics font-editorial text-black">
                  Cognia
                </span>
                <span className="text-xs text-gray-600 font-mono -mt-1">
                  Remember what the web showed you
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-8">
              <button
                className="group text-sm font-medium text-gray-700 hover:text-black transition-all duration-300 relative"
                onClick={() =>
                  window.open(
                    "https://github.com/virajbhartiya/Cognia/releases/latest",
                    "_blank"
                  )
                }
              >
                <span className="relative z-10">Get Extension</span>
                <div className="absolute inset-0 bg-gray-100 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left -z-10 rounded"></div>
              </button>
              <button
                className="group text-sm font-medium text-gray-700 hover:text-black transition-all duration-300 relative"
                onClick={() => (window.location.href = "/docs")}
              >
                <span className="relative z-10">See how it works</span>
                <div className="absolute inset-0 bg-gray-100 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left -z-10 rounded"></div>
              </button>
              <button
                className="group text-sm font-medium text-gray-700 hover:text-black transition-all duration-300 relative"
                onClick={() => (window.location.href = "/memories")}
              >
                <span className="relative z-10">Memories</span>
                <div className="absolute inset-0 bg-gray-100 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left -z-10 rounded"></div>
              </button>
              <button
                className="group text-sm font-medium text-gray-700 hover:text-black transition-all duration-300 relative"
                onClick={() => (window.location.href = "/pricing")}
              >
                <span className="relative z-10">Pricing</span>
                <div className="absolute inset-0 bg-gray-100 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left -z-10 rounded"></div>
              </button>
              <button
                className="group text-sm font-medium text-gray-700 hover:text-black transition-all duration-300 relative"
                onClick={() => (window.location.href = "/login")}
              >
                <span className="relative z-10">Login</span>
                <div className="absolute inset-0 bg-gray-100 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left -z-10 rounded"></div>
              </button>
            </nav>

            {/* CTA Button */}
            <div className="flex items-center gap-3">
              <button
                className="hidden sm:flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                onClick={() => (window.location.href = "/docs")}
              >
                <span>Docs</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </button>
              <ConsoleButton
                variant="console_key"
                className="group relative overflow-hidden rounded-none px-3 py-2 transition-all duration-200 hover:shadow-md"
                onClick={() =>
                  window.open(
                    "https://github.com/virajbhartiya/Cognia/releases/latest",
                    "_blank"
                  )
                }
              >
                <span className="relative z-10 text-sm font-medium">
                  Try for Free
                </span>
                <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
              </ConsoleButton>
            </div>
          </div>
        </div>
      </header>
      {/* spacer to offset fixed header height, invisible */}
      <div className="h-14 sm:h-16" aria-hidden="true" />

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

            {/* CTA */}
            <div
              className="mt-2 sm:mt-4 space-y-3"
              style={{
                animation: isVisible
                  ? "slideInUp 1s ease-out 0.8s both"
                  : "none",
              }}
            >
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                <ConsoleButton
                  variant="console_key"
                  className="group relative overflow-hidden flex-1 sm:flex-none sm:min-w-[160px] rounded-none px-4 py-2 transition-all duration-200 hover:shadow-md"
                  onClick={() =>
                    window.open(
                      "https://github.com/virajbhartiya/Cognia/releases/latest",
                      "_blank"
                    )
                  }
                >
                  <span className="relative z-10 whitespace-nowrap text-sm sm:text-base font-medium">
                    Get the Extension
                  </span>
                  <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                </ConsoleButton>
                <ConsoleButton
                  variant="outlined"
                  className="group relative overflow-hidden flex-1 sm:flex-none sm:min-w-[160px] rounded-none px-4 py-2 transition-all duration-200 hover:shadow-md"
                  onClick={() => (window.location.href = "/memories")}
                >
                  <span className="relative z-10 whitespace-nowrap text-sm sm:text-base font-medium">
                    Open Memories
                  </span>
                  <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                </ConsoleButton>
              </div>
              {/* Highlights */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-5xl mx-auto">
                {[
                  {
                    title: "Automatic capture",
                    desc: "Key text, links and context saved while you browse.",
                  },
                  {
                    title: "Search like you remember",
                    desc: "Type a few words to jump to the exact page and section.",
                  },
                  {
                    title: "Private by default",
                    desc: "Everything stays on your device unless you choose to sync.",
                  },
                ].map((feat, i) => (
                  <div
                    key={i}
                    className="group text-left rounded-lg border border-gray-200 bg-white/80 backdrop-blur p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-900 tracking-tight">
                        {feat.title}
                      </div>
                      <div className="text-sm text-gray-600 leading-snug">
                        {feat.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Pricing Section */}
      <div id="pricing">
        <Section className="bg-transparent py-16 sm:py-20 lg:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-3xl sm:text-4xl font-light">Pricing</h2>
              <p className="mt-2 text-sm sm:text-base text-gray-600">
                Simple plans that grow with you. Billed monthly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {/* Free */}
              <div className="relative border border-gray-200 bg-white/80 backdrop-blur shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5 sm:p-6 border-b border-gray-200">
                  <div className="text-xs uppercase tracking-wider text-gray-600">
                    Free
                  </div>
                  <div className="mt-2 flex items-end gap-1">
                    <div className="text-2xl font-semibold text-black">$0</div>
                    <div className="text-xs text-gray-600 mb-1">/mo</div>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    Personal basics
                  </div>
                </div>
                <ul className="p-5 sm:p-6 text-sm text-gray-700 space-y-2 border-b border-gray-200">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 bg-black" /> Automatic
                    capture
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 bg-black" /> Local search
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 bg-black" /> Up to 500
                    memories
                  </li>
                </ul>
                <div className="p-5 sm:p-6">
                  <button
                    className="w-full border border-black text-black px-4 py-2 text-sm tracking-wide hover:bg-black hover:text-white transition-colors rounded-none"
                    onClick={() => (window.location.href = "/login")}
                  >
                    Get Started
                  </button>
                </div>
              </div>

              {/* Pro - featured */}
              <div className="relative border-2 border-black bg-white shadow-md hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 left-4 bg-black text-white text-[10px] uppercase tracking-wider px-2 py-1">
                  Most popular
                </div>
                <div className="p-6 sm:p-7 border-b border-gray-200">
                  <div className="text-xs uppercase tracking-wider text-gray-700">
                    Pro
                  </div>
                  <div className="mt-2 flex items-end gap-1">
                    <div className="text-3xl font-semibold text-black">$8</div>
                    <div className="text-xs text-gray-600 mb-1">/mo</div>
                  </div>
                  <div className="mt-1 text-sm text-gray-700">
                    Everything you need for speed
                  </div>
                </div>
                <ul className="p-6 sm:p-7 text-sm text-gray-800 space-y-2 border-b border-gray-200">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 bg-black" /> Unlimited
                    memories
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 bg-black" /> Faster
                    processing
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 bg-black" /> Priority
                    queue
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 bg-black" /> Smart search
                    boosts
                  </li>
                </ul>
                <div className="p-6 sm:p-7">
                  <button
                    className="w-full bg-black text-white px-4 py-2 text-sm tracking-wide hover:opacity-90 transition-opacity rounded-none"
                    onClick={() => (window.location.href = "/login?plan=pro")}
                  >
                    Start Pro
                  </button>
                  <div className="mt-2 text-[11px] text-gray-600 text-center">
                    7‑day money‑back guarantee
                  </div>
                </div>
              </div>

              {/* Teams */}
              <div className="relative border border-gray-200 bg-white/80 backdrop-blur shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5 sm:p-6 border-b border-gray-200">
                  <div className="text-xs uppercase tracking-wider text-gray-600">
                    Teams
                  </div>
                  <div className="mt-2 flex items-end gap-1">
                    <div className="text-2xl font-semibold text-black">$20</div>
                    <div className="text-xs text-gray-600 mb-1">/user</div>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    For small teams
                  </div>
                </div>
                <ul className="p-5 sm:p-6 text-sm text-gray-700 space-y-2 border-b border-gray-200">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 bg-black" /> Shared spaces
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 bg-black" /> Access
                    controls
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 bg-black" /> Usage
                    analytics
                  </li>
                </ul>
                <div className="p-5 sm:p-6">
                  <button
                    className="w-full border border-black text-black px-4 py-2 text-sm tracking-wide hover:bg-black hover:text-white transition-colors rounded-none"
                    onClick={() => (window.location.href = "/contact")}
                  >
                    Contact Sales
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-gray-600">
              Prices shown in USD. Cancel anytime.
            </div>
          </div>
        </Section>
      </div>

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
              <div className="mt-3">
                <div className="flex">
                  <input
                    type="email"
                    placeholder="Your email"
                    className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black rounded-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        window.location.href = "/login?subscribe=1"
                      }
                    }}
                  />
                  <button
                    className="ml-2 border border-black px-3 py-2 text-sm hover:bg-black hover:text-white transition-colors rounded-none"
                    onClick={() =>
                      (window.location.href = "/login?subscribe=1")
                    }
                  >
                    Subscribe
                  </button>
                </div>
                <div className="mt-2 text-[11px] text-gray-500">
                  Occasional updates. Unsubscribe anytime.
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={() =>
                    window.open(
                      "https://github.com/virajbhartiya/Cognia",
                      "_blank"
                    )
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
                  window.open(
                    "https://github.com/virajbhartiya/Cognia",
                    "_blank"
                  )
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
