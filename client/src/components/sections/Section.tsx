import React from 'react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

interface SectionProps {
  children: React.ReactNode
  className?: string
  animate?: boolean
}

export const Section: React.FC<SectionProps> = ({ children, className = '', animate = true }) => {
  const { ref, isVisible } = useScrollAnimation(0.1)
  
  return (
    <section 
      ref={ref}
      className={`py-16 border-b border-gray-200 transition-all duration-1000 ${
        animate && isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto px-8">
        {children}
      </div>
    </section>
  )
}
