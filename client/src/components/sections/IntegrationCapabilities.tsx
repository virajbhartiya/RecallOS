import React from 'react'
import { Section } from './Section'
import { InfoCardWithIcon } from './InfoCard'

const integrations = [
  {
    color: 'blue',
    title: 'Browser Extension',
    description: 'Download and install manually. Works automatically in Chrome and Edge with full privacy protection.',
    features: [
      'Download from GitHub releases',
      'Manual installation in developer mode',
      'Privacy-first design',
      'Works automatically once installed'
    ]
  },
  {
    color: 'green',
    title: 'Developer Tools',
    description: 'Build custom apps that work with your memories using our simple developer tools.',
    features: [
      'Easy-to-use APIs',
      'Search your memories',
      'Build custom tools',
      'Full developer support'
    ]
  },
  {
    color: 'purple',
    title: 'AI Integration',
    description: 'Works with any AI tool to give you better, more informed responses based on your memories.',
    features: [
      'Works with ChatGPT',
      'Works with Claude',
      'Works with any AI',
      'Automatic memory sharing'
    ]
  },
  {
    color: 'orange',
    title: 'Web App',
    description: 'Access your memories through our clean, fast web interface for searching and exploring.',
    features: [
      'Beautiful memory visualization',
      'Powerful search',
      'Easy to navigate',
      'Works on any device'
    ]
  },
  {
    color: 'red',
    title: 'Blockchain Storage',
    description: 'Your memories are permanently stored on the blockchain, so they can never be lost or changed.',
    features: [
      'Permanent storage',
      'Verifiable records',
      'Never lost',
      'Transparent proof'
    ]
  },
  {
    color: 'indigo',
    title: 'Team Sharing',
    description: 'Share knowledge with your team and build collective memory networks.',
    features: [
      'Share with team members',
      'Build team knowledge',
      'Collaborative learning',
      'Knowledge transfer'
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
          Easy ways to use RecallOS with your favorite tools and workflows
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
