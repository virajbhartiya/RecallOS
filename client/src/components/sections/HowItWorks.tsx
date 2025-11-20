import React from "react"

import { InfoCardWithIcon } from "./InfoCard"
import { Section } from "./Section"

const steps = [
  {
    number: 1,
    color: "blue",
    title: "Browse Naturally",
    description:
      "Just browse the web as you normally do. Cognia quietly captures what you read and learn.",
    features: [
      "Works in the background",
      "No interruption to your flow",
      "Captures everything important",
    ],
  },
  {
    number: 2,
    color: "green",
    title: "AI Understands",
    description:
      "Our AI reads and understands the content, extracting key insights, metadata, and embeddings.",
    features: [
      "Rich metadata extraction",
      "Key insights detection",
      "Context understanding",
    ],
  },
  {
    number: 3,
    color: "purple",
    title: "Connects Ideas",
    description:
      "Cognia finds connections between different pages and topics, building your personal knowledge web.",
    features: [
      "Links related content",
      "Builds knowledge connections",
      "Creates learning pathways",
    ],
  },
  {
    number: 4,
    color: "orange",
    title: "Organizes Knowledge",
    description:
      "Memories are structured with concise previews, metadata, and connections to related content.",
    features: ["Clear previews", "Rich metadata", "Connected ideas"],
  },
  {
    number: 5,
    color: "red",
    title: "Find Anything",
    description:
      "Search your memories naturally. Ask questions and get answers from everything you've read.",
    features: [
      "Natural language search",
      "Instant answers",
      "Find anything quickly",
    ],
  },
  {
    number: 6,
    color: "indigo",
    title: "Works with ChatGPT",
    description:
      "When you chat with AI, Cognia automatically shares relevant memories to give you better answers.",
    features: [
      "Automatic memory sharing",
      "Better AI conversations",
      "Context-aware responses",
    ],
  },
]

const getColorClasses = (color: string) => {
  const colorMap = {
    blue: {
      bg: "bg-blue-100",
      border: "border-blue-200",
      text: "text-blue-800",
      dot: "bg-blue-500",
    },
    green: {
      bg: "bg-green-100",
      border: "border-green-200",
      text: "text-green-800",
      dot: "bg-green-500",
    },
    purple: {
      bg: "bg-purple-100",
      border: "border-purple-200",
      text: "text-purple-800",
      dot: "bg-purple-500",
    },
    orange: {
      bg: "bg-orange-100",
      border: "border-orange-200",
      text: "text-orange-800",
      dot: "bg-orange-500",
    },
    red: {
      bg: "bg-red-100",
      border: "border-red-200",
      text: "text-red-800",
      dot: "bg-red-500",
    },
    indigo: {
      bg: "bg-indigo-100",
      border: "border-indigo-200",
      text: "text-indigo-800",
      dot: "bg-indigo-500",
    },
  }
  return colorMap[color as keyof typeof colorMap] || colorMap.blue
}

export const HowItWorks: React.FC = () => {
  return (
    <Section className="bg-gray-50">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-light font-editorial mb-4">
          How Cognia Works
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Turn your browsing into a powerful, searchable memory that works with
          AI
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {steps.map((step) => {
          const colors = getColorClasses(step.color)
          const icon = (
            <div
              className={`w-8 h-8 ${colors.bg} border ${colors.border} flex items-center justify-center text-sm font-mono font-bold ${colors.text}`}
            >
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
