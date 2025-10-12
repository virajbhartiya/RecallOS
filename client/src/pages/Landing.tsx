import React, { useEffect } from 'react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

const ConsoleButton: React.FC<{
  children: React.ReactNode
  variant?: 'console_key' | 'outlined'
  onClick?: () => void
  className?: string
}> = ({ children, variant = 'outlined', onClick, className = '' }) => {
  const baseClasses = "px-6 py-3 text-sm font-mono uppercase tracking-wide transition-all duration-200 cursor-pointer"
  
  const variantClasses = {
    console_key: "bg-gray-100 border border-gray-300 rounded-full hover:bg-black hover:text-white hover:border-black",
    outlined: "border border-black bg-transparent hover:bg-black hover:text-white"
  }
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}


const Section: React.FC<{
  children: React.ReactNode
  className?: string
  animate?: boolean
}> = ({ children, className = '', animate = true }) => {
  const { ref, isVisible } = useScrollAnimation(0.1)
  
  return (
    <section 
      ref={ref}
      className={`py-16 border-b border-gray-200 transition-all duration-1000 ${
        animate && isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto px-8">
        {children}
      </div>
    </section>
  )
}

export const Landing = () => {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key.toLowerCase()) {
        case 'c':
          // Launch console action
          console.log('Launch console')
          break
        case 'd':
          // Read docs action
          console.log('Read docs')
          break
        case 'e':
          // Install extension action
          console.log('Install extension')
          break
        case 'g':
          // GitHub action
          console.log('Open GitHub')
          break
        case 'w':
          // Connect wallet action
          console.log('Connect wallet')
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 text-black relative font-primary" role="main">
      {/* Navigation Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="text-sm font-mono text-gray-600 uppercase tracking-wide">
                [D] DOCS
              </div>
              <div className="text-sm font-mono text-gray-600 uppercase tracking-wide">
                [G] GITHUB
              </div>
              <div className="text-sm font-mono text-blue-600 uppercase tracking-wide bg-blue-50 px-2 py-1 border border-blue-200">
                [TESTNET]
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm font-mono text-gray-600 uppercase tracking-wide">
                [C] CONSOLE
              </div>
              <button className="px-3 py-1 text-xs font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200">
                [W] CONNECT WALLET
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Grid overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '8px 8px'
        }} />
      </div>
      {/* Hero Section */}
      <Section className="min-h-screen bg-white relative overflow-hidden">
        {/* Animated Geometric Background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Floating geometric shapes */}
          <div className="absolute top-20 left-10 w-4 h-4 border border-gray-300 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-6 h-6 border border-gray-300 rotate-45 animate-bounce" style={{animationDuration: '3s'}}></div>
          <div className="absolute bottom-40 left-1/4 w-3 h-3 bg-gray-200 rounded-full animate-ping" style={{animationDuration: '2s'}}></div>
          <div className="absolute top-1/2 right-1/3 w-2 h-8 border-l border-gray-300 animate-pulse" style={{animationDelay: '1s'}}></div>
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-5">
            <div className="w-full h-full" style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }} />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 relative z-10 h-full flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
            {/* Left Column - Main Content */}
            <div className="space-y-6">
              {/* Enhanced headline with better value proposition */}
              <h1 className="text-5xl lg:text-7xl font-light leading-tight font-editorial">
                <span className="block">Browser Extension</span>
                <span className="block italic text-gray-800">That Monitors</span>
                <span className="block text-3xl lg:text-5xl text-gray-600 font-mono font-light mt-2">
                  Everything
                </span>
              </h1>
              
              {/* Clear value proposition */}
              <div className="space-y-3">
                <p className="text-xl text-gray-800 leading-relaxed font-primary font-medium">
                  RecallOS is a browser extension that monitors your activity and creates a verifiable memory graph on the blockchain.
                </p>
                <p className="text-base text-gray-600 leading-relaxed font-primary">
                  Works with any LLM agent. Every click, scroll, and interaction is automatically captured, embedded, and anchored on-chain. 
                  Your AI builds a persistent, searchable memory mesh that grows with you.
                </p>
              </div>

              {/* Key features highlight */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="flex items-center space-x-2 text-sm font-mono text-gray-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>BROWSER MONITORING</span>
                </div>
                <div className="flex items-center space-x-2 text-sm font-mono text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <span>MEMORY GRAPH</span>
                </div>
                <div className="flex items-center space-x-2 text-sm font-mono text-gray-600">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                  <span>ANY LLM AGENT</span>
                </div>
                <div className="flex items-center space-x-2 text-sm font-mono text-gray-600">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
                  <span>BLOCKCHAIN PROOF</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <ConsoleButton variant="console_key" className="group relative overflow-hidden">
                  <span className="relative z-10">[E] INSTALL EXTENSION</span>
                  <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                </ConsoleButton>
                <ConsoleButton variant="outlined" className="group relative overflow-hidden">
                  <span className="relative z-10">[D] READ DOCS</span>
                  <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                </ConsoleButton>
              </div>
            </div>

            {/* Right Column - Interactive Demo & Stats */}
            <div className="space-y-6">
              {/* Interactive demo preview */}
              <div className="bg-gray-50 border border-gray-200 p-6 relative group hover:border-black transition-all duration-300">
                <div className="absolute top-2 right-2 text-xs font-mono text-gray-400 group-hover:text-black transition-colors">+</div>
                <div className="text-sm font-mono text-gray-600 mb-2">[LIVE DEMO]</div>
                <div className="text-lg font-light mb-4">Extension Monitoring Flow</div>
                <div className="flex flex-wrap items-center gap-3 text-sm font-mono text-gray-600">
                  <span className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>MONITOR</span>
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
                    <span>GRAPH</span>
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
                    <span>LLM AGENT</span>
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style={{animationDelay: '0.9s'}}></div>
                    <span>BLOCKCHAIN</span>
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '1.2s'}}></div>
                    <span>MEMORY</span>
                  </span>
                </div>
              </div>

              {/* Stats/Features Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 p-4 hover:border-black transition-all duration-300">
                  <div className="text-2xl font-light font-mono text-gray-800">∞</div>
                  <div className="text-sm font-mono text-gray-600 mt-1">ACTIVITIES</div>
                  <div className="text-xs text-gray-500 mt-1">Monitored & stored</div>
                </div>
                <div className="bg-white border border-gray-200 p-4 hover:border-black transition-all duration-300">
                  <div className="text-2xl font-light font-mono text-gray-800">24/7</div>
                  <div className="text-sm font-mono text-gray-600 mt-1">MONITORING</div>
                  <div className="text-xs text-gray-500 mt-1">Background tracking</div>
                </div>
                <div className="bg-white border border-gray-200 p-4 hover:border-black transition-all duration-300">
                  <div className="text-2xl font-light font-mono text-gray-800">ANY</div>
                  <div className="text-sm font-mono text-gray-600 mt-1">LLM AGENT</div>
                  <div className="text-xs text-gray-500 mt-1">Universal compatibility</div>
                </div>
                <div className="bg-white border border-gray-200 p-4 hover:border-black transition-all duration-300">
                  <div className="text-2xl font-light font-mono text-gray-800">GRAPH</div>
                  <div className="text-sm font-mono text-gray-600 mt-1">MEMORY</div>
                  <div className="text-xs text-gray-500 mt-1">Visual connections</div>
                </div>
              </div>

              {/* Quick Start Steps */}
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-sm font-mono text-gray-600 mb-3">[QUICK START]</div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border border-gray-300 flex items-center justify-center text-xs font-mono">1</div>
                    <span className="text-gray-700">Install browser extension</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border border-gray-300 flex items-center justify-center text-xs font-mono">2</div>
                    <span className="text-gray-700">Connect your wallet</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border border-gray-300 flex items-center justify-center text-xs font-mono">3</div>
                    <span className="text-gray-700">Start building memories</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

    </div>
  )
}
