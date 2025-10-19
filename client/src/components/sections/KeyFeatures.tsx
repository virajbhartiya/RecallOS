import React from 'react'
import { Section } from './Section'
import { InfoCard } from './InfoCard'

const features = [
  {
    color: 'blue',
    title: 'Browser Monitoring',
    description: 'Intelligent content capture with privacy-aware monitoring and rich metadata extraction.',
    details: [
      {
        title: 'Content Extraction',
        description: 'Captures visible text, meaningful content, page structure, and user interactions with boilerplate filtering.'
      },
      {
        title: 'Privacy Protection',
        description: 'Automatically skips localhost, detects privacy extensions, and respects user activity patterns.'
      },
      {
        title: 'Rich Metadata',
        description: 'Extracts topics, keywords, reading time, content quality, and structured data from every page.'
      }
    ]
  },
  {
    color: 'purple',
    title: 'Memory Graph',
    description: 'Creates a navigable knowledge mesh with multiple relationship types and intelligent clustering.',
    details: [
      {
        title: 'Semantic Relations',
        description: 'Cosine similarity on 768-dim embeddings with ≥0.3 threshold for meaningful connections.'
      },
      {
        title: 'Topical Relations',
        description: 'Weighted overlap of topics, categories, key points, and searchable terms with domain awareness.'
      },
      {
        title: 'Visual Layout',
        description: 'Force-directed layout with source-based clustering and mutual kNN pruning for clean visualization.'
      }
    ]
  },
  {
    color: 'green',
    title: 'LLM Agent Integration',
    description: 'Universal compatibility with any LLM agent, featuring intelligent context injection and citation support.',
    details: [
      {
        title: 'ChatGPT Auto-Injection',
        description: 'Automatically injects relevant memories with 1.5s typing delay and visual status indicators.'
      },
      {
        title: 'Context-Aware Retrieval',
        description: 'Searches memories based on conversation context and provides relevant background information.'
      },
      {
        title: 'Citation Support',
        description: 'Provides numbered citations with memory titles and URLs for verifiable information sources.'
      }
    ]
  },
  {
    color: 'orange',
    title: 'Blockchain Proof',
    description: 'Verifiable memory provenance with on-chain anchoring and transparent transaction tracking.',
    details: [
      {
        title: 'Content Hashing',
        description: 'SHA256 hashing of memory summaries with URL hashing via keccak256 for unique identification.'
      },
      {
        title: 'Sepolia Anchoring',
        description: 'Batch storage on Sepolia testnet with upgradeable proxy pattern for future enhancements.'
      },
      {
        title: 'Transaction Tracking',
        description: 'Full integration with Blockscout for transaction verification and gas usage monitoring.'
      }
    ]
  }
]

const getColorClasses = (color: string) => {
  const colorMap = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500'
  }
  return colorMap[color as keyof typeof colorMap] || 'bg-gray-500'
}

export const KeyFeatures: React.FC = () => {
  return (
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
        {features.map((feature, index) => {
          const dotColor = getColorClasses(feature.color)
          const icon = (
            <div className={`w-3 h-3 ${dotColor} rounded-full animate-pulse`} 
                 style={{animationDelay: `${index * 0.5}s`}}></div>
          )

          return (
            <div key={feature.title} className="bg-gray-50 border border-gray-200 p-6 hover:border-black transition-all duration-300">
              <div className="flex items-center space-x-3 mb-4">
                {icon}
                <h3 className="text-xl font-light">{feature.title}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">{feature.description}</p>
              <div className="space-y-3">
                {feature.details.map((detail, detailIndex) => (
                  <InfoCard key={detailIndex} hover={false} className="p-3">
                    <div className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">
                      {detail.title}
                    </div>
                    <div className="text-sm text-gray-700">
                      {detail.description}
                    </div>
                  </InfoCard>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}
