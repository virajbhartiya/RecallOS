import React, { useState } from "react"
import { useNavigate } from "react-router-dom"

import { PageHeader } from "@/components/PageHeader"

const TableOfContents: React.FC<{ onSectionClick: (id: string) => void }> = ({
  onSectionClick,
}) => {
  const sections = [
    { id: "what-is", title: "What is Cognia?" },
    { id: "quick-start", title: "Quick Start" },
    { id: "features", title: "Key Features" },
    { id: "how-to-use", title: "How to Use" },
    { id: "browser-extension", title: "Browser Extension" },
    { id: "web-client", title: "Web Client" },
    { id: "search", title: "Search & AI Answers" },
    { id: "memory-mesh", title: "Memory Mesh" },
    { id: "backend-architecture", title: "Backend Architecture" },
    { id: "api-reference", title: "API Reference" },
    { id: "troubleshooting", title: "Troubleshooting" },
    { id: "faq", title: "FAQ" },
  ]

  return (
    <div className="sticky top-20 bg-white border border-gray-200 p-4 max-h-[calc(100vh-5rem)] overflow-y-auto">
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
      answer: "Cognia is free to use.",
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
      <PageHeader pageName="Documentation" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <TableOfContents onSectionClick={scrollToSection} />
          </aside>

          <main className="lg:col-span-3 space-y-12">
            <section id="what-is">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                What is Cognia?
              </h2>
              <div className="prose prose-gray max-w-none space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Cognia is a personal memory system that captures, organizes,
                  and retrieves your digital context. Think of it as your
                  personal search engine for everything you've read and learned
                  on the web.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Unlike traditional bookmarks or note-taking apps, Cognia:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>
                    <strong>Automatically captures</strong> what you read with
                    our browser extension
                  </li>
                  <li>
                    <strong>AI-summarizes</strong> content using Google Gemini
                    for quick access
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
                    Cognia uses a simple user ID to associate your memories
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
                    Browse the web normally. Cognia captures pages automatically
                    (with extension) or you can manually add content through the
                    web client.
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
                  <h3 className="font-medium mb-2">Semantic Embeddings</h3>
                  <p className="text-sm text-gray-600">
                    Each memory is stored with high-quality embeddings so it can be searched and linked without extra summaries or AI metadata.
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
                Cognia can be used in three ways: Browser Extension (automatic),
                Web Client (manual), or SDK (programmatic).
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
                  <li>Shows a Cognia icon with status indicators</li>
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
                  Cognia uses hybrid search combining keyword and semantic
                  search powered by vector embeddings to find relevant memories.
                </p>

                <h3 className="text-lg font-medium">How Search Works</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>
                    Query analysis determines search strategy (narrow, balanced,
                    or broad) based on specificity, temporal indicators, and
                    memory count
                  </li>
                  <li>
                    Query is converted to vector embedding using Google Gemini
                    or Ollama
                  </li>
                  <li>
                    Semantic search queries Qdrant vector database with dynamic
                    thresholds based on query analysis
                  </li>
                  <li>
                    Keyword search matches tokens in titles (0.5 weight) and
                    normalized content (0.5 weight) using Prisma
                  </li>
                  <li>
                    Results are scored and blended: 60% semantic score + 40%
                    keyword score, with coverage ratio boost
                  </li>
                  <li>
                    Dynamic filtering applies thresholds based on query type
                    (semantic ≥0.15, keyword ≥0.3, coverage ≥0.5)
                  </li>
                  <li>
                    AI generates contextual answers using Google Gemini with
                    profile context and memory previews, extracting citations
                    from [n] references
                  </li>
                  <li>
                    Results are cached in Redis for 5 minutes to improve
                    performance
                  </li>
                </ol>

                <h3 className="text-lg font-medium mt-6">Search Types</h3>
                <div className="space-y-2">
                  <div className="bg-blue-50 border border-blue-200 p-3">
                    <h4 className="font-medium text-sm text-blue-900">
                      Keyword Search
                    </h4>
                    <p className="text-xs text-blue-800 mt-1">
                      Tokenizes query, matches against title/content with
                      weighted scoring. Filters by category, topic, sentiment,
                      date range. Calculates coverage ratio for query tokens.
                    </p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 p-3">
                    <h4 className="font-medium text-sm text-purple-900">
                      Semantic Search
                    </h4>
                    <p className="text-xs text-purple-800 mt-1">
                      Generates query embedding, searches Qdrant vector database
                      with cosine similarity. Uses dynamic limits (50-1000)
                      based on query analysis. Filters by user_id and optional
                      pre-filtered memory IDs.
                    </p>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 p-3">
                    <h4 className="font-medium text-sm text-indigo-900">
                      Hybrid Search
                    </h4>
                    <p className="text-xs text-indigo-800 mt-1">
                      Runs keyword and semantic search in parallel, merges
                      results by memory ID, calculates blended scores (40%
                      keyword + 60% semantic), sorts by final score, applies
                      pagination.
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
                      Uses Qdrant vector search to find memories with similar
                      content embeddings. Searches for top 12 related memories,
                      filters by similarity ≥0.3, applies domain-specific boosts
                      (e.g., GitHub + Filecoin topics get +0.2 similarity).
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 p-3">
                    <h4 className="font-medium text-sm text-green-900">
                      Topical Relations
                    </h4>
                    <p className="text-xs text-green-800 mt-1">
                      Calculates set overlap for topics (40% weight), categories
                      (30% weight), key points (20% weight), and searchable
                      terms (10% weight). Adds +0.1 boost for same domain URLs.
                      Filters by similarity ≥0.25, returns top 8 matches.
                    </p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 p-3">
                    <h4 className="font-medium text-sm text-purple-900">
                      Temporal Relations
                    </h4>
                    <p className="text-xs text-purple-800 mt-1">
                      Finds memories within time windows (1 hour, 1 day, 1 week,
                      1 month) with exponential decay similarity scoring. Same
                      hour gets 0.9+ similarity, same day 0.7+, same week 0.4+,
                      same month 0.1+. Filters by similarity ≥0.2, returns top
                      5.
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

                <h3 className="text-lg font-medium mt-6">
                  Mesh Processing Pipeline
                </h3>
                <p className="text-gray-700">
                  When a new memory is created, it's processed asynchronously:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>
                    <strong>Embedding Generation:</strong> Creates vector
                    embeddings for content and title using Google Gemini
                    embeddings, stores in Qdrant with metadata (memory_id,
                    user_id, embedding_type, model_name)
                  </li>
                  <li>
                    <strong>Relation Discovery:</strong> Finds semantic (top
                    12), topical (top 8), and temporal (top 5) relations in
                    parallel
                  </li>
                  <li>
                    <strong>AI Evaluation:</strong> For low-confidence relations
                    (0.4-0.5 similarity), uses AI to evaluate relevance with
                    batch processing and 24-hour caching
                  </li>
                  <li>
                    <strong>Relation Storage:</strong> Stores relations in
                    PostgreSQL with similarity scores and relation types,
                    handles race conditions with unique constraints
                  </li>
                  <li>
                    <strong>Cleanup:</strong> Removes relations with similarity
                    &lt;0.3, keeps only top 10 per memory, removes old
                    low-quality relations
                  </li>
                  <li>
                    <strong>3D Layout:</strong> Uses UMAP to project embeddings
                    to 3D coordinates, applies spatial grid for efficient
                    neighbor finding, calculates edge weights from latent space
                    distances
                  </li>
                </ol>

                <h3 className="text-lg font-medium mt-6">
                  Mesh Visualization Algorithm
                </h3>
                <p className="text-gray-700">
                  The 3D mesh uses advanced algorithms for layout:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>
                    <strong>UMAP Projection:</strong> Reduces 768-dimensional
                    embeddings to 3D using UMAP with adaptive epochs (30-100
                    based on dataset size)
                  </li>
                  <li>
                    <strong>Spatial Grid:</strong> Divides 3D space into grid
                    cells for O(1) neighbor lookup, searches 2-cell radius for
                    connections
                  </li>
                  <li>
                    <strong>Edge Calculation:</strong> Uses inverse distance
                    with non-linear scaling (1 - normalized_dist)^1.5, adds
                    boosts for same source/domain/timestamp
                  </li>
                  <li>
                    <strong>Degree Control:</strong> Limits edges per node (max
                    20), ensures minimum degree (2-5) for connectivity, uses
                    mutual KNN pruning
                  </li>
                  <li>
                    <strong>Clustering:</strong> Applies DBSCAN-like clustering
                    (ε=250, min_points=2) to identify memory clusters in latent
                    space
                  </li>
                </ul>

                <InfoBox type="info">
                  The mesh helps you discover unexpected connections and
                  learning patterns. It requires at least 5-10 memories to form
                  meaningful connections. Processing happens asynchronously
                  after memory creation.
                </InfoBox>
              </div>
            </section>

            <section id="backend-architecture">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                Backend Architecture
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Cognia backend is built with Node.js, Express, PostgreSQL,
                  Qdrant, and Redis. Here's how the core processing works:
                </p>

                <h3 className="text-lg font-medium">Memory Processing Flow</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>
                    <strong>Content Reception:</strong> POST /api/memory/process
                    receives content, URL, title, and metadata
                  </li>
                  <li>
                    <strong>Duplicate Detection:</strong> Normalizes text,
                    creates canonical hash (SHA256), checks PostgreSQL for
                    existing memory by canonical_hash
                  </li>
                  <li>
                    <strong>URL Fallback:</strong> If no canonical match, checks
                    recent memories (last hour) by normalized URL with 90%+
                    similarity threshold
                  </li>
                  <li>
                    <strong>AI Processing:</strong> (Disabled) Metadata extraction
                    is skipped to keep ingestion lightweight—only canonicalization
                    and embeddings run.
                  </li>
                  <li>
                    <strong>Database Storage:</strong> Creates memory record in
                    PostgreSQL with content, canonical_hash, and any metadata
                    provided directly by the source.
                  </li>
                  <li>
                    <strong>Async Processing:</strong> Uses setImmediate() to
                    asynchronously create memory snapshot and process mesh
                    relations
                  </li>
                  <li>
                    <strong>Embedding Generation:</strong> Generates vector
                    embeddings for content and title, storing them in Qdrant
                    with payload metadata
                  </li>
                  <li>
                    <strong>Relation Creation:</strong> Finds semantic, topical,
                    and temporal relations, evaluates with AI if needed, stores
                    in memory_relation table
                  </li>
                </ol>

                <h3 className="text-lg font-medium mt-6">Background Workers</h3>
                <p className="text-gray-700">
                  Content processing uses BullMQ workers with Redis for job
                  queuing:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>
                    <strong>Content Worker:</strong> Processes content from
                    queue with retry logic (8 attempts, exponential backoff
                    3s-60s), handles rate limits and API errors
                  </li>
                  <li>
                    <strong>Profile Worker:</strong> Cyclically updates user
                    profiles based on memory patterns and topics
                  </li>
                  <li>
                    <strong>Queue Configuration:</strong> Configurable
                    concurrency, rate limiting, stalled job detection, max retry
                    attempts
                  </li>
                </ul>

                <h3 className="text-lg font-medium mt-6">
                  Search Implementation
                </h3>
                <p className="text-gray-700">
                  Search uses dynamic query analysis and hybrid scoring:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>
                    <strong>Query Analysis:</strong> Analyzes query for type
                    (specific/general/temporal/exploratory), specificity score,
                    temporal indicators, keyword density
                  </li>
                  <li>
                    <strong>Dynamic Parameters:</strong> Adjusts Qdrant limit
                    (50-10000), semantic threshold (0.1-0.2), keyword threshold
                    (0.2-0.4) based on query analysis
                  </li>
                  <li>
                    <strong>Search Strategy:</strong> Narrow (specific queries),
                    Balanced (normal), or Broad (exploratory/old memories)
                  </li>
                  <li>
                    <strong>Parallel Execution:</strong> Runs semantic (Qdrant)
                    and keyword (PostgreSQL) search simultaneously, merges
                    results
                  </li>
                  <li>
                    <strong>Scoring:</strong> Blends 60% semantic + 40% keyword,
                    applies coverage ratio boost, filters by dynamic thresholds
                  </li>
                  <li>
                    <strong>Caching:</strong> Redis cache with 5-minute TTL,
                    keyed by userId + normalized query + limit
                  </li>
                </ul>

                <h3 className="text-lg font-medium mt-6">AI Provider System</h3>
                <p className="text-gray-700">
                  Supports multiple AI backends with fallback mechanisms:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>
                    <strong>Gemini Mode:</strong> Uses Google Gemini for
                    embeddings (text-embedding-004) and content generation
                    (gemini-2.0-flash-exp)
                  </li>
                  <li>
                    <strong>Ollama Mode:</strong> Uses local Ollama for
                    embeddings (all-minilm:l6-v2) and generation (llama3.1:8b)
                  </li>
                  <li>
                    <strong>Hybrid Mode:</strong> Tries multiple embedding
                    methods (fallback, Ollama models) with automatic fallback
                  </li>
                  <li>
                    <strong>Fallback Embeddings:</strong> Generates
                    768-dimensional embeddings using word hashing, semantic
                    clusters, and text analysis if AI unavailable
                  </li>
                  <li>
                    <strong>Token Tracking:</strong> Records token usage per
                    user for embedding generation and search operations
                  </li>
                </ul>

                <h3 className="text-lg font-medium mt-6">Data Storage</h3>
                <div className="space-y-2">
                  <div className="bg-white border border-gray-200 p-3">
                    <h4 className="font-medium text-sm">PostgreSQL</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Stores memories, users, relations, snapshots, query
                      events. Uses Prisma ORM with BigInt for timestamps, JSONB
                      for page_metadata.
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 p-3">
                    <h4 className="font-medium text-sm">Qdrant</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Vector database for embeddings. Stores 768-dimensional
                      vectors with payload (memory_id, user_id, embedding_type).
                      Collection auto-created on startup.
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 p-3">
                    <h4 className="font-medium text-sm">Redis</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Job queue (BullMQ) for background processing, search
                      result caching (5min TTL), relationship evaluation cache
                      (24h TTL).
                    </p>
                  </div>
                </div>

                <InfoBox type="tip">
                  The backend is designed for scalability with async processing,
                  caching, and efficient vector search. All AI operations have
                  fallback mechanisms to ensure reliability.
                </InfoBox>
              </div>
            </section>

            <section id="api-reference">
              <h2 className="text-2xl font-light font-editorial mb-4 border-b border-gray-200 pb-2">
                API Reference
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Cognia provides a comprehensive REST API for programmatic
                  access to your memories and system functionality.
                </p>

                <h3 className="text-lg font-medium">Core Endpoints</h3>
                <div className="space-y-3">
                  <div className="bg-white border border-gray-200 p-3">
                    <h4 className="font-medium text-sm">Memory Management</h4>
                    <div className="text-xs text-gray-600 mt-1 space-y-1">
                      <p>
                        <code>POST /api/memory/process</code> - Process new
                        content (requires auth token)
                      </p>
                      <p>
                        <code>GET /api/memory/user/recent</code> - Get recent
                        memories (query: count)
                      </p>
                      <p>
                        <code>GET /api/memory/user/count</code> - Get memory
                        count
                      </p>
                      <p>
                        <code>GET /api/memory/insights</code> - Get memory
                        analytics (topics, categories, sentiment)
                      </p>
                      <p>
                        <code>DELETE /api/memory/:memoryId</code> - Delete a
                        memory
                      </p>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 p-3">
                    <h4 className="font-medium text-sm">Search & AI</h4>
                    <div className="text-xs text-gray-600 mt-1 space-y-1">
                      <p>
                        <code>GET /api/memory/search</code> - Semantic search
                        with AI answers (query: query, limit)
                      </p>
                      <p>
                        <code>GET /api/memory/search-embeddings</code> -
                        Semantic-only search (query: query, limit, category,
                        topic, sentiment, source, dateRange, page)
                      </p>
                      <p>
                        <code>GET /api/memory/search-hybrid</code> - Hybrid
                        search combining keyword and semantic (query: query,
                        limit, filters, page)
                      </p>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 p-3">
                    <h4 className="font-medium text-sm">Memory Mesh</h4>
                    <div className="text-xs text-gray-600 mt-1 space-y-1">
                      <p>
                        <code>GET /api/memory/mesh</code> - Get memory mesh
                        graph (query: limit, threshold)
                      </p>
                      <p>
                        <code>GET /api/memory/relations/:memoryId</code> - Get
                        memory with relations
                      </p>
                      <p>
                        <code>GET /api/memory/cluster/:memoryId</code> - Get
                        memory cluster (query: depth)
                      </p>
                      <p>
                        <code>POST /api/memory/process-mesh/:memoryId</code> -
                        Process memory for mesh
                      </p>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-medium mt-6">Authentication</h3>
                <p className="text-gray-700">
                  The API uses JWT tokens. Include Authorization header:
                </p>
                <CodeBlock
                  code={`Authorization: Bearer <your-jwt-token>

Request body example:
{
  "content": "Your content here",
  "url": "https://example.com",
  "title": "Page Title",
  "metadata": {
    "source": "extension"
  }
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
    "memoryId": "uuid",
    "userId": "user-id"
  },
  "message": "Memory processed successfully"
}

Error response:
{
  "success": false,
  "error": "Error message"
}`}
                />

                <InfoBox type="info">
                  The API supports both synchronous and asynchronous operations.
                  Long-running tasks like AI processing may return job IDs for
                  status checking. All endpoints require authentication except
                  /health.
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
                    href="https://github.com/cogniahq/Cognia"
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
