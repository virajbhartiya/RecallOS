import React from 'react'
import { Section } from './Section'
import { InfoCard } from './InfoCard'

const privacyFeatures = [
  {
    title: 'Local-First Approach',
    description: 'Automatic localhost detection and monitoring skip for local development environments.'
  },
  {
    title: 'Privacy Extension Compatibility',
    description: 'Detects and respects privacy-focused browser extensions and user preferences.'
  },
  {
    title: 'User-Controlled Data',
    description: 'All wallet addresses and personal data are user-controlled with no forced collection.'
  },
  {
    title: 'Transparent Operations',
    description: 'All blockchain operations are transparent and verifiable on public testnet.'
  }
]

const securityFeatures = [
  {
    title: 'Content Hashing',
    description: 'SHA256 hashing ensures content integrity and prevents tampering.'
  },
  {
    title: 'Blockchain Verification',
    description: 'On-chain storage provides cryptographic proof of memory existence and timestamp.'
  },
  {
    title: 'No Third-Party Sharing',
    description: 'Memory data is not shared with third parties without explicit user consent.'
  },
  {
    title: 'Secure Storage',
    description: 'PostgreSQL with pgvector provides secure, encrypted storage for all memory data.'
  }
]

const privacyPolicy = {
  dataCollection: [
    'Page content and metadata from visited websites',
    'User interactions and browsing patterns',
    'Generated summaries and embeddings',
    'Blockchain transaction hashes'
  ],
  dataStorage: [
    'Local browser storage for extension data',
    'PostgreSQL database for processed memories',
    'Sepolia blockchain for content hashes',
    'No cloud storage of raw content'
  ],
  dataSharing: [
    'No sharing with third-party services',
    'Public blockchain transactions only',
    'User-controlled wallet addresses',
    'Optional memory sharing features'
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
          Your privacy and data security are fundamental to RecallOS design
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
