import React from 'react'
import { Section } from './Section'
import { InfoCard } from './InfoCard'

const specs = [
  {
    title: 'AI & Processing',
    items: [
      { key: 'Primary Provider', value: 'Gemini (default)' },
      { key: 'Secondary Provider', value: 'Ollama (local)' },
      { key: 'Processing Mode', value: 'Hybrid (fallback)' },
      { key: 'Embedding Model', value: 'text-embedding-004' },
      { key: 'Vector Dimensions', value: '768' }
    ]
  },
  {
    title: 'Database & Storage',
    items: [
      { key: 'Database', value: 'PostgreSQL' },
      { key: 'Vector Extension', value: 'pgvector' },
      { key: 'Index Type', value: 'HNSW' },
      { key: 'Similarity Metric', value: 'Cosine' },
      { key: 'Storage Format', value: 'JSON + Binary' }
    ]
  },
  {
    title: 'Blockchain & Verification',
    items: [
      { key: 'Network', value: 'Sepolia Testnet' },
      { key: 'Hash Algorithm', value: 'SHA256' },
      { key: 'Contract Pattern', value: 'Upgradeable Proxy' },
      { key: 'Batch Size', value: '10 memories' },
      { key: 'Gas Optimization', value: 'Batch operations' }
    ]
  },
  {
    title: 'Search & Retrieval',
    items: [
      { key: 'Search Type', value: 'Hybrid' },
      { key: 'Keyword Weight', value: '0.4' },
      { key: 'Semantic Weight', value: '0.6' },
      { key: 'Similarity Threshold', value: '≥0.3' },
      { key: 'Max Results', value: '50' }
    ]
  },
  {
    title: 'Relations & Mesh',
    items: [
      { key: 'Relation Types', value: '3 (S/T/T)' },
      { key: 'Pruning Method', value: 'Mutual kNN' },
      { key: 'Layout Algorithm', value: 'Force-directed' },
      { key: 'Clustering', value: 'Source-based' },
      { key: 'Max Relations', value: '100 per memory' }
    ]
  },
  {
    title: 'Performance & Limits',
    items: [
      { key: 'Processing Time', value: '<2s per page' },
      { key: 'Memory Limit', value: '10MB per page' },
      { key: 'Daily Limit', value: '1000 pages' },
      { key: 'Search Latency', value: '<500ms' },
      { key: 'Uptime Target', value: '99.9%' }
    ]
  }
]

export const TechnicalSpecs: React.FC = () => {
  return (
    <Section className="bg-gray-50">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-light font-editorial mb-4">
          Technical Specifications
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Detailed technical specifications and performance metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {specs.map((spec) => (
          <InfoCard key={spec.title} className="p-6">
            <h3 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-4">
              {spec.title}
            </h3>
            <div className="space-y-3">
              {spec.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{item.key}</span>
                  <span className="text-sm font-mono text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>
          </InfoCard>
        ))}
      </div>
    </Section>
  )
}
