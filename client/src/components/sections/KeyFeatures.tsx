import React from 'react'
import { Section } from './Section'
import { InfoCard } from './InfoCard'

const features = [
  {
    color: 'blue',
    title: 'Smart Web Capture',
    description: 'Automatically saves everything important you read, without getting in your way.',
    details: [
      {
        title: 'Works Everywhere',
        description: 'Captures content from any website, article, or documentation you visit.'
      },
      {
        title: 'Privacy First',
        description: 'Never captures private or local content. Only saves what you want to remember.'
      },
      {
        title: 'Smart Filtering',
        description: 'Focuses on meaningful content, skipping ads and irrelevant information.'
      }
    ]
  },
  {
    color: 'purple',
    title: 'Knowledge Connections',
    description: 'Automatically links related ideas and topics to build your personal knowledge network.',
    details: [
      {
        title: 'Finds Patterns',
        description: 'Discovers connections between different articles, tutorials, and resources you read.'
      },
      {
        title: 'Builds Context',
        description: 'Understands how topics relate to each other across your learning journey.'
      },
      {
        title: 'Visual Learning',
        description: 'See your knowledge as an interactive map of connected ideas and concepts.'
      }
    ]
  },
  {
    color: 'green',
    title: 'AI Integration',
    description: 'Works seamlessly with ChatGPT and other AI tools to give you better, more informed responses.',
    details: [
      {
        title: 'Automatic Sharing',
        description: 'When you ask AI questions, it automatically knows about your previous research.'
      },
      {
        title: 'Better Answers',
        description: 'AI responses are informed by everything you\'ve learned, not just the current conversation.'
      },
      {
        title: 'Source Citations',
        description: 'Always know where information came from with clear references to your memories.'
      }
    ]
  },
  {
    color: 'orange',
    title: 'Permanent Records',
    description: 'Your memories are permanently stored and verifiable, so you never lose important information.',
    details: [
      {
        title: 'Blockchain Storage',
        description: 'Every memory is permanently recorded and can be verified anytime.'
      },
      {
        title: 'Never Lost',
        description: 'Your knowledge is safely stored and accessible forever, even if websites disappear.'
      },
      {
        title: 'Transparent Proof',
        description: 'You can always verify when and where you learned something.'
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
          Powerful features that make your browsing smarter and your knowledge permanent
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
