import React, { useEffect, useState } from 'react'
import { MemoryService } from '../services/memoryService'
import { LoadingCard } from '../components/ui/loading-spinner'
import type { Memory } from '../types/memory'
import { 
  Section, 
  ConsoleButton,
  HowItWorks,
  KeyFeatures,
  TechnicalArchitecture,
  UseCases,
  IntegrationCapabilities,
  PrivacySecurity
} from '../components/sections'


const MemoryPreviewCard: React.FC<{ memory: Memory }> = ({ memory }) => {
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'No date'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid date'
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  return (
    <div className="bg-white border border-gray-200 p-3 hover:border-black transition-all duration-300">
      <div className="text-xs font-mono text-gray-600 mb-1">
        {formatDate(memory.created_at)}
      </div>
      <h4 className="text-sm font-light mb-1 line-clamp-2">
        {memory.title || 'Untitled Memory'}
      </h4>
      {memory.summary && (
        <p className="text-xs text-gray-600 line-clamp-2">
          {memory.summary}
        </p>
      )}
      <div className="flex items-center justify-between mt-2 text-xs font-mono text-gray-500">
        <span>[{memory.source?.toUpperCase() || 'UNKNOWN'}]</span>
        {memory.tx_status && (
          <span className={`px-1 py-0.5 text-xs border rounded ${
            memory.tx_status === 'confirmed' ? 'bg-green-100 text-green-800 border-green-200' :
            memory.tx_status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
            'bg-gray-100 text-gray-800 border-gray-200'
          }`}>
            {memory.tx_status}
          </span>
        )}
      </div>
    </div>
  )
}

export const Landing = () => {
  const isConnected = false
  const address: string | null = null
  const [recentMemories, setRecentMemories] = useState<Memory[]>([])
  const [memoryCount, setMemoryCount] = useState(0)
  const [confirmedCount, setConfirmedCount] = useState(0)
  const [isLoadingMemories, setIsLoadingMemories] = useState(false)

  // Fetch recent memories when wallet is connected
  useEffect(() => {
    const fetchRecentMemories = async () => {
      if (!isConnected || !address) {
        setRecentMemories([])
        setMemoryCount(0)
        return
      }

      setIsLoadingMemories(true)
      try {
        const [memories, count, insights] = await Promise.all([
          MemoryService.getRecentMemories(address, 3),
          MemoryService.getUserMemoryCount(address),
          MemoryService.getMemoryInsights(address)
        ])
        // Ensure memories is always an array
        setRecentMemories(Array.isArray(memories) ? memories : [])
        setMemoryCount(typeof count === 'number' ? count : 0)
        setConfirmedCount(typeof insights?.confirmed_transactions === 'number' ? insights.confirmed_transactions : 0)
      } catch (error) {
        console.error('Error fetching recent memories:', error)
        setRecentMemories([])
        setMemoryCount(0)
        setConfirmedCount(0)
      } finally {
        setIsLoadingMemories(false)
      }
    }

    fetchRecentMemories()
  }, [isConnected, address])

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return
      }

      switch (event.key.toLowerCase()) {
        case 'c':
          window.open('/console', '_blank')
          break
        case 'd':
          window.open('/docs', '_blank')
          break
        case 'e':
          window.open('https://github.com/virajbhartiya/RecallOS/releases/latest', '_blank')
          break
        case 'g':
          window.open('https://github.com/virajbhartiya/RecallOS', '_blank')
          break
        case 'm':
          window.location.href = '/memories'
          break
        case 'h':
          window.location.href = '/hyperindex'
          break
        case 'l':
          window.location.href = '/login'
          break
        case 'w': {
          // Trigger wallet modal through WalletStatus component
          const walletButton = document.querySelector('[data-wallet-trigger]') as HTMLButtonElement
          if (walletButton) {
            walletButton.click()
          }
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isConnected])

  return (
    <div className="min-h-screen bg-gray-50 text-black relative font-primary" role="main">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center flex-wrap gap-4 sm:gap-8">
              <button 
                className="text-xs sm:text-sm font-mono text-gray-600 uppercase tracking-wide hover:text-black transition-colors cursor-pointer"
                onClick={() => window.open('/docs', '_blank')}
              >
                [D] DOCS
              </button>
              <button 
                className="text-xs sm:text-sm font-mono text-gray-600 uppercase tracking-wide hover:text-black transition-colors cursor-pointer"
                onClick={() => window.open('https://github.com/virajbhartiya/RecallOS', '_blank')}
              >
                [G] GITHUB
              </button>
              <button 
                className="text-xs sm:text-sm font-mono text-gray-600 uppercase tracking-wide hover:text-black transition-colors cursor-pointer"
                onClick={() => window.location.href = '/login'}
              >
                [L] LOGIN
              </button>
              
            </div>
            <div className="flex items-center flex-wrap gap-2 sm:gap-4">
              <button 
                className="text-xs sm:text-sm font-mono text-gray-600 uppercase tracking-wide hover:text-black transition-colors cursor-pointer"
                onClick={() => window.open('/console', '_blank')}
              >
                [C] CONSOLE
              </button>
              {isConnected && (
                <>
                  <button 
                    className="text-xs sm:text-sm font-mono text-gray-600 uppercase tracking-wide hover:text-black transition-colors cursor-pointer"
                    onClick={() => window.location.href = '/memories'}
                  >
                    [M] MEMORIES
                  </button>
                  <button 
                    className="text-xs sm:text-sm font-mono text-blue-600 uppercase tracking-wide hover:text-blue-800 transition-colors cursor-pointer"
                    onClick={() => window.location.href = '/hyperindex'}
                  >
                    [H] HYPERINDEX
                  </button>
                </>
              )}
              
            </div>
          </div>
        </div>
      </header>

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
      <Section className="min-h-screen bg-white relative overflow-hidden py-12 sm:py-16 lg:py-24">
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 h-full flex items-start lg:items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-16 items-center w-full">
            {/* Left Column - Main Content */}
            <div className="space-y-8 sm:space-y-10 max-w-2xl">
              {/* Enhanced headline with better value proposition */}
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-light leading-tight font-editorial">
                <span className="block">Browser Extension</span>
                <span className="block italic text-gray-800">That Monitors</span>
                <span className="block text-2xl sm:text-3xl lg:text-5xl text-gray-600 font-mono font-light mt-2">
                  Everything
                </span>
              </h1>
              
              {/* Clear value proposition */}
              <div className="space-y-3">
                <p className="text-xl text-gray-800 leading-relaxed font-primary font-medium">
                  RecallOS is a browser extension that monitors your activity and builds a personal memory graph for you.
                </p>
                <p className="text-base text-gray-600 leading-relaxed font-primary">
                  Works with any LLM agent. Every click, scroll, and interaction is automatically captured and embedded.
                  Your AI builds a persistent, searchable memory mesh that grows with you.
                </p>
              </div>

              {/* Simplified: removed feature chips for cleaner layout */}
              
              <div className="mt-6 sm:mt-8 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <ConsoleButton 
                    variant="console_key" 
                    className="group relative overflow-hidden flex-1 sm:flex-none"
                    onClick={() => window.open('https://github.com/virajbhartiya/RecallOS/releases/latest', '_blank')}
                  >
                    <span className="relative z-10 whitespace-nowrap">[E] DOWNLOAD EXTENSION</span>
                    <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                  </ConsoleButton>
                  <ConsoleButton
                    variant="outlined"
                    className="group relative overflow-hidden flex-1 sm:flex-none"
                    onClick={() => window.location.href = '/docs'}
                  >
                    <span className="relative z-10 whitespace-nowrap">[D] READ DOCS</span>
                    <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                  </ConsoleButton>
                </div>
                <div className="flex justify-center sm:justify-start">
                  <ConsoleButton
                    variant="outlined"
                    className="group relative overflow-hidden w-full sm:w-auto"
                    onClick={() => { window.location.href = '/memories' }}
                  >
                    <span className="relative z-10 whitespace-nowrap">[M] VIEW MEMORIES</span>
                    <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                  </ConsoleButton>
                </div>
              </div>
              
              {/* Installation section removed to reduce clutter */}
            </div>
            {/* Right Column - Visual Panel */}
            <div className="w-full mt-6 lg:mt-0">
              <div className="relative bg-white border border-gray-200 overflow-hidden">
                {/* Top status bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
                  <div className="text-xs font-mono text-gray-600 uppercase tracking-wide">[Preview]</div>
                  <div className="flex items-center gap-2 text-xs font-mono text-gray-600">
                    <span className="px-1 py-0.5 border border-green-200 bg-green-50 text-green-700">LIVE</span>
                    <span className="hidden sm:inline">MEMORY FEED</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6">
                  {isConnected && recentMemories.length > 0 ? (
                    <div className="space-y-3">
                      {recentMemories.map((memory) => (
                        <MemoryPreviewCard key={memory.id} memory={memory} />
                      ))}
                      <div className="mt-4 text-xs font-mono text-gray-500">[Showing latest 3 memories]</div>
                    </div>
                  ) : (
                    <div className="relative h-64 sm:h-72 md:h-80 border border-dashed border-gray-300 grid place-items-center bg-gradient-to-br from-gray-50 to-gray-100">
                      <div className="text-center space-y-4">
                        <div className="text-5xl mb-2">🧠</div>
                        <div className="text-sm font-mono text-gray-600">INSTALL EXTENSION TO SEE LIVE MEMORIES</div>
                        <div className="flex justify-center">
                          <button
                            onClick={() => window.location.href = '/docs'}
                            className="text-xs font-mono uppercase tracking-wide border border-gray-400 bg-white hover:bg-gray-50 px-4 py-2 transition-all duration-200 hover:border-gray-600"
                          >
                            [READ DOCS]
                          </button>
                        </div>
                      </div>
                      {/* Decorative dots */}
                      <div className="pointer-events-none absolute inset-0 opacity-30" style={{backgroundImage: `radial-gradient(#000 1px, transparent 1px)`, backgroundSize: '12px 12px'}} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <HowItWorks />
      <KeyFeatures />
      <TechnicalArchitecture />
      <UseCases />
      <IntegrationCapabilities />
      <PrivacySecurity />



      {/* Memory Preview Section */}
      {isConnected && (
        <Section className="bg-gray-50">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-light font-editorial mb-4">
              Your Memory Network
            </h2>
            <div className="flex items-center justify-center space-x-4 text-sm font-mono text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>{memoryCount} MEMORIES</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                <span>BLOCKCHAIN VERIFIED</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            {/* Recent Memories */}
            <div>
              <div className="text-sm font-mono text-gray-600 mb-4 uppercase tracking-wide">
                [RECENT MEMORIES]
              </div>
              {isLoadingMemories ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <LoadingCard key={index} />
                  ))}
                </div>
              ) : recentMemories.length > 0 ? (
                <div className="space-y-3">
                  {recentMemories.map((memory) => (
                    <MemoryPreviewCard key={memory.id} memory={memory} />
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 p-6 text-center">
                  <div className="text-sm font-mono text-gray-600 mb-2">
                    [NO MEMORIES YET]
                  </div>
                  <div className="text-sm text-gray-500">
                    Install the browser extension to start building your memory network
                  </div>
                </div>
              )}
            </div>

            {/* Memory Stats */}
            <div>
              <div className="text-sm font-mono text-gray-600 mb-4 uppercase tracking-wide">
                [MEMORY STATS]
              </div>
              <div className="bg-white border border-gray-200 p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-light font-mono text-gray-800">
                      {memoryCount}
                    </div>
                    <div className="text-xs font-mono text-gray-600 mt-1">TOTAL MEMORIES</div>
                  </div>
                  <div className="text-center">
                  <div className="text-2xl font-light font-mono text-gray-800">{confirmedCount}</div>
                    <div className="text-xs font-mono text-gray-600 mt-1">CONFIRMED</div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="text-xs font-mono text-gray-600 mb-2 uppercase tracking-wide">
                    SOURCE BREAKDOWN
                  </div>
                  <div className="space-y-1">
                    {['browser', 'manual', 'on_chain', 'reasoning'].map(source => {
                      const count = Array.isArray(recentMemories) ? recentMemories.filter(m => m.source === source).length : 0
                      return count > 0 ? (
                        <div key={source} className="flex justify-between text-xs">
                          <span className="capitalize">{source}</span>
                          <span>{count}</span>
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <button
                  onClick={() => window.location.href = '/memories'}
                  className="w-full px-4 py-3 text-sm font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200"
                >
                  [VIEW ALL MEMORIES]
                </button>
                <button
                  onClick={() => window.location.href = '/docs'}
                  className="w-full px-4 py-2 text-xs font-mono uppercase tracking-wide border border-gray-300 bg-gray-50 hover:bg-gray-100 transition-all duration-200"
                >
                  [READ DOCS]
                </button>
              </div>
            </div>
          </div>
        </Section>
      )}



    </div>
  )
}
