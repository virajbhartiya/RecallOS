import React, { useEffect, useState } from 'react'
import { useWallet } from '../contexts/WalletContext'
import WalletModal from '../components/WalletModal'
import { MemoryService } from '../services/memoryService'
import { LoadingCard } from '../components/ui/loading-spinner'
import { DepositManager } from '../components/DepositManager'
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
  const { isConnected, address, gasBalance } = useWallet()
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [recentMemories, setRecentMemories] = useState<Memory[]>([])
  const [memoryCount, setMemoryCount] = useState(0)
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
        const [memories, count] = await Promise.all([
          MemoryService.getRecentMemories(address, 3),
          MemoryService.getUserMemoryCount(address)
        ])
        // Ensure memories is always an array
        setRecentMemories(Array.isArray(memories) ? memories : [])
        setMemoryCount(typeof count === 'number' ? count : 0)
      } catch (error) {
        console.error('Error fetching recent memories:', error)
        setRecentMemories([])
        setMemoryCount(0)
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
          if (isConnected) {
            window.location.href = '/memories'
          }
          break
        case 'w': {
          setIsWalletModalOpen(true)
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
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <button 
                className="text-sm font-mono text-gray-600 uppercase tracking-wide hover:text-black transition-colors cursor-pointer"
                onClick={() => window.open('/docs', '_blank')}
              >
                [D] DOCS
              </button>
              <button 
                className="text-sm font-mono text-gray-600 uppercase tracking-wide hover:text-black transition-colors cursor-pointer"
                onClick={() => window.open('https://github.com/virajbhartiya/RecallOS', '_blank')}
              >
                [G] GITHUB
              </button>
              <div className="text-sm font-mono text-blue-600 uppercase tracking-wide bg-blue-50 px-2 py-1 border border-blue-200">
                [TESTNET]
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                className="text-sm font-mono text-gray-600 uppercase tracking-wide hover:text-black transition-colors cursor-pointer"
                onClick={() => window.open('/console', '_blank')}
              >
                [C] CONSOLE
              </button>
              {isConnected && (
                <button 
                  className="text-sm font-mono text-gray-600 uppercase tracking-wide hover:text-black transition-colors cursor-pointer"
                  onClick={() => window.location.href = '/memories'}
                >
                  [M] MEMORIES
                </button>
              )}
              {isConnected && (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-xs font-mono text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                  </div>
                  {gasBalance && (
                    <button 
                      className="flex items-center space-x-1 text-xs font-mono hover:bg-gray-50 px-2 py-1 rounded transition-colors"
                      onClick={() => {
                        setIsDepositModalOpen(true)
                      }}
                    >
                      <span className="text-gray-600">Gas:</span>
                      <span className={`${parseFloat(gasBalance) < 0.005 ? 'text-yellow-600' : 'text-gray-900'}`}>
                        {parseFloat(gasBalance).toFixed(6)} ETH
                      </span>
                      {parseFloat(gasBalance) < 0.005 && (
                        <span className="text-yellow-600">⚠️</span>
                      )}
                    </button>
                  )}
                </div>
              )}
              <button 
                className="px-3 py-1 text-xs font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200"
                onClick={() => setIsWalletModalOpen(true)}
              >
                [W] {isConnected ? 'WALLET' : 'CONNECT WALLET'}
              </button>
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
                <ConsoleButton 
                  variant="console_key" 
                  className="group relative overflow-hidden"
                  onClick={() => window.open('https://github.com/virajbhartiya/RecallOS/releases/latest', '_blank')}
                >
                  <span className="relative z-10">[E] DOWNLOAD EXTENSION</span>
                  <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                </ConsoleButton>
                <ConsoleButton 
                  variant="outlined" 
                  className="group relative overflow-hidden"
                  onClick={() => window.open('/docs', '_blank')}
                >
                  <span className="relative z-10">[D] READ DOCS</span>
                  <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                </ConsoleButton>
              </div>
              
              {/* Installation Instructions */}
              <div className="mt-6 p-4 bg-gray-50 border border-gray-200">
                <div className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-3">[INSTALLATION STEPS]</div>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-start space-x-2">
                    <span className="text-gray-500 font-mono">1.</span>
                    <span>Download the extension .zip file from GitHub releases</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-gray-500 font-mono">2.</span>
                    <span>Extract the zip file to a folder on your computer</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-gray-500 font-mono">3.</span>
                    <span>Open Chrome/Edge → Extensions → Developer mode → Load unpacked</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-gray-500 font-mono">4.</span>
                    <span>Select the extracted folder and click "Select Folder"</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <button 
                    className="text-xs font-mono text-blue-600 hover:text-blue-800 transition-colors"
                    onClick={() => window.open('https://github.com/virajbhartiya/RecallOS/blob/main/extension/INSTALLATION.md', '_blank')}
                  >
                    [VIEW DETAILED INSTALLATION GUIDE]
                  </button>
                </div>
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

      <HowItWorks />
      <KeyFeatures />
      <TechnicalArchitecture />
      <UseCases />
      <IntegrationCapabilities />
      <PrivacySecurity />

      {/* Getting Started Section */}
      <Section className="bg-gray-50">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-light font-editorial mb-4">
            Get Started in Minutes
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Start building your personal knowledge network today
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 border border-blue-200 flex items-center justify-center mx-auto mb-4">
              <div className="text-2xl">📥</div>
            </div>
            <h3 className="text-lg font-light mb-3">Download & Install</h3>
            <p className="text-sm text-gray-600">
              Download from GitHub releases and install manually in Chrome/Edge developer mode.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 border border-green-200 flex items-center justify-center mx-auto mb-4">
              <div className="text-2xl">🌐</div>
            </div>
            <h3 className="text-lg font-light mb-3">Browse & Learn</h3>
            <p className="text-sm text-gray-600">
              Just browse the web normally. RecallOS captures and connects everything you read.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 border border-purple-200 flex items-center justify-center mx-auto mb-4">
              <div className="text-2xl">🤖</div>
            </div>
            <h3 className="text-lg font-light mb-3">Ask & Discover</h3>
            <p className="text-sm text-gray-600">
              Search your memories or chat with AI. Get answers informed by everything you've learned.
            </p>
          </div>
        </div>

        <div className="text-center mt-12">
          <ConsoleButton variant="outlined" className="mr-4">
            Try RecallOS Free
          </ConsoleButton>
          <ConsoleButton variant="console_key">
            View Demo
          </ConsoleButton>
        </div>
      </Section>

      {/* Memory Preview Section */}
      {isConnected && (
        <Section className="bg-gray-50">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-light font-editorial mb-4">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
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
                  <div className="text-2xl font-light font-mono text-gray-800">
                    {Array.isArray(recentMemories) ? recentMemories.filter(m => m.tx_status === 'confirmed').length : 0}
                  </div>
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

              <div className="mt-4">
                <button
                  onClick={() => window.location.href = '/memories'}
                  className="w-full px-4 py-3 text-sm font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200"
                >
                  [VIEW ALL MEMORIES]
                </button>
              </div>
            </div>
          </div>
        </Section>
      )}


      <WalletModal 
        isOpen={isWalletModalOpen} 
        onClose={() => setIsWalletModalOpen(false)} 
      />

      {/* Deposit Modal */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-light">Gas Deposit Manager</h2>
              <button 
                onClick={() => setIsDepositModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-xl font-mono"
              >
                ×
              </button>
            </div>
            <DepositManager onClose={() => setIsDepositModalOpen(false)} />
          </div>
        </div>
      )}

    </div>
  )
}
