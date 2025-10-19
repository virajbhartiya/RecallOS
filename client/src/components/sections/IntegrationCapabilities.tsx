import React from 'react'
import { Section } from './Section'
import { InfoCardWithIcon } from './InfoCard'

const integrations = [
  {
    color: 'blue',
    title: 'Browser Extension',
    description: 'Chrome/Edge extension for automatic monitoring of all web activity with privacy controls.',
    features: [
      'Automatic content capture',
      'Privacy extension detection',
      'Activity-based monitoring',
      'Localhost protection'
    ]
  },
  {
    color: 'green',
    title: 'TypeScript SDK',
    description: 'TypeScript/JavaScript client for custom integrations and application development.',
    features: [
      'Memory CRUD operations',
      'Search functionality',
      'Mesh generation',
      'Blockchain verification'
    ]
  },
  {
    color: 'purple',
    title: 'MCP Server',
    description: 'Model Context Protocol server for seamless AI agent integration and memory access.',
    features: [
      'AI agent integration',
      'Context-aware retrieval',
      'Memory management tools',
      'Protocol compliance'
    ]
  },
  {
    color: 'orange',
    title: 'REST API',
    description: 'Direct API access for custom applications and third-party integrations.',
    features: [
      'Memory processing',
      'Search endpoints',
      'Mesh generation',
      'Blockchain operations'
    ]
  },
  {
    color: 'red',
    title: 'Smart Contract',
    description: 'On-chain verification and retrieval with upgradeable proxy pattern for future enhancements.',
    features: [
      'Memory hash storage',
      'Batch operations',
      'Upgradeable design',
      'Gas optimization'
    ]
  },
  {
    color: 'indigo',
    title: 'Web Interface',
    description: 'React-based web application for memory visualization, search, and management.',
    features: [
      'Memory mesh visualization',
      'Advanced search interface',
      'Transaction tracking',
      'Wallet integration'
    ]
  }
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

export const IntegrationCapabilities: React.FC = () => {
  return (
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
        {integrations.map((integration) => {
          const colors = getColorClasses(integration.color)
          const icon = (
            <div className={`w-8 h-8 ${colors.bg} border ${colors.border} flex items-center justify-center`}>
              <div className={`w-4 h-4 ${colors.dot} rounded`}></div>
            </div>
          )

          const featuresWithBullets = integration.features.map((feature, index) => (
            <div key={index}>• {feature}</div>
          ))

          return (
            <InfoCardWithIcon
              key={integration.title}
              icon={icon}
              title={integration.title}
              description={integration.description}
              features={featuresWithBullets}
            />
          )
        })}
      </div>
    </Section>
  )
}
