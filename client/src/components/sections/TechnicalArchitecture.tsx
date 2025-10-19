import React from 'react'
import { Section } from './Section'
import { InfoCard } from './InfoCard'

const components = [
  {
    name: 'BROWSER EXTENSION',
    description: 'Captures what you read',
    color: 'blue'
  },
  {
    name: 'AI PROCESSING',
    description: 'Understands content',
    color: 'green'
  },
  {
    name: 'MEMORY STORAGE',
    description: 'Saves everything',
    color: 'purple'
  },
  {
    name: 'BLOCKCHAIN',
    description: 'Permanent records',
    color: 'orange'
  },
  {
    name: 'SEARCH ENGINE',
    description: 'Finds anything',
    color: 'red'
  },
  {
    name: 'AI INTEGRATION',
    description: 'Works with ChatGPT',
    color: 'indigo'
  }
]

const connections = [
  { from: 'Extension', to: 'AI', description: 'Sends content' },
  { from: 'AI', to: 'Storage', description: 'Saves memories' },
  { from: 'Storage', to: 'Blockchain', description: 'Permanent proof' },
  { from: 'Storage', to: 'Search', description: 'Finds memories' },
  { from: 'Search', to: 'AI Integration', description: 'Shares context' }
]

const processingPipeline = [
  { step: 'Capture Content', value: 'From any website' },
  { step: 'AI Understanding', value: 'Smart summaries' },
  { step: 'Find Connections', value: 'Links related ideas' },
  { step: 'Save Permanently', value: 'Blockchain storage' }
]

const searchPipeline = [
  { step: 'Ask Question', value: 'Natural language' },
  { step: 'Find Memories', value: 'Smart search' },
  { step: 'Get Answer', value: 'AI + your memories' },
  { step: 'See Sources', value: 'Clear citations' }
]

const getColorClasses = (color: string) => {
  const colorMap = {
    blue: { bg: 'bg-blue-100', border: 'border-blue-200', dot: 'bg-blue-500' },
    green: { bg: 'bg-green-100', border: 'border-green-200', dot: 'bg-green-500' },
    purple: { bg: 'bg-purple-100', border: 'border-purple-200', dot: 'bg-purple-500' },
    orange: { bg: 'bg-orange-100', border: 'border-orange-200', dot: 'bg-orange-500' },
    red: { bg: 'bg-red-100', border: 'border-red-200', dot: 'bg-red-500' },
    indigo: { bg: 'bg-indigo-100', border: 'border-indigo-200', dot: 'bg-indigo-500' }
  }
  return colorMap[color as keyof typeof colorMap] || colorMap.blue
}

export const TechnicalArchitecture: React.FC = () => {
  return (
    <Section className="bg-gray-50">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-light font-editorial mb-4">
          Technical Architecture
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          How your browsing becomes a powerful, searchable memory system
        </p>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Architecture Flow */}
        <InfoCard className="p-8 mb-8">
            <div className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-6 text-center">[HOW IT WORKS]</div>
          
          {/* Architecture Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {components.map((component) => {
              const colors = getColorClasses(component.color)
              return (
                <div key={component.name} className="text-center">
                  <div className={`w-16 h-16 ${colors.bg} border ${colors.border} flex items-center justify-center mx-auto mb-3`}>
                    <div className={`w-8 h-8 ${colors.dot} rounded`}></div>
                  </div>
                  <h4 className="text-sm font-mono text-gray-800 mb-2">{component.name}</h4>
                  <p className="text-xs text-gray-600">{component.description}</p>
                </div>
              )
            })}
          </div>

          {/* Flow Connections */}
          <div className="mt-8 text-center">
            <div className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-4">[CONNECTIONS]</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {connections.map((connection, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 p-3">
                  <div className="font-mono text-gray-800 mb-1">{connection.from} → {connection.to}</div>
                  <div className="text-gray-600">{connection.description}</div>
                </div>
              ))}
            </div>
          </div>
        </InfoCard>

        {/* Technical Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoCard className="p-6">
            <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-4">[SAVING MEMORIES]</h4>
            <div className="space-y-3 text-sm">
              {processingPipeline.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-gray-600">{item.step}</span>
                  <span className="font-mono text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>
          </InfoCard>

          <InfoCard className="p-6">
            <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-4">[FINDING MEMORIES]</h4>
            <div className="space-y-3 text-sm">
              {searchPipeline.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-gray-600">{item.step}</span>
                  <span className="font-mono text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>
          </InfoCard>
        </div>
      </div>
    </Section>
  )
}
