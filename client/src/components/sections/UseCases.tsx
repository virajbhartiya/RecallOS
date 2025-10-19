import React from 'react'
import { Section } from './Section'
import { InfoCardWithIcon } from './InfoCard'

const useCases = [
  {
    color: 'blue',
    title: 'Learning & Research',
    description: 'Never lose track of what you\'ve learned. Connect ideas across articles, tutorials, and documentation.',
    features: [
      'Remember every tutorial you follow',
      'Connect related articles automatically',
      'Find knowledge gaps in your learning',
      'Build your personal learning map'
    ]
  },
  {
    color: 'green',
    title: 'Development Projects',
    description: 'Keep track of all the code, solutions, and documentation you discover while building projects.',
    features: [
      'Remember GitHub repos you found useful',
      'Link Stack Overflow answers to your problems',
      'Track API documentation you used',
      'Remember how you solved specific bugs'
    ]
  },
  {
    color: 'purple',
    title: 'Work & Meetings',
    description: 'Connect meeting notes with your research and project work for better context and follow-up.',
    features: [
      'Link meeting discussions to your research',
      'Track action items and decisions',
      'Connect project updates to your learning',
      'Never lose important work context'
    ]
  },
  {
    color: 'orange',
    title: 'Writing & Content',
    description: 'Build comprehensive knowledge bases for your writing, with all sources and research connected.',
    features: [
      'Organize research materials automatically',
      'Verify sources and facts easily',
      'Find content gaps in your knowledge',
      'Create well-researched content faster'
    ]
  },
  {
    color: 'red',
    title: 'Personal Growth',
    description: 'Track your learning journey and build a searchable archive of everything that interests you.',
    features: [
      'See your learning progress over time',
      'Discover patterns in your interests',
      'Never forget important insights',
      'Build your personal knowledge library'
    ]
  },
  {
    color: 'indigo',
    title: 'Team Knowledge',
    description: 'Share knowledge and context with your team, making collaboration more effective.',
    features: [
      'Share research with team members',
      'Build shared knowledge bases',
      'Transfer knowledge when people leave',
      'Make team learning visible and searchable'
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
          Real ways RecallOS makes your work, learning, and research more effective
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
