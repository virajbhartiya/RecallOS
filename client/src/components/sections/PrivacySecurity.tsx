import React from 'react'
import { Section } from './Section'
import { InfoCard } from './InfoCard'

const privacyFeatures = [
  {
    title: 'Private by Default',
    description: 'Never captures private or local content. Only saves public web pages you visit.'
  },
  {
    title: 'You Control Everything',
    description: 'Your memories belong to you. No one else can access them without your permission.'
  },
  {
    title: 'Transparent Operations',
    description: 'Everything is open and verifiable. You can see exactly what\'s being stored and when.'
  },
  {
    title: 'No Tracking',
    description: 'We don\'t track you or sell your data. Your browsing stays private.'
  }
]

const securityFeatures = [
  {
    title: 'Permanent Storage',
    description: 'Your memories are stored permanently and can never be lost or deleted.'
  },
  {
    title: 'Verifiable Records',
    description: 'Every memory can be verified and proven to be authentic and unchanged.'
  },
  {
    title: 'No Data Sharing',
    description: 'Your memories are never shared with third parties or advertisers.'
  },
  {
    title: 'Secure by Design',
    description: 'Built with security and privacy as core principles from the ground up.'
  }
]

const privacyPolicy = {
  dataCollection: [
    'Only public web pages you visit',
    'No private or local content',
    'No personal information',
    'No tracking or analytics'
  ],
  dataStorage: [
    'Your memories stored securely',
    'Permanent blockchain records',
    'You control access',
    'No cloud storage of private data'
  ],
  dataSharing: [
    'Never shared with third parties',
    'No advertising or tracking',
    'You choose what to share',
    'Complete privacy protection'
  ]
}

export const PrivacySecurity: React.FC = () => {
  return (
    <Section className="bg-white">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-light font-editorial mb-4">
          Privacy & Security
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Your privacy and security are our top priority. Your memories belong to you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Privacy Features */}
        <div>
          <h3 className="text-xl font-light mb-6 text-center">Privacy Protection</h3>
          <div className="space-y-4">
            {privacyFeatures.map((feature, index) => (
              <InfoCard key={index} className="p-4">
                <div className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-2">
                  {feature.title}
                </div>
                <div className="text-sm text-gray-700">
                  {feature.description}
                </div>
              </InfoCard>
            ))}
          </div>
        </div>

        {/* Security Features */}
        <div>
          <h3 className="text-xl font-light mb-6 text-center">Security Measures</h3>
          <div className="space-y-4">
            {securityFeatures.map((feature, index) => (
              <InfoCard key={index} className="p-4">
                <div className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-2">
                  {feature.title}
                </div>
                <div className="text-sm text-gray-700">
                  {feature.description}
                </div>
              </InfoCard>
            ))}
          </div>
        </div>
      </div>

      {/* Privacy Policy Summary */}
      <InfoCard className="p-6">
        <h3 className="text-lg font-light mb-6 text-center">Privacy Policy Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-3">Data Collection</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              {privacyPolicy.dataCollection.map((item, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-3">Data Storage</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              {privacyPolicy.dataStorage.map((item, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-mono text-gray-600 uppercase tracking-wide mb-3">Data Sharing</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              {privacyPolicy.dataSharing.map((item, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </InfoCard>
    </Section>
  )
}
