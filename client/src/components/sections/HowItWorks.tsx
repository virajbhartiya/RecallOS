import React from 'react'
import { Section } from './Section'
import { InfoCardWithIcon } from './InfoCard'

const steps = [
  {
    number: 1,
    color: 'blue',
    title: 'Browser Monitoring',
    description: 'Extension automatically captures page content, metadata, and user interactions as you browse.',
    features: ['Content extraction', 'Metadata parsing', 'Activity tracking']
  },
  {
    number: 2,
    color: 'green',
    title: 'AI Processing',
    description: 'Gemini or Ollama generates summaries, embeddings, and extracts structured metadata from captured content.',
    features: ['Content summarization', 'Embedding generation', 'Metadata extraction']
  },
  {
    number: 3,
    color: 'purple',
    title: 'Memory Mesh',
    description: 'Creates semantic, topical, and temporal relationships between memories to build a navigable knowledge graph.',
    features: ['Semantic relations', 'Topical clustering', 'Temporal connections']
  },
  {
    number: 4,
    color: 'orange',
    title: 'Blockchain Anchoring',
    description: 'Content hashes are stored on Sepolia testnet for verifiable proof of memory existence and timestamp.',
    features: ['SHA256 hashing', 'Sepolia anchoring', 'Transaction tracking']
  },
  {
    number: 5,
    color: 'red',
    title: 'Search & Retrieval',
    description: 'pgvector similarity search with hybrid keyword + semantic matching and LLM-generated contextual answers.',
    features: ['Vector similarity', 'Hybrid search', 'LLM answers']
  },
  {
    number: 6,
    color: 'indigo',
    title: 'ChatGPT Integration',
    description: 'Automatically injects relevant memories into ChatGPT conversations with 1.5s typing delay for context-aware responses.',
    features: ['Auto-injection', 'Context-aware', 'Citation support']
  }
]

const getColorClasses = (color: string) => {
  const colorMap = {
    blue: {
      bg: 'bg-blue-100',
      border: 'border-blue-200',
      text: 'text-blue-800',
      dot: 'bg-blue-500'
    },
    green: {
      bg: 'bg-green-100',
      border: 'border-green-200',
      text: 'text-green-800',
      dot: 'bg-green-500'
    },
    purple: {
      bg: 'bg-purple-100',
      border: 'border-purple-200',
      text: 'text-purple-800',
      dot: 'bg-purple-500'
    },
    orange: {
      bg: 'bg-orange-100',
      border: 'border-orange-200',
      text: 'text-orange-800',
      dot: 'bg-orange-500'
    },
    red: {
      bg: 'bg-red-100',
      border: 'border-red-200',
      text: 'text-red-800',
      dot: 'bg-red-500'
    },
    indigo: {
      bg: 'bg-indigo-100',
      border: 'border-indigo-200',
      text: 'text-indigo-800',
      dot: 'bg-indigo-500'
    }
  }
  return colorMap[color as keyof typeof colorMap] || colorMap.blue
}

export const HowItWorks: React.FC = () => {
  return (
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
        {steps.map((step) => {
          const colors = getColorClasses(step.color)
          const icon = (
            <div className={`w-8 h-8 ${colors.bg} border ${colors.border} flex items-center justify-center text-sm font-mono font-bold ${colors.text}`}>
              {step.number}
            </div>
          )
          
          const featuresWithDots = step.features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className={`w-1.5 h-1.5 ${colors.dot} rounded-full`}></div>
              <span>{feature}</span>
            </div>
          ))

          return (
            <InfoCardWithIcon
              key={step.number}
              icon={icon}
              title={step.title}
              description={step.description}
              features={featuresWithDots}
            />
          )
        })}
      </div>
    </Section>
  )
}
