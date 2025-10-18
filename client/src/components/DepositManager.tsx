import React, { useState, useEffect } from 'react'
import { useWallet } from '../contexts/WalletContext'

interface DepositInfo {
  balance: string
  contractAddress: string
  gasEstimate: {
    gasPrice: string
    estimatedGas: string
    estimatedCost: string
  }
  recommendations: {
    minDeposit: string
    lowBalanceThreshold: string
  }
}

interface DepositManagerProps {
  onClose?: () => void
}

export const DepositManager: React.FC<DepositManagerProps> = ({ onClose }) => {
  const { address, gasBalance, depositGas, fetchGasBalance } = useWallet()
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [isDepositing, setIsDepositing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (address) {
      fetchDepositInfo()
    }
  }, [address])

  const fetchDepositInfo = async () => {
    if (!address) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/deposit/info/${address}`)
      const data = await response.json()
      
      if (data.success) {
        setDepositInfo(data.data)
      } else {
        setError('Failed to fetch deposit info')
      }
    } catch (error) {
      console.error('Error fetching deposit info:', error)
      setError('Failed to fetch deposit info')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setIsDepositing(true)
    setError(null)

    try {
      await depositGas(depositAmount)
      setDepositAmount('')
      await fetchDepositInfo()
      await fetchGasBalance()
      if (onClose) {
        onClose()
      }
    } catch (error) {
      setError((error as Error).message ?? 'Failed to deposit gas')
    } finally {
      setIsDepositing(false)
    }
  }

  const isLowBalance = depositInfo && parseFloat(depositInfo.balance) < parseFloat(depositInfo.recommendations.lowBalanceThreshold)

  if (!address) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-600">Connect your wallet to manage gas deposits</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 p-6">
      <h3 className="text-lg font-light mb-6 text-center">Gas Deposit Manager</h3>
      
      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading deposit info...</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-gray-600 uppercase tracking-wide">Current Gas Balance</span>
              {isLowBalance && (
                <span className="text-xs font-mono text-yellow-600 uppercase tracking-wide">
                  Low Balance
                </span>
              )}
            </div>
            <div className="text-lg font-mono text-gray-900">
              {gasBalance ? `${gasBalance} ETH` : '0.0000 ETH'}
            </div>
            {depositInfo && (
              <p className="text-xs font-mono text-gray-500 mt-1">
                Contract: {depositInfo.contractAddress.slice(0, 6)}...{depositInfo.contractAddress.slice(-4)}
              </p>
            )}
          </div>

          {depositInfo && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">Gas Cost Estimate</h4>
              <div className="text-xs font-mono text-gray-600">
                <p>Per memory: ~{depositInfo.gasEstimate.estimatedCost} ETH</p>
                <p>Gas price: {depositInfo.gasEstimate.gasPrice} gwei</p>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="depositAmount" className="block text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">
              Deposit Amount (ETH)
            </label>
            <div className="flex gap-2">
              <input
                id="depositAmount"
                type="number"
                step="0.001"
                min="0.001"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="0.01"
              />
              <button
                onClick={handleDeposit}
                disabled={isDepositing || !depositAmount}
                className="px-4 py-2 border border-black bg-white hover:bg-black hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-mono uppercase tracking-wide"
              >
                {isDepositing ? 'Depositing...' : 'Deposit'}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-mono text-gray-600 uppercase tracking-wide mb-2">Quick deposit:</p>
            <div className="flex gap-2">
              {['0.01', '0.05', '0.1'].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setDepositAmount(amount)}
                  className="px-3 py-1 text-xs font-mono uppercase tracking-wide border border-gray-300 bg-white hover:bg-gray-50 transition-all duration-200"
                >
                  {amount} ETH
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {depositInfo && (
            <div className="text-xs font-mono text-gray-500">
              <p>• Minimum deposit: {depositInfo.recommendations.minDeposit} ETH</p>
              <p>• Low balance warning: {depositInfo.recommendations.lowBalanceThreshold} ETH</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
