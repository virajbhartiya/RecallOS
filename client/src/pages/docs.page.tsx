import React, { useState } from "react"
import { useNavigate } from "react-router-dom"

const TableOfContents: React.FC<{ onSectionClick: (id: string) => void }> = ({
  onSectionClick,
}) => {
  const sections = [
    { id: "what-is", title: "What is RecallOS?" },
    { id: "quick-start", title: "Quick Start" },
    { id: "features", title: "Key Features" },
    { id: "how-to-use", title: "How to Use" },
    { id: "browser-extension", title: "Browser Extension" },
    { id: "web-client", title: "Web Client" },
    { id: "search", title: "Search & AI Answers" },
    { id: "memory-mesh", title: "Memory Mesh" },
    { id: "api-reference", title: "API Reference" },
    { id: "troubleshooting", title: "Troubleshooting" },
    { id: "faq", title: "FAQ" },
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

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code }) => {
  return (
    <div className="bg-gray-900 text-gray-100 p-4 rounded border border-gray-700 overflow-x-auto">
      <code className="font-mono text-sm">{code}</code>
    </div>
  )
}

const InfoBox: React.FC<{
  type: "info" | "warning" | "tip"
  children: React.ReactNode
}> = ({ type, children }) => {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-900",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-900",
    tip: "bg-green-50 border-green-200 text-green-900",
  }

  const icons = {
    info: "ℹ️",
    warning: "⚠️",
    tip: "💡",
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
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const faqs = [
    {
      question: "Is my data private?",
      answer:
        "Yes! Your memories are stored in your private account and only you can access them. We don't track your browsing or share your data with third parties.",
    },
    {
      question: "How much does it cost?",
      answer: "RecallOS is free to use.",
    },

    {
      question: "Can I export my memories?",
      answer:
        "Yes! You can export your memories as JSON data at any time. You can also use our SDK to programmatically access all your memories.",
    },
    {
      question: "Does the extension slow down my browser?",
      answer:
        "No. The extension is designed to be lightweight and only captures content when you switch tabs or load new pages. It doesn't monitor your activity in real-time.",
    },

    {
      question: "Can I delete memories?",
      answer: "Yes. You can delete memories from the database at any time.",
    },
    {
      question: "What AI models do you use?",
      answer:
        "We use Google Gemini for embeddings and summarization by default. The system includes fallback mechanisms and supports local AI processing for complete privacy.",
    },
    {
      question: "How does the ChatGPT integration work?",
      answer:
        "The browser extension automatically detects when you're typing in ChatGPT, searches your memories for relevant context, and injects memory summaries into your prompts with a 1.5-second delay.",
    },
    {
      question: "What is the Memory Mesh?",
      answer:
        "The Memory Mesh is a 3D knowledge graph that shows connections between your memories. It uses vector embeddings to find semantic relationships and helps you discover unexpected learning patterns.",
    },
    {
      question: "How does hybrid search work?",
      answer:
        "Hybrid search combines keyword matching (40% weight) with semantic search using vector embeddings (60% weight) to provide comprehensive results with relevance scoring.",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
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
                  RecallOS is a decentralized personal memory system that
                  captures, organizes, and retrieves your digital context. Think
                  of it as your personal search engine for everything you've
                  read and learned on the web.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Unlike traditional bookmarks or note-taking apps, RecallOS:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>
                    <strong>Automatically captures</strong> what you read with
                    our browser extension
                  </li>
                  <li>
                    <strong>AI-summarizes</strong> content using Google Gemini
                    for quick recall
                  </li>
                  <li>
                    <strong>Builds connections</strong> between related memories
                    using semantic analysis and memory mesh
                  </li>
                  <li>
                    <strong>Searches semantically</strong> using vector
                    embeddings and hybrid search
                  </li>
                  <li>
                    <strong>Integrates with ChatGPT</strong> to automatically
                    inject relevant memories into conversations
                  </li>
                </ul>
              </div>
            </section>

            <section id="quick-start">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                Quick Start
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">
                    1. Create Your User ID
                  </h3>
                  <p className="text-gray-700 mb-3">
                    RecallOS uses a simple user ID to associate your memories
                    across the extension and web client.
                  </p>
                  <InfoBox type="tip">
                    The user ID is your unique identifier for accessing your
                    memories. It's automatically generated when you first
                    install the extension.
                  </InfoBox>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">
                    2. Install Browser Extension
                  </h3>
                  <p className="text-gray-700 mb-3">
                    For automatic capture, install our Chrome/Brave extension.
                    Or manually add memories through the web interface.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">
                    3. Start Capturing
                  </h3>
                  <p className="text-gray-700">
                    Browse the web normally. RecallOS captures pages
                    automatically (with extension) or you can manually add
                    content through the web client.
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
                  <h3 className="font-medium mb-2">AI Summarization</h3>
                  <p className="text-sm text-gray-600">
                    Every memory gets an AI-generated summary using Google
                    Gemini, highlighting key points and actionable insights.
                  </p>
                </div>
                <div className="bg-white border border-gray-200 p-4">
                  <h3 className="font-medium mb-2">Hybrid Search</h3>
                  <p className="text-sm text-gray-600">
                    Combines keyword and semantic search for comprehensive
                    results with relevance scoring.
                  </p>
                </div>
                <div className="bg-white border border-gray-200 p-4">
                  <h3 className="font-medium mb-2">Memory Mesh</h3>
                  <p className="text-sm text-gray-600">
                    Automatically discovers connections between memories using
                    vector embeddings and similarity analysis.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 p-4">
                  <h3 className="font-medium mb-2">ChatGPT Integration</h3>
                  <p className="text-sm text-gray-600">
                    Automatically injects relevant memories into ChatGPT
                    conversations as you type.
                  </p>
                </div>
              </div>
            </section>

            <section id="how-to-use">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                How to Use
              </h2>
              <p className="text-gray-700 mb-4">
                RecallOS can be used in three ways: Browser Extension
                (automatic), Web Client (manual), or SDK (programmatic).
              </p>
            </section>

            <section id="browser-extension">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                Browser Extension
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700">
                  The browser extension automatically captures web pages as you
                  browse and integrates with ChatGPT for enhanced conversations.
                </p>

                <h3 className="text-lg font-medium">Installation</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>
                    Build the extension from source or install from Chrome Web
                    Store
                  </li>
                  <li>
                    Configure API endpoint (default:
                    http://localhost:3000/api/memory/process)
                  </li>

                  <li>Start browsing and using ChatGPT!</li>
                </ol>

                <h3 className="text-lg font-medium mt-6">How It Works</h3>
                <p className="text-gray-700">
                  The extension captures pages when you:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Switch to a new tab or load a new page</li>
                  <li>Spend time on a page (activity-based capture)</li>
                  <li>Navigate between different URLs</li>
                </ul>

                <h3 className="text-lg font-medium mt-6">
                  ChatGPT Integration
                </h3>
                <p className="text-gray-700">
                  When using ChatGPT, the extension:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Automatically detects when you're typing in ChatGPT</li>
                  <li>Searches your memories for relevant context</li>
                  <li>Injects memory summaries into your prompts</li>
                  <li>Shows a RecallOS icon with status indicators</li>
                </ul>

                <InfoBox type="warning">
                  The extension respects privacy extensions like uBlock Origin
                  and adapts accordingly. It also skips localhost domains.
                </InfoBox>

                <h3 className="text-lg font-medium mt-6">Configuration</h3>
                <CodeBlock
                  code={`API Endpoint: http://localhost:3000/api/memory/processRawContent
User ID: your-user-id
ChatGPT Integration: Automatic (1.5s delay)`}
                />
              </div>
            </section>

            <section id="web-client">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                Web Client
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Use the web interface to manually add memories, view your
                  collection, and search.
                </p>

                <h3 className="text-lg font-medium">Main Pages</h3>
                <div className="space-y-3">
                  <div className="bg-white border border-gray-200 p-3">
                    <h4 className="font-medium text-sm">Landing</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Welcome page with system overview.
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 p-3">
                    <h4 className="font-medium text-sm">Memories</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Browse memories with filters and explore the memory mesh.
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 p-3">
                    <h4 className="font-medium text-sm">Search</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Hybrid search with AI-generated answers, citations, and
                      relevance scoring.
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 p-3"></div>
                </div>
              </div>
            </section>

            <section id="search">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                Search & AI Answers
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700">
                  RecallOS uses hybrid search combining keyword and semantic
                  search powered by vector embeddings to find relevant memories.
                </p>

                <h3 className="text-lg font-medium">How Search Works</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>
                    Your query is processed through both keyword and semantic
                    search
                  </li>
                  <li>
                    Keyword search matches text in titles, summaries, and
                    content
                  </li>
                  <li>
                    Semantic search uses vector embeddings with cosine
                    similarity
                  </li>
                  <li>
                    Results are blended with weighted scores (40% keyword, 60%
                    semantic)
                  </li>
                  <li>
                    AI generates answers with citations and relevance scores
                  </li>
                </ol>

                <h3 className="text-lg font-medium mt-6">Search Types</h3>
                <div className="space-y-2">
                  <div className="bg-blue-50 border border-blue-200 p-3">
                    <h4 className="font-medium text-sm text-blue-900">
                      Keyword Search
                    </h4>
                    <p className="text-xs text-blue-800 mt-1">
                      Matches exact terms in memory content with relevance
                      scoring
                    </p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 p-3">
                    <h4 className="font-medium text-sm text-purple-900">
                      Semantic Search
                    </h4>
                    <p className="text-xs text-purple-800 mt-1">
                      Uses vector embeddings to find conceptually similar
                      content
                    </p>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 p-3">
                    <h4 className="font-medium text-sm text-indigo-900">
                      Hybrid Search
                    </h4>
                    <p className="text-xs text-indigo-800 mt-1">
                      Combines both approaches for comprehensive results
                    </p>
                  </div>
                </div>

                <h3 className="text-lg font-medium mt-6">Example Queries</h3>
                <div className="space-y-2">
                  <CodeBlock
                    code={`"React hooks best practices"\n"semantic search"\n"what did I learn about GraphQL?"`}
                  />
                </div>

                <InfoBox type="tip">
                  Use natural language! Ask questions like you would ask a
                  person. The system works best with specific, descriptive
                  queries.
                </InfoBox>

                <h3 className="text-lg font-medium mt-6">AI Answer Format</h3>
                <div className="bg-white border border-gray-200 p-4"></div>
              </div>
            </section>

            <section id="memory-mesh">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                Memory Mesh
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700">
                  The Memory Mesh is a knowledge graph that automatically
                  discovers connections between your memories using vector
                  embeddings and similarity analysis.
                </p>

                <h3 className="text-lg font-medium">Connection Types</h3>
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 p-3">
                    <h4 className="font-medium text-sm text-blue-900">
                      Semantic Relations
                    </h4>
                    <p className="text-xs text-blue-800 mt-1">
                      Memories with similar content using vector embeddings
                      (configurable threshold)
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 p-3">
                    <h4 className="font-medium text-sm text-green-900">
                      Topical Relations
                    </h4>
                    <p className="text-xs text-green-800 mt-1">
                      Memories sharing topics, categories, or extracted metadata
                    </p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 p-3">
                    <h4 className="font-medium text-sm text-purple-900">
                      Temporal Relations
                    </h4>
                    <p className="text-xs text-purple-800 mt-1">
                      Memories captured close together in time with similar
                      content
                    </p>
                  </div>
                </div>

                <h3 className="text-lg font-medium mt-6">3D Visualization</h3>
                <p className="text-gray-700">
                  The Memories page includes an interactive 3D graph powered by
                  Three.js. Nodes represent memories and edges show connection
                  strength. You can:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Navigate the 3D space with mouse controls</li>
                  <li>Click nodes to view memory details</li>
                  <li>Filter by connection strength and memory type</li>
                  <li>Explore memory clusters and relationships</li>
                </ul>

                <h3 className="text-lg font-medium mt-6">Mesh Processing</h3>
                <p className="text-gray-700">
                  The mesh is built asynchronously as new memories are added.
                  Each memory is processed to:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Generate vector embeddings for semantic similarity</li>
                  <li>Extract topics, categories, and metadata</li>
                  <li>Find connections with existing memories</li>
                  <li>Update the knowledge graph structure</li>
                </ul>

                <InfoBox type="info">
                  The mesh helps you discover unexpected connections and
                  learning patterns. It requires at least 5-10 memories to form
                  meaningful connections.
                </InfoBox>
              </div>
            </section>

            <section id="api-reference">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                API Reference
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700">
                  RecallOS provides a comprehensive REST API for programmatic
                  access to your memories and system functionality.
                </p>

                <h3 className="text-lg font-medium">Core Endpoints</h3>
                <div className="space-y-3">
                  <div className="bg-white border border-gray-200 p-3">
                    <h4 className="font-medium text-sm">Memory Management</h4>
                    <div className="text-xs text-gray-600 mt-1 space-y-1">
                      <p>
                        <code>POST /api/memory/processRawContent</code> -
                        Process new content
                      </p>
                      <p>
                        <code>GET /api/memory/recent/:userAddress</code> - Get
                        recent memories
                      </p>
                      <p>
                        <code>GET /api/memory/insights/:userAddress</code> - Get
                        memory analytics
                      </p>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 p-3">
                    <h4 className="font-medium text-sm">Search & AI</h4>
                    <div className="text-xs text-gray-600 mt-1 space-y-1">
                      <p>
                        <code>POST /api/search</code> - Semantic search with AI
                        answers
                      </p>
                      <p>
                        <code>GET /api/search/job/:id</code> - Check search job
                        status
                      </p>
                      <p>
                        <code>POST /api/search/context</code> - Get context for
                        queries
                      </p>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 p-3"></div>
                </div>

                <h3 className="text-lg font-medium mt-6">Authentication</h3>
                <p className="text-gray-700">
                  The API uses userId. Include your userId in requests:
                </p>
                <CodeBlock
                  code={`{
  "userId": "your-user-id",
  "content": "Your content here",
  "url": "https://example.com"
}`}
                />

                <h3 className="text-lg font-medium mt-6">Response Format</h3>
                <p className="text-gray-700">
                  All API responses follow a consistent format:
                </p>
                <CodeBlock
                  code={`{
  "success": true,
  "data": {
    "memoryId": "uuid"
  },
  "message": "Memory processed successfully"
}`}
                />

                <InfoBox type="info">
                  The API supports both synchronous and asynchronous operations.
                  Long-running tasks like AI processing may return job IDs for
                  status checking.
                </InfoBox>
              </div>
            </section>

            <section id="troubleshooting">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                Troubleshooting
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">
                    Extension not capturing pages
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    <li>Check extension is enabled in Chrome</li>
                    <li>
                      Verify API endpoint is correct in extension settings
                    </li>

                    <li>Check browser console for errors (F12)</li>
                    <li>Content must be &gt; 50 characters</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">
                    Search returns no results
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    <li>
                      Verify you have memories stored (check Memories page)
                    </li>

                    <li>
                      Wait for embeddings to be generated (5-30 seconds after
                      capture)
                    </li>
                    <li>Try a different search query or more general terms</li>
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
                      onClick={() =>
                        setExpandedFaq(expandedFaq === index ? null : index)
                      }
                      className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-sm">
                        {faq.question}
                      </span>
                      <span className="text-gray-500 text-sm">
                        {expandedFaq === index ? "−" : "+"}
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
                    onClick={() => navigate("/")}
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
