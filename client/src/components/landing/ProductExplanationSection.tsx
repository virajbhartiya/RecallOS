import React from "react"

import { mockMeshData } from "../../data/mock-mesh-data"
import { Section } from "../sections"
import { SearchAnimationDemo } from "./SearchAnimationDemo"

export const ProductExplanationSection: React.FC = () => {
  return (
    <Section className="bg-transparent py-12 sm:py-16 lg:py-20 xl:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-light font-editorial mb-3 sm:mb-4">
            How it works
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-700 max-w-2xl mx-auto px-2 sm:px-0">
            Cognia captures everything you see online, making it instantly
            searchable with natural language queries.
          </p>
        </div>
      </div>

      <div className="w-screen relative left-1/2 -translate-x-1/2 aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9] h-[50vh] sm:h-[60vh] lg:h-[70vh] xl:h-[80vh] min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] overflow-visible sm:overflow-hidden">
        <div className="absolute inset-0" style={{ pointerEvents: "auto" }}>
          <SearchAnimationDemo meshData={mockMeshData} />
        </div>
      </div>
    </Section>
  )
}
