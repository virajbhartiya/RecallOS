import React, { useState } from 'react'
import { Section } from '../components/sections/Section'
import { useNavigate } from 'react-router-dom'

const TableOfContents: React.FC<{ onSectionClick: (id: string) => void }> = ({ onSectionClick }) => {
  const sections = [
    { id: 'what-is', title: 'What is RecallOS?' },
    { id: 'quick-start', title: 'Quick Start' },
    { id: 'features', title: 'Key Features' },
    { id: 'how-to-use', title: 'How to Use' },
    { id: 'browser-extension', title: 'Browser Extension' },
    { id: 'web-client', title: 'Web Client' },
    { id: 'search', title: 'Search & AI Answers' },
    { id: 'memory-mesh', title: 'Memory Mesh' },
    { id: 'blockchain', title: 'Blockchain Verification' },
    { id: 'gas-deposits', title: 'Gas Deposits' },
    { id: 'troubleshooting', title: 'Troubleshooting' },
    { id: 'faq', title: 'FAQ' },
  ]

  return (
    <div className="sticky top-4 bg-white border border-gray-200 p-4">
      <h3 className="text-sm font-mono uppercase tracking-wide text-gray-900 mb-4">
        Table of Contents
      </h3>
      <nav className="space-y-1">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionClick(section.id)}
            className="block w-full text-left text-sm text-gray-600 hover:text-black hover:bg-gray-50 px-2 py-1 transition-colors"
          >
            {section.title}
          </button>
        ))}
      </nav>
    </div>
  )
}

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language = 'bash' }) => {
  return (
    <div className="bg-gray-900 text-gray-100 p-4 rounded border border-gray-700 overflow-x-auto">
      <code className="font-mono text-sm">{code}</code>
    </div>
  )
}

const InfoBox: React.FC<{ type: 'info' | 'warning' | 'tip'; children: React.ReactNode }> = ({ type, children }) => {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    tip: 'bg-green-50 border-green-200 text-green-900',
  }

  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    tip: '💡',
  }

  return (
    <div className={`border p-4 rounded ${styles[type]}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg">{icons[type]}</span>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  )
}

export const Docs = () => {
  const navigate = useNavigate()
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const faqs = [
    {
      question: 'Is my data private?',
      answer: 'Yes! All your memories are tied to your wallet address and only you can access them. We don\'t track your browsing or share your data with third parties. The blockchain only stores cryptographic hashes, not your actual content.',
    },
    {
      question: 'How much does it cost?',
      answer: 'RecallOS is free to use. You only need to deposit a small amount of ETH (0.01 ETH recommended) to cover blockchain gas fees for storing memory hashes on-chain. This deposit lasts for hundreds or thousands of memories.',
    },
    {
      question: 'What happens if I lose my wallet?',
      answer: 'Your memories are permanently tied to your wallet address. If you lose access to your wallet, you won\'t be able to access your memories. Always backup your wallet recovery phrase securely.',
    },
    {
      question: 'Can I export my memories?',
      answer: 'Yes! You can export your memories as JSON data at any time. You can also use our SDK to programmatically access all your memories.',
    },
    {
      question: 'Does the extension slow down my browser?',
      answer: 'No. The extension is designed to be lightweight and only captures content when you switch tabs or load new pages. It doesn\'t monitor your activity in real-time.',
    },
    {
      question: 'Why blockchain?',
      answer: 'Blockchain provides immutable proof that you captured a specific piece of content at a specific time. This is useful for research, learning verification, and creating an auditable record of your knowledge journey.',
    },
    {
      question: 'Can I delete memories?',
      answer: 'You can delete memories from the database, but the cryptographic hash will remain on the blockchain permanently. This is by design to ensure the integrity of the verification system.',
    },
    {
      question: 'What AI models do you use?',
      answer: 'We use Google Gemini for embeddings and summarization by default. You can also run Ollama locally for complete privacy. We have deterministic fallbacks if both are unavailable.',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="text-sm font-mono text-gray-600 hover:text-black transition-colors"
            >
              ← Back to Home
            </button>
            <h1 className="text-xl font-mono uppercase tracking-wide">
              RecallOS Documentation
            </h1>
            <div className="w-24"></div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <TableOfContents onSectionClick={scrollToSection} />
          </aside>

          <main className="lg:col-span-3 space-y-12">
            <section id="what-is">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                What is RecallOS?
              </h2>
              <div className="prose prose-gray max-w-none space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  RecallOS is a decentralized personal memory system that captures, organizes, and retrieves your digital context. 
                  Think of it as your personal search engine for everything you've read and learned on the web.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Unlike traditional bookmarks or note-taking apps, RecallOS:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li><strong>Automatically captures</strong> what you read with our browser extension</li>
                  <li><strong>AI-summarizes</strong> content so you can quickly recall what matters</li>
                  <li><strong>Builds connections</strong> between related memories using semantic analysis</li>
                  <li><strong>Verifies on blockchain</strong> so you have permanent proof of what you learned</li>
                  <li><strong>Searches semantically</strong> using AI to answer your questions from your memories</li>
                </ul>
              </div>
            </section>

            <section id="quick-start">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                Quick Start
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">1. Connect Your Wallet</h3>
                  <p className="text-gray-700 mb-3">
                    RecallOS uses your Ethereum wallet to identify you. No passwords needed!
                  </p>
                  <InfoBox type="tip">
                    If you don't have a wallet, we recommend <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="underline">MetaMask</a> or <a href="https://rainbow.me" target="_blank" rel="noopener noreferrer" className="underline">Rainbow</a>.
                  </InfoBox>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">2. Deposit Gas (One-time)</h3>
                  <p className="text-gray-700 mb-3">
                    Deposit a small amount of ETH (0.01 ETH recommended) to pay for blockchain transactions. This covers hundreds of memories.
                  </p>
                  <CodeBlock code="// Your memories are stored on-chain, so we need a small gas deposit\n// This is a one-time deposit that lasts a long time" />
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">3. Install Browser Extension (Optional)</h3>
                  <p className="text-gray-700 mb-3">
                    For automatic capture, install our Chrome/Brave extension. Or manually add memories through the web interface.
                  </p>
                  <InfoBox type="info">
                    Extension is optional! You can use RecallOS entirely through the web interface.
                  </InfoBox>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">4. Start Capturing</h3>
                  <p className="text-gray-700">
                    Browse the web normally. RecallOS captures pages automatically (with extension) or you can manually add content through the web client.
                  </p>
                </div>
              </div>
            </section>

            <section id="features">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                Key Features
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 p-4">
                  <h3 className="font-medium mb-2">🧠 AI Summarization</h3>
                  <p className="text-sm text-gray-600">
                    Every memory gets an AI-generated summary highlighting key points and actionable insights.
                  </p>
                </div>
                <div className="bg-white border border-gray-200 p-4">
                  <h3 className="font-medium mb-2">🔍 Semantic Search</h3>
                  <p className="text-sm text-gray-600">
                    Search using natural language. Ask questions and get AI-powered answers with citations.
                  </p>
                </div>
                <div className="bg-white border border-gray-200 p-4">
                  <h3 className="font-medium mb-2">🕸️ Memory Mesh</h3>
                  <p className="text-sm text-gray-600">
                    Automatically discovers connections between memories to build your knowledge graph.
                  </p>
                </div>
                <div className="bg-white border border-gray-200 p-4">
                  <h3 className="font-medium mb-2">⛓️ Blockchain Verified</h3>
                  <p className="text-sm text-gray-600">
                    Every memory hash is stored on Sepolia testnet for permanent, verifiable proof.
                  </p>
                </div>
                <div className="bg-white border border-gray-200 p-4">
                  <h3 className="font-medium mb-2">🤖 ChatGPT Integration</h3>
                  <p className="text-sm text-gray-600">
                    Export context to use with ChatGPT/Claude for better, personalized AI conversations.
                  </p>
                </div>
                <div className="bg-white border border-gray-200 p-4">
                  <h3 className="font-medium mb-2">📊 Analytics</h3>
                  <p className="text-sm text-gray-600">
                    See your learning patterns, top topics, and memory insights over time.
                  </p>
                </div>
              </div>
            </section>

            <section id="how-to-use">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                How to Use
              </h2>
              <p className="text-gray-700 mb-4">
                RecallOS can be used in three ways: Browser Extension (automatic), Web Client (manual), or SDK (programmatic).
              </p>
            </section>

            <section id="browser-extension">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                Browser Extension
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700">
                  The browser extension automatically captures web pages as you browse.
                </p>
                
                <h3 className="text-lg font-medium">Installation</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Download the extension from Chrome Web Store or build from source</li>
                  <li>Click the extension icon and configure API endpoint</li>
                  <li>Enter your wallet address or connect wallet</li>
                  <li>Start browsing!</li>
                </ol>

                <h3 className="text-lg font-medium mt-6">How It Works</h3>
                <p className="text-gray-700">
                  The extension captures pages when you:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Switch to a new tab</li>
                  <li>Load a new page</li>
                  <li>Click the manual capture button</li>
                </ul>

                <InfoBox type="warning">
                  The extension respects privacy extensions like uBlock Origin and adapts accordingly.
                </InfoBox>

                <h3 className="text-lg font-medium mt-6">Configuration</h3>
                <CodeBlock code={`API Endpoint: http://localhost:3000/api/memory/processRawContent
Wallet Address: 0xYourWalletAddress`} />
              </div>
            </section>

            <section id="web-client">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                Web Client
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Use the web interface to manually add memories, view your collection, and search.
                </p>

                <h3 className="text-lg font-medium">Main Pages</h3>
                <div className="space-y-3">
                  <div className="bg-white border border-gray-200 p-3">
                    <h4 className="font-medium text-sm">Home</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Overview of your memories, recent captures, and quick stats.
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 p-3">
                    <h4 className="font-medium text-sm">Memories</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Browse all your memories with filters for source, status, date, category, and topic.
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 p-3">
                    <h4 className="font-medium text-sm">Search</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Semantic search with AI-generated answers and citations from your memories.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section id="search">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                Search & AI Answers
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700">
                  RecallOS uses semantic search powered by vector embeddings to find relevant memories.
                </p>

                <h3 className="text-lg font-medium">How Search Works</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Your query is converted to a 768-dimensional vector embedding</li>
                  <li>RecallOS finds memories with similar embeddings using cosine similarity</li>
                  <li>Results are ranked by relevance (0-1 score)</li>
                  <li>AI generates a short answer with inline citations [1], [2]</li>
                  <li>You can click citations to view source memories</li>
                </ol>

                <h3 className="text-lg font-medium mt-6">Example Queries</h3>
                <div className="space-y-2">
                  <CodeBlock code={`"blockchain smart contracts"\n"how to deploy on Sepolia"\n"React hooks best practices"\n"what did I learn about GraphQL?"`} />
                </div>

                <InfoBox type="tip">
                  Use natural language! Ask questions like you would ask a person.
                </InfoBox>

                <h3 className="text-lg font-medium mt-6">AI Answer Format</h3>
                <div className="bg-white border border-gray-200 p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Question:</strong> "What did I learn about blockchain?"
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Answer:</strong> Based on your memories, you explored Ethereum smart contracts [1], studied Solidity programming [2], and deployed contracts on testnets [3].
                  </p>
                  <div className="mt-3 text-xs text-gray-600">
                    <p><strong>Citations:</strong></p>
                    <p>[1] Ethereum Smart Contracts Guide</p>
                    <p>[2] Solidity Tutorial - Advanced Patterns</p>
                    <p>[3] Deploying to Sepolia Testnet</p>
                  </div>
                </div>
              </div>
            </section>

            <section id="memory-mesh">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                Memory Mesh
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700">
                  The Memory Mesh is a knowledge graph that automatically discovers connections between your memories.
                </p>

                <h3 className="text-lg font-medium">Three Types of Connections</h3>
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 p-3">
                    <h4 className="font-medium text-sm text-blue-900">Semantic Relations</h4>
                    <p className="text-xs text-blue-800 mt-1">
                      Memories with similar content (≥0.3 similarity threshold)
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 p-3">
                    <h4 className="font-medium text-sm text-green-900">Topical Relations</h4>
                    <p className="text-xs text-green-800 mt-1">
                      Memories sharing topics, categories, or key points
                    </p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 p-3">
                    <h4 className="font-medium text-sm text-purple-900">Temporal Relations</h4>
                    <p className="text-xs text-purple-800 mt-1">
                      Memories captured close together in time
                    </p>
                  </div>
                </div>

                <h3 className="text-lg font-medium mt-6">Viewing the Mesh</h3>
                <p className="text-gray-700">
                  Click "View Mesh" on the Memories page to see an interactive 3D graph of your memories. Nodes are colored by source type and edges show connection strength.
                </p>

                <InfoBox type="info">
                  The mesh helps you discover unexpected connections and learning patterns you might have missed.
                </InfoBox>
              </div>
            </section>

            <section id="blockchain">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                Blockchain Verification
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Every memory is anchored on the Sepolia testnet for permanent, verifiable proof.
                </p>

                <h3 className="text-lg font-medium">What's Stored On-Chain?</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li><strong>Memory Hash:</strong> SHA-256 hash of the AI-generated summary</li>
                  <li><strong>URL Hash:</strong> Keccak-256 hash of the original URL</li>
                  <li><strong>Timestamp:</strong> Unix timestamp of capture</li>
                </ul>

                <InfoBox type="warning">
                  Your actual content is NOT stored on-chain, only cryptographic hashes. This preserves privacy while enabling verification.
                </InfoBox>

                <h3 className="text-lg font-medium mt-6">Transaction Details</h3>
                <p className="text-gray-700 mb-2">
                  Every memory shows its blockchain transaction:
                </p>
                <div className="bg-white border border-gray-200 p-3 font-mono text-xs">
                  <p>tx_hash: 0x789abc...</p>
                  <p>block_number: 12345</p>
                  <p>gas_used: 100000</p>
                  <p>status: confirmed</p>
                  <p>network: sepolia</p>
                </div>

                <h3 className="text-lg font-medium mt-6">Why Blockchain?</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Permanent, immutable record of what you learned</li>
                  <li>Verifiable proof of capture timestamp</li>
                  <li>Decentralized - not controlled by any single entity</li>
                  <li>Useful for research, academic citations, legal evidence</li>
                </ul>
              </div>
            </section>

            <section id="gas-deposits">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                Gas Deposits
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700">
                  RecallOS uses a gas deposit system so you don't need to approve every blockchain transaction.
                </p>

                <h3 className="text-lg font-medium">How It Works</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>You deposit ETH to the smart contract (one-time)</li>
                  <li>Our relayer submits transactions on your behalf</li>
                  <li>Gas costs are deducted from your deposit (with 20% buffer)</li>
                  <li>You can withdraw unused balance anytime (1 ETH/day limit)</li>
                </ol>

                <h3 className="text-lg font-medium mt-6">Recommended Deposits</h3>
                <div className="bg-white border border-gray-200 p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2">Usage Level</th>
                        <th className="text-left py-2">Recommended Deposit</th>
                        <th className="text-left py-2">Approximate Memories</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      <tr className="border-b border-gray-100">
                        <td className="py-2">Light (5-10/day)</td>
                        <td className="py-2">0.01 ETH</td>
                        <td className="py-2">~300-500 memories</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2">Medium (20-50/day)</td>
                        <td className="py-2">0.05 ETH</td>
                        <td className="py-2">~1500-2500 memories</td>
                      </tr>
                      <tr>
                        <td className="py-2">Heavy (100+/day)</td>
                        <td className="py-2">0.1 ETH</td>
                        <td className="py-2">~3000-5000 memories</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <InfoBox type="tip">
                  Gas prices on Sepolia testnet are very low. A small deposit goes a long way!
                </InfoBox>

                <h3 className="text-lg font-medium mt-6">Checking Your Balance</h3>
                <p className="text-gray-700">
                  Navigate to the Deposit Manager in the web client to:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>View current balance</li>
                  <li>See estimated gas costs</li>
                  <li>Make additional deposits</li>
                  <li>Withdraw unused balance</li>
                </ul>
              </div>
            </section>

            <section id="troubleshooting">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                Troubleshooting
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Extension not capturing pages</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    <li>Check extension is enabled in Chrome</li>
                    <li>Verify API endpoint is correct in extension settings</li>
                    <li>Ensure wallet address is configured</li>
                    <li>Check browser console for errors (F12)</li>
                    <li>Content must be &gt; 50 characters</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Search returns no results</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    <li>Verify you have memories stored (check Memories page)</li>
                    <li>Ensure wallet address matches your connected wallet</li>
                    <li>Wait for embeddings to be generated (5-30 seconds after capture)</li>
                    <li>Try a different search query or more general terms</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Blockchain transaction failed</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    <li>Check you have sufficient gas deposit balance</li>
                    <li>Verify the relayer is authorized (should be automatic)</li>
                    <li>Check Sepolia network status on Etherscan</li>
                    <li>Use "Retry Failed" button in Memories page</li>
                    <li>Contact support if issue persists</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">AI processing is slow</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    <li>Gemini API may be rate-limited during peak hours</li>
                    <li>Large content takes longer to process</li>
                    <li>Check your internet connection</li>
                    <li>Consider using Ollama locally for faster processing</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Memory mesh visualization is empty</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    <li>You need at least 5-10 memories for connections to form</li>
                    <li>Wait for mesh processing to complete (async, up to 30 seconds)</li>
                    <li>Lower the similarity threshold in mesh settings</li>
                    <li>Check that embeddings were generated successfully</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="faq">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                Frequently Asked Questions
              </h2>
              <div className="space-y-2">
                {faqs.map((faq, index) => (
                  <div key={index} className="border border-gray-200 bg-white">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-sm">{faq.question}</span>
                      <span className="text-gray-500 text-sm">
                        {expandedFaq === index ? '−' : '+'}
                      </span>
                    </button>
                    {expandedFaq === index && (
                      <div className="px-4 pb-3 text-sm text-gray-700 border-t border-gray-100">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="border-t border-gray-200 pt-8 mt-12">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Need More Help?</h3>
                <p className="text-gray-600 mb-4">
                  Check out our GitHub repository or join our community
                </p>
                <div className="flex items-center justify-center gap-4">
                  <a
                    href="https://github.com/virajbhartiya/RecallOS"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-black text-white text-sm hover:bg-gray-800 transition-colors"
                  >
                    GitHub
                  </a>
                  <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 border border-gray-300 text-sm hover:border-black transition-colors"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

