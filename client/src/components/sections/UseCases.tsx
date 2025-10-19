import React from 'react'
import { Section } from './Section'
import { InfoCardWithIcon } from './InfoCard'

const useCases = [
  {
    color: 'blue',
    title: 'Research & Learning',
    description: 'Track documentation, articles, and tutorials with automatic connections between related concepts.',
    features: [
      'Academic paper connections',
      'Tutorial sequence tracking',
      'Knowledge gap identification',
      'Citation network building'
    ]
  },
  {
    color: 'green',
    title: 'Development Work',
    description: 'Link GitHub repos, Stack Overflow answers, and documentation for comprehensive project knowledge.',
    features: [
      'Code repository tracking',
      'Stack Overflow Q&A linking',
      'API documentation indexing',
      'Bug fix pattern recognition'
    ]
  },
  {
    color: 'purple',
    title: 'Meeting Notes',
    description: 'Connect Google Meet transcripts with related project memories and action items.',
    features: [
      'Meeting transcript analysis',
      'Action item tracking',
      'Project context linking',
      'Follow-up automation'
    ]
  },
  {
    color: 'orange',
    title: 'Content Creation',
    description: 'Build knowledge graphs from research materials for comprehensive content development.',
    features: [
      'Research material organization',
      'Source verification',
      'Content gap analysis',
      'Fact-checking automation'
    ]
  },
  {
    color: 'red',
    title: 'Personal Knowledge Base',
    description: 'Create a searchable, verifiable memory archive of your digital interactions and learning.',
    features: [
      'Digital footprint tracking',
      'Learning progress monitoring',
      'Interest pattern analysis',
      'Knowledge retention metrics'
    ]
  },
  {
    color: 'indigo',
    title: 'Team Collaboration',
    description: 'Share knowledge graphs and memory networks for enhanced team productivity and context sharing.',
    features: [
      'Shared memory networks',
      'Context-aware collaboration',
      'Knowledge transfer automation',
      'Team learning analytics'
    ]
  }
]

const getColorClasses = (color: string) => {
  const colorMap = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    indigo: 'bg-indigo-500'
  }
  return colorMap[color as keyof typeof colorMap] || 'bg-gray-500'
}

export const UseCases: React.FC = () => {
  return (
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
        {useCases.map((useCase) => {
          const dotColor = getColorClasses(useCase.color)
          const icon = (
            <div className={`w-3 h-3 ${dotColor} rounded-full`}></div>
          )

          const featuresWithBullets = useCase.features.map((feature, index) => (
            <div key={index}>• {feature}</div>
          ))

          return (
            <InfoCardWithIcon
              key={useCase.title}
              icon={icon}
              title={useCase.title}
              description={useCase.description}
              features={featuresWithBullets}
              className="bg-gray-50"
            />
          )
        })}
      </div>
    </Section>
  )
}
