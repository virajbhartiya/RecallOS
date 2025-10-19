import React, { useEffect, useState } from 'react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'
import { useWallet } from '../contexts/WalletContext'
import WalletModal from '../components/WalletModal'
import { MemoryService } from '../services/memoryService'
import { LoadingCard } from '../components/ui/loading-spinner'
import { DepositManager } from '../components/DepositManager'
import type { Memory } from '../types/memory'

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
          window.open('https://chrome.google.com/webstore', '_blank')
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
                  onClick={() => window.open('https://chrome.google.com/webstore', '_blank')}
                >
                  <span className="relative z-10">[E] INSTALL EXTENSION</span>
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

      {/* How It Works Section */}
      <Section className="bg-gray-50">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-light font-editorial mb-4">
            How RecallOS Works
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            A complete pipeline from browser monitoring to AI-powered memory retrieval
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Step 1: Browser Monitoring */}
          <div className="bg-white border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 border border-blue-200 flex items-center justify-center text-sm font-mono font-bold text-blue-800">1</div>
              <h3 className="text-lg font-light">Browser Monitoring</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Extension automatically captures page content, metadata, and user interactions as you browse.
            </p>
            <div className="space-y-2 text-xs font-mono text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Content extraction</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Metadata parsing</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Activity tracking</span>
              </div>
            </div>
          </div>

          {/* Step 2: AI Processing */}
          <div className="bg-white border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-green-100 border border-green-200 flex items-center justify-center text-sm font-mono font-bold text-green-800">2</div>
              <h3 className="text-lg font-light">AI Processing</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Gemini or Ollama generates summaries, embeddings, and extracts structured metadata from captured content.
            </p>
            <div className="space-y-2 text-xs font-mono text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>Content summarization</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>Embedding generation</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>Metadata extraction</span>
              </div>
            </div>
          </div>

          {/* Step 3: Memory Mesh */}
          <div className="bg-white border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-purple-100 border border-purple-200 flex items-center justify-center text-sm font-mono font-bold text-purple-800">3</div>
              <h3 className="text-lg font-light">Memory Mesh</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Creates semantic, topical, and temporal relationships between memories to build a navigable knowledge graph.
            </p>
            <div className="space-y-2 text-xs font-mono text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                <span>Semantic relations</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                <span>Topical clustering</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                <span>Temporal connections</span>
              </div>
            </div>
          </div>

          {/* Step 4: Blockchain Anchoring */}
          <div className="bg-white border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-orange-100 border border-orange-200 flex items-center justify-center text-sm font-mono font-bold text-orange-800">4</div>
              <h3 className="text-lg font-light">Blockchain Anchoring</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Content hashes are stored on Sepolia testnet for verifiable proof of memory existence and timestamp.
            </p>
            <div className="space-y-2 text-xs font-mono text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                <span>SHA256 hashing</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                <span>Sepolia anchoring</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                <span>Transaction tracking</span>
              </div>
            </div>
          </div>

          {/* Step 5: Search & Retrieval */}
          <div className="bg-white border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-red-100 border border-red-200 flex items-center justify-center text-sm font-mono font-bold text-red-800">5</div>
              <h3 className="text-lg font-light">Search & Retrieval</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              pgvector similarity search with hybrid keyword + semantic matching and LLM-generated contextual answers.
            </p>
            <div className="space-y-2 text-xs font-mono text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                <span>Vector similarity</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                <span>Hybrid search</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                <span>LLM answers</span>
              </div>
            </div>
          </div>

          {/* Step 6: ChatGPT Integration */}
          <div className="bg-white border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-indigo-100 border border-indigo-200 flex items-center justify-center text-sm font-mono font-bold text-indigo-800">6</div>
              <h3 className="text-lg font-light">ChatGPT Integration</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Automatically injects relevant memories into ChatGPT conversations with 1.5s typing delay for context-aware responses.
            </p>
            <div className="space-y-2 text-xs font-mono text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                <span>Auto-injection</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                <span>Context-aware</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                <span>Citation support</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Key Features Deep Dive Section */}
      <Section className="bg-white">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-light font-editorial mb-4">
            Key Features Deep Dive
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Advanced capabilities that make RecallOS a powerful memory management system
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Browser Monitoring */}
          <div className="bg-gray-50 border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <h3 className="text-xl font-light">Browser Monitoring</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Intelligent content capture with privacy-aware monitoring and rich metadata extraction.
            </p>
            <div className="space-y-3">
              <div className="bg-white border border-gray-200 p-3">
                <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">Content Extraction</div>
                <div className="text-sm text-gray-700">
                  Captures visible text, meaningful content, page structure, and user interactions with boilerplate filtering.
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-3">
                <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">Privacy Protection</div>
                <div className="text-sm text-gray-700">
                  Automatically skips localhost, detects privacy extensions, and respects user activity patterns.
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-3">
                <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">Rich Metadata</div>
                <div className="text-sm text-gray-700">
                  Extracts topics, keywords, reading time, content quality, and structured data from every page.
                </div>
              </div>
            </div>
          </div>

          {/* Memory Graph */}
          <div className="bg-gray-50 border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
              <h3 className="text-xl font-light">Memory Graph</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Creates a navigable knowledge mesh with multiple relationship types and intelligent clustering.
            </p>
            <div className="space-y-3">
              <div className="bg-white border border-gray-200 p-3">
                <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">Semantic Relations</div>
                <div className="text-sm text-gray-700">
                  Cosine similarity on 768-dim embeddings with ≥0.3 threshold for meaningful connections.
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-3">
                <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">Topical Relations</div>
                <div className="text-sm text-gray-700">
                  Weighted overlap of topics, categories, key points, and searchable terms with domain awareness.
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-3">
                <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">Visual Layout</div>
                <div className="text-sm text-gray-700">
                  Force-directed layout with source-based clustering and mutual kNN pruning for clean visualization.
                </div>
              </div>
            </div>
          </div>

          {/* LLM Agent Integration */}
          <div className="bg-gray-50 border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
              <h3 className="text-xl font-light">LLM Agent Integration</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Universal compatibility with any LLM agent, featuring intelligent context injection and citation support.
            </p>
            <div className="space-y-3">
              <div className="bg-white border border-gray-200 p-3">
                <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">ChatGPT Auto-Injection</div>
                <div className="text-sm text-gray-700">
                  Automatically injects relevant memories with 1.5s typing delay and visual status indicators.
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-3">
                <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">Context-Aware Retrieval</div>
                <div className="text-sm text-gray-700">
                  Searches memories based on conversation context and provides relevant background information.
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-3">
                <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">Citation Support</div>
                <div className="text-sm text-gray-700">
                  Provides numbered citations with memory titles and URLs for verifiable information sources.
                </div>
              </div>
            </div>
          </div>

          {/* Blockchain Proof */}
          <div className="bg-gray-50 border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
              <h3 className="text-xl font-light">Blockchain Proof</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Verifiable memory provenance with on-chain anchoring and transparent transaction tracking.
            </p>
            <div className="space-y-3">
              <div className="bg-white border border-gray-200 p-3">
                <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">Content Hashing</div>
                <div className="text-sm text-gray-700">
                  SHA256 hashing of memory summaries with URL hashing via keccak256 for unique identification.
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-3">
                <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">Sepolia Anchoring</div>
                <div className="text-sm text-gray-700">
                  Batch storage on Sepolia testnet with upgradeable proxy pattern for future enhancements.
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-3">
                <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">Transaction Tracking</div>
                <div className="text-sm text-gray-700">
                  Full integration with Blockscout for transaction verification and gas usage monitoring.
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Technical Architecture Section */}
      <Section className="bg-gray-50">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-light font-editorial mb-4">
            Technical Architecture
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Complete data flow from browser monitoring to AI-powered memory retrieval
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Architecture Flow */}
          <div className="bg-white border border-gray-200 p-8 mb-8">
            <div className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-6 text-center">[DATA FLOW]</div>
            
            {/* Architecture Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Row 1: Extension, API, AI Provider */}
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 border border-blue-200 flex items-center justify-center mx-auto mb-3">
                  <div className="w-8 h-8 bg-blue-500 rounded"></div>
                </div>
                <h4 className="text-sm font-mono text-gray-800 mb-2">BROWSER EXTENSION</h4>
                <p className="text-xs text-gray-600">Content capture & monitoring</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 border border-green-200 flex items-center justify-center mx-auto mb-3">
                  <div className="w-8 h-8 bg-green-500 rounded"></div>
                </div>
                <h4 className="text-sm font-mono text-gray-800 mb-2">API SERVER</h4>
                <p className="text-xs text-gray-600">Express.js + Prisma</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 border border-purple-200 flex items-center justify-center mx-auto mb-3">
                  <div className="w-8 h-8 bg-purple-500 rounded"></div>
                </div>
                <h4 className="text-sm font-mono text-gray-800 mb-2">AI PROVIDER</h4>
                <p className="text-xs text-gray-600">Gemini + Ollama</p>
              </div>

              {/* Row 2: Database, Blockchain, Search */}
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 border border-orange-200 flex items-center justify-center mx-auto mb-3">
                  <div className="w-8 h-8 bg-orange-500 rounded"></div>
                </div>
                <h4 className="text-sm font-mono text-gray-800 mb-2">POSTGRESQL + PGVECTOR</h4>
                <p className="text-xs text-gray-600">Memory storage & embeddings</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 border border-red-200 flex items-center justify-center mx-auto mb-3">
                  <div className="w-8 h-8 bg-red-500 rounded"></div>
                </div>
                <h4 className="text-sm font-mono text-gray-800 mb-2">SEPOLIA BLOCKCHAIN</h4>
                <p className="text-xs text-gray-600">Memory Registry Contract</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 border border-indigo-200 flex items-center justify-center mx-auto mb-3">
                  <div className="w-8 h-8 bg-indigo-500 rounded"></div>
                </div>
                <h4 className="text-sm font-mono text-gray-800 mb-2">SEARCH ENGINE</h4>
                <p className="text-xs text-gray-600">Hybrid + LLM answers</p>
              </div>
            </div>

            {/* Flow Connections */}
            <div className="mt-8 text-center">
              <div className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-4">[DATA FLOW CONNECTIONS]</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="bg-gray-50 border border-gray-200 p-3">
                  <div className="font-mono text-gray-800 mb-1">Extension → API</div>
                  <div className="text-gray-600">Content ingestion</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-3">
                  <div className="font-mono text-gray-800 mb-1">API → AI Provider</div>
                  <div className="text-gray-600">Processing requests</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-3">
                  <div className="font-mono text-gray-800 mb-1">AI → Database</div>
                  <div className="text-gray-600">Storage & embeddings</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-3">
                  <div className="font-mono text-gray-800 mb-1">Database → Blockchain</div>
                  <div className="text-gray-600">Hash anchoring</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-3">
                  <div className="font-mono text-gray-800 mb-1">API → Search</div>
                  <div className="text-gray-600">Query processing</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-3">
                  <div className="font-mono text-gray-800 mb-1">Search → Database</div>
                  <div className="text-gray-600">Vector similarity</div>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 p-6">
              <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-4">[PROCESSING PIPELINE]</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Content Ingestion</span>
                  <span className="font-mono text-gray-800">POST /api/memory/processRawContent</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">AI Processing</span>
                  <span className="font-mono text-gray-800">Hybrid Provider</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Embedding Generation</span>
                  <span className="font-mono text-gray-800">768-dim vectors</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Relation Building</span>
                  <span className="font-mono text-gray-800">Semantic + Topical + Temporal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Blockchain Anchoring</span>
                  <span className="font-mono text-gray-800">Batch storage</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6">
              <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-4">[SEARCH PIPELINE]</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Query Processing</span>
                  <span className="font-mono text-gray-800">POST /api/search</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vector Similarity</span>
                  <span className="font-mono text-gray-800">pgvector distance</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hybrid Search</span>
                  <span className="font-mono text-gray-800">0.4 keyword + 0.6 semantic</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">LLM Answer</span>
                  <span className="font-mono text-gray-800">Context + Citations</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Response Format</span>
                  <span className="font-mono text-gray-800">Answer + [n] citations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Use Cases Section */}
      <Section className="bg-white">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-light font-editorial mb-4">
            Real-World Use Cases
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            How RecallOS transforms different workflows and knowledge management scenarios
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Research & Learning */}
          <div className="bg-gray-50 border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <h3 className="text-lg font-light">Research & Learning</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Track documentation, articles, and tutorials with automatic connections between related concepts.
            </p>
            <div className="space-y-2 text-xs font-mono text-gray-500">
              <div>• Academic paper connections</div>
              <div>• Tutorial sequence tracking</div>
              <div>• Knowledge gap identification</div>
              <div>• Citation network building</div>
            </div>
          </div>

          {/* Development Work */}
          <div className="bg-gray-50 border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <h3 className="text-lg font-light">Development Work</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Link GitHub repos, Stack Overflow answers, and documentation for comprehensive project knowledge.
            </p>
            <div className="space-y-2 text-xs font-mono text-gray-500">
              <div>• Code repository tracking</div>
              <div>• Stack Overflow Q&A linking</div>
              <div>• API documentation indexing</div>
              <div>• Bug fix pattern recognition</div>
            </div>
          </div>

          {/* Meeting Notes */}
          <div className="bg-gray-50 border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <h3 className="text-lg font-light">Meeting Notes</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Connect Google Meet transcripts with related project memories and action items.
            </p>
            <div className="space-y-2 text-xs font-mono text-gray-500">
              <div>• Meeting transcript analysis</div>
              <div>• Action item tracking</div>
              <div>• Project context linking</div>
              <div>• Follow-up automation</div>
            </div>
          </div>

          {/* Content Creation */}
          <div className="bg-gray-50 border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <h3 className="text-lg font-light">Content Creation</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Build knowledge graphs from research materials for comprehensive content development.
            </p>
            <div className="space-y-2 text-xs font-mono text-gray-500">
              <div>• Research material organization</div>
              <div>• Source verification</div>
              <div>• Content gap analysis</div>
              <div>• Fact-checking automation</div>
            </div>
          </div>

          {/* Personal Knowledge Base */}
          <div className="bg-gray-50 border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <h3 className="text-lg font-light">Personal Knowledge Base</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Create a searchable, verifiable memory archive of your digital interactions and learning.
            </p>
            <div className="space-y-2 text-xs font-mono text-gray-500">
              <div>• Digital footprint tracking</div>
              <div>• Learning progress monitoring</div>
              <div>• Interest pattern analysis</div>
              <div>• Knowledge retention metrics</div>
            </div>
          </div>

          {/* Team Collaboration */}
          <div className="bg-gray-50 border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
              <h3 className="text-lg font-light">Team Collaboration</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Share knowledge graphs and memory networks for enhanced team productivity and context sharing.
            </p>
            <div className="space-y-2 text-xs font-mono text-gray-500">
              <div>• Shared memory networks</div>
              <div>• Context-aware collaboration</div>
              <div>• Knowledge transfer automation</div>
              <div>• Team learning analytics</div>
            </div>
          </div>
        </div>
      </Section>

      {/* Integration Capabilities Section */}
      <Section className="bg-gray-50">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-light font-editorial mb-4">
            Integration Capabilities
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Multiple ways to integrate RecallOS into your existing workflows and applications
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Browser Extension */}
          <div className="bg-white border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 border border-blue-200 flex items-center justify-center">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
              </div>
              <h3 className="text-lg font-light">Browser Extension</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Chrome/Edge extension for automatic monitoring of all web activity with privacy controls.
            </p>
            <div className="space-y-2 text-xs font-mono text-gray-500">
              <div>• Automatic content capture</div>
              <div>• Privacy extension detection</div>
              <div>• Activity-based monitoring</div>
              <div>• Localhost protection</div>
            </div>
          </div>

          {/* SDK */}
          <div className="bg-white border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-green-100 border border-green-200 flex items-center justify-center">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
              </div>
              <h3 className="text-lg font-light">TypeScript SDK</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              TypeScript/JavaScript client for custom integrations and application development.
            </p>
            <div className="space-y-2 text-xs font-mono text-gray-500">
              <div>• Memory CRUD operations</div>
              <div>• Search functionality</div>
              <div>• Mesh generation</div>
              <div>• Blockchain verification</div>
            </div>
          </div>

          {/* MCP Server */}
          <div className="bg-white border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-purple-100 border border-purple-200 flex items-center justify-center">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
              </div>
              <h3 className="text-lg font-light">MCP Server</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Model Context Protocol server for seamless AI agent integration and memory access.
            </p>
            <div className="space-y-2 text-xs font-mono text-gray-500">
              <div>• AI agent integration</div>
              <div>• Context-aware retrieval</div>
              <div>• Memory management tools</div>
              <div>• Protocol compliance</div>
            </div>
          </div>

          {/* REST API */}
          <div className="bg-white border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-orange-100 border border-orange-200 flex items-center justify-center">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
              </div>
              <h3 className="text-lg font-light">REST API</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Direct API access for custom applications and third-party integrations.
            </p>
            <div className="space-y-2 text-xs font-mono text-gray-500">
              <div>• Memory processing</div>
              <div>• Search endpoints</div>
              <div>• Mesh generation</div>
              <div>• Blockchain operations</div>
            </div>
          </div>

          {/* Smart Contract */}
          <div className="bg-white border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-red-100 border border-red-200 flex items-center justify-center">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
              </div>
              <h3 className="text-lg font-light">Smart Contract</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              On-chain verification and retrieval with upgradeable proxy pattern for future enhancements.
            </p>
            <div className="space-y-2 text-xs font-mono text-gray-500">
              <div>• Memory hash storage</div>
              <div>• Batch operations</div>
              <div>• Upgradeable design</div>
              <div>• Gas optimization</div>
            </div>
          </div>

          {/* Web Interface */}
          <div className="bg-white border border-gray-200 p-6 hover:border-black transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                <div className="w-4 h-4 bg-indigo-500 rounded"></div>
              </div>
              <h3 className="text-lg font-light">Web Interface</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              React-based web application for memory visualization, search, and management.
            </p>
            <div className="space-y-2 text-xs font-mono text-gray-500">
              <div>• Memory mesh visualization</div>
              <div>• Advanced search interface</div>
              <div>• Transaction tracking</div>
              <div>• Wallet integration</div>
            </div>
          </div>
        </div>
      </Section>

      {/* Privacy & Security Section */}
      <Section className="bg-white">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-light font-editorial mb-4">
            Privacy & Security
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Built with privacy-first principles and transparent security practices
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Privacy Features */}
          <div className="bg-gray-50 border border-gray-200 p-6">
            <h3 className="text-lg font-light mb-4 flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Privacy Protection</span>
            </h3>
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-2">Local-First Approach</div>
                <div className="text-sm text-gray-700">
                  Automatically detects and skips localhost, development environments, and private networks to protect sensitive local data.
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-2">Privacy Extension Compatibility</div>
                <div className="text-sm text-gray-700">
                  Detects and works around ad blockers, privacy extensions, and content security policies without compromising functionality.
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-2">User-Controlled Data</div>
                <div className="text-sm text-gray-700">
                  All memories are tied to user-controlled wallet addresses with no third-party data sharing or external analytics.
                </div>
              </div>
            </div>
          </div>

          {/* Security Features */}
          <div className="bg-gray-50 border border-gray-200 p-6">
            <h3 className="text-lg font-light mb-4 flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Security & Transparency</span>
            </h3>
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-2">Blockchain Transparency</div>
                <div className="text-sm text-gray-700">
                  All memory hashes are publicly verifiable on Sepolia testnet with full transaction history and gas usage tracking.
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-2">Content Integrity</div>
                <div className="text-sm text-gray-700">
                  SHA256 hashing ensures content integrity and prevents tampering with stored memories and their metadata.
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-2">Open Source</div>
                <div className="text-sm text-gray-700">
                  Complete codebase is open source with transparent development practices and community-driven security audits.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Policy Summary */}
        <div className="mt-8 bg-gray-50 border border-gray-200 p-6">
          <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-4">[PRIVACY SUMMARY]</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="font-mono text-gray-800 mb-2">DATA COLLECTION</div>
              <div className="text-gray-600">Only public web content you visit, with localhost and private networks automatically excluded.</div>
            </div>
            <div>
              <div className="font-mono text-gray-800 mb-2">DATA STORAGE</div>
              <div className="text-gray-600">Your memories are stored in your personal database with wallet-based access control.</div>
            </div>
            <div>
              <div className="font-mono text-gray-800 mb-2">DATA SHARING</div>
              <div className="text-gray-600">No data is shared with third parties. Only you control access to your memory network.</div>
            </div>
          </div>
        </div>
      </Section>

      {/* Technical Specifications Section */}
      <Section className="bg-gray-50">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-light font-editorial mb-4">
            Technical Specifications
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Key technical details and system requirements for RecallOS
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* AI & Processing */}
          <div className="bg-white border border-gray-200 p-6">
            <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-4">[AI & PROCESSING]</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">AI Providers</span>
                <span className="font-mono text-gray-800">Gemini + Ollama</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Default Mode</span>
                <span className="font-mono text-gray-800">Hybrid</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Embedding Model</span>
                <span className="font-mono text-gray-800">text-embedding-004</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vector Dimensions</span>
                <span className="font-mono text-gray-800">768</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fallback Mode</span>
                <span className="font-mono text-gray-800">Deterministic</span>
              </div>
            </div>
          </div>

          {/* Database & Storage */}
          <div className="bg-white border border-gray-200 p-6">
            <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-4">[DATABASE & STORAGE]</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Database</span>
                <span className="font-mono text-gray-800">PostgreSQL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vector Extension</span>
                <span className="font-mono text-gray-800">pgvector</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ORM</span>
                <span className="font-mono text-gray-800">Prisma</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Indexing</span>
                <span className="font-mono text-gray-800">HNSW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Backup</span>
                <span className="font-mono text-gray-800">Automated</span>
              </div>
            </div>
          </div>

          {/* Blockchain & Verification */}
          <div className="bg-white border border-gray-200 p-6">
            <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-4">[BLOCKCHAIN & VERIFICATION]</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Network</span>
                <span className="font-mono text-gray-800">Sepolia Testnet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Contract Pattern</span>
                <span className="font-mono text-gray-800">Upgradeable Proxy</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Hashing</span>
                <span className="font-mono text-gray-800">SHA256 + Keccak256</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Storage Mode</span>
                <span className="font-mono text-gray-800">Batch</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Explorer</span>
                <span className="font-mono text-gray-800">Blockscout</span>
              </div>
            </div>
          </div>

          {/* Search & Retrieval */}
          <div className="bg-white border border-gray-200 p-6">
            <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-4">[SEARCH & RETRIEVAL]</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Search Type</span>
                <span className="font-mono text-gray-800">Hybrid</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Keyword Weight</span>
                <span className="font-mono text-gray-800">0.4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Semantic Weight</span>
                <span className="font-mono text-gray-800">0.6</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Top K Results</span>
                <span className="font-mono text-gray-800">Configurable</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Answer Generation</span>
                <span className="font-mono text-gray-800">LLM + Citations</span>
              </div>
            </div>
          </div>

          {/* Relations & Mesh */}
          <div className="bg-white border border-gray-200 p-6">
            <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-4">[RELATIONS & MESH]</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Semantic Threshold</span>
                <span className="font-mono text-gray-800">≥0.3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Topical Threshold</span>
                <span className="font-mono text-gray-800">≥0.25</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Temporal Threshold</span>
                <span className="font-mono text-gray-800">≥0.2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pruning Method</span>
                <span className="font-mono text-gray-800">Mutual kNN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Layout Algorithm</span>
                <span className="font-mono text-gray-800">Force-directed</span>
              </div>
            </div>
          </div>

          {/* Performance & Limits */}
          <div className="bg-white border border-gray-200 p-6">
            <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-4">[PERFORMANCE & LIMITS]</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Capture Interval</span>
                <span className="font-mono text-gray-800">10s-60s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Content Limit</span>
                <span className="font-mono text-gray-800">50KB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Batch Size</span>
                <span className="font-mono text-gray-800">Configurable</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Retry Attempts</span>
                <span className="font-mono text-gray-800">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Timeout</span>
                <span className="font-mono text-gray-800">30s</span>
              </div>
            </div>
          </div>
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
