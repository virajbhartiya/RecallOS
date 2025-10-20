import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface WalletContextType {
  isConnected: boolean
  address: string | null
  chainId: number | null
  balance: string | null
  gasBalance: string | null
  isConnecting: boolean
  connect: () => void
  disconnect: () => void
  depositGas: (amount: string) => Promise<void>
  fetchGasBalance: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

interface WalletProviderProps {
  children: React.ReactNode
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [gasBalance, setGasBalance] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const fetchBalance = async (walletAddress: string) => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [walletAddress, 'latest']
        }) as string
        const ethBalance = (parseInt(balance, 16) / Math.pow(10, 18)).toFixed(4)
        setBalance(ethBalance)
      } catch (error) {
        console.error('Error fetching balance:', error)
        setBalance(null)
      }
    }
  }

  const fetchGasBalance = useCallback(async () => {
    if (!address) return
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/deposit/balance/${address}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setGasBalance(data.data.balance)
        }
      }
    } catch (error) {
      console.error('Error fetching gas balance:', error)
      setGasBalance(null)
    }
  }, [address])

  const depositGas = async (amount: string) => {
    if (!address || !window.ethereum) {
      throw new Error('Wallet not connected')
    }

    try {
      // Get contract address
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/deposit/address`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error('Failed to get contract address')
      }

      const contractAddress = data.data.contractAddress
      const amountWei = (parseFloat(amount) * Math.pow(10, 18)).toString(16)
      
      const depositGasFunctionSelector = '0xae9bb692'
      
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: contractAddress,
          value: `0x${amountWei}`,
          data: depositGasFunctionSelector,
          gas: '0xea60'
        }]
      })

      await new Promise((resolve, reject) => {
        const checkTransaction = async () => {
          try {
            const receipt = await window.ethereum!.request({
              method: 'eth_getTransactionReceipt',
              params: [txHash]
            }) as { status: string }
            
            if (receipt) {
              if (receipt.status === '0x1') {
                resolve(receipt)
              } else {
                console.error('Transaction failed with receipt:', receipt)
                reject(new Error(`Transaction failed: ${receipt.status}`))
              }
            } else {
              setTimeout(checkTransaction, 2000)
            }
          } catch (error) {
            reject(error)
          }
        }
        checkTransaction()
      })

      await fetchGasBalance()
    } catch (error) {
      console.error('Error depositing gas:', error)
      throw error
    }
  }

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[]
          if (accounts.length > 0) {
            setIsConnected(true)
            setAddress(accounts[0])
            const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string
            setChainId(parseInt(chainId, 16))
            await fetchBalance(accounts[0])
            await fetchGasBalance()
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error)
        }
      }
    }

    checkConnection()

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', async (...args: unknown[]) => {
        const accounts = args[0] as string[]
        if (accounts.length > 0) {
          setIsConnected(true)
          setAddress(accounts[0])
          await fetchBalance(accounts[0])
          await fetchGasBalance()
        } else {
          setIsConnected(false)
          setAddress(null)
          setChainId(null)
          setBalance(null)
          setGasBalance(null)
        }
      })

      window.ethereum.on('chainChanged', (...args: unknown[]) => {
        const chainId = args[0] as string
        setChainId(parseInt(chainId, 16))
      })
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged')
        window.ethereum.removeAllListeners('chainChanged')
      }
    }
  }, [fetchGasBalance])

  const connect = async () => {
    if (isConnecting) {
      console.log('Wallet connection already in progress...')
      return
    }

    if (typeof window !== 'undefined' && window.ethereum) {
      setIsConnecting(true)
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        }) as string[]
        if (accounts.length > 0) {
          setIsConnected(true)
          setAddress(accounts[0])
          const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string
          setChainId(parseInt(chainId, 16))
          await fetchBalance(accounts[0])
          await fetchGasBalance()
        }
      } catch (error: any) {
        console.error('Error connecting wallet:', error)
        
        // Handle specific MetaMask error codes
        if (error.code === -32002) {
          console.log('Wallet connection request already pending. Please check your wallet.')
          // Don't show alert for pending requests, just log it
        } else if (error.code === 4001) {
          console.log('User rejected the connection request.')
          // Don't show alert for user rejection
        } else {
          console.error('Failed to connect wallet:', error.message || 'Unknown error')
        }
      } finally {
        setIsConnecting(false)
      }
    } else {
      alert('Please install MetaMask or another Web3 wallet to continue.')
    }
  }

  const disconnect = () => {
    setIsConnected(false)
    setAddress(null)
    setChainId(null)
    setBalance(null)
    setGasBalance(null)
  }

  const value: WalletContextType = {
    isConnected,
    address,
    chainId,
    balance,
    gasBalance,
    isConnecting,
    connect,
    disconnect,
    depositGas,
    fetchGasBalance
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, callback: (...args: unknown[]) => void) => void
      removeAllListeners: (event: string) => void
    }
  }
}
