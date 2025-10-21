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
  refreshBalance: () => Promise<void>
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
            const chainIdNumber = parseInt(chainId, 16)
            console.log('Detected chain ID:', chainIdNumber, 'from hex:', chainId)
            setChainId(chainIdNumber)
            
            // Force switch to Sepolia if not already on it
            if (chainIdNumber !== 11155111) {
              console.log(`Auto-switching from network ${chainIdNumber} to Sepolia...`)
              try {
                await window.ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: '0xaa36a7' }],
                })
                setChainId(11155111)
                console.log('Successfully switched to Sepolia')
                // Refresh balance after network switch
                await fetchBalance(accounts[0])
                await fetchGasBalance()
              } catch (switchError: any) {
                if (switchError.code === 4902) {
                  try {
                    await window.ethereum.request({
                      method: 'wallet_addEthereumChain',
                      params: [{
                        chainId: '0xaa36a7',
                        chainName: 'Sepolia Testnet',
                        rpcUrls: ['https://sepolia.infura.io/v3/'],
                        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                        blockExplorerUrls: ['https://sepolia.etherscan.io'],
                      }],
                    })
                    setChainId(11155111)
                    console.log('Successfully added and switched to Sepolia')
                    // Refresh balance after network switch
                    await fetchBalance(accounts[0])
                    await fetchGasBalance()
                  } catch (addError) {
                    console.error('Could not add Sepolia network:', addError)
                  }
                } else {
                  console.error('Could not switch to Sepolia:', switchError)
                }
              }
            }
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

      window.ethereum.on('chainChanged', async (...args: unknown[]) => {
        const chainId = args[0] as string
        const chainIdNumber = parseInt(chainId, 16)
        console.log('Chain changed to:', chainIdNumber)
        setChainId(chainIdNumber)
        
        // Auto-switch to Sepolia if user switched to a different network
        if (chainIdNumber !== 11155111) {
          console.log(`User switched to network ${chainIdNumber}, auto-switching to Sepolia...`)
          try {
            if (window.ethereum) {
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }],
              })
              setChainId(11155111)
              console.log('Successfully switched to Sepolia')
              // Refresh balance after network switch
              if (address) {
                await fetchBalance(address)
                await fetchGasBalance()
              }
            }
          } catch (switchError: any) {
            console.log('Auto-switch failed:', switchError)
            // Keep the current network but show warning
          }
        } else {
          // If already on Sepolia, refresh balance to ensure it's correct
          console.log('Already on Sepolia, refreshing balance...')
          if (address) {
            await fetchBalance(address)
            await fetchGasBalance()
          }
        }
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
      
      // Add a timeout to prevent hanging connections
      const connectionTimeout = setTimeout(() => {
        console.log('Wallet connection timeout')
        setIsConnecting(false)
      }, 30000) // 30 second timeout

      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        }) as string[]
        
        clearTimeout(connectionTimeout)
        
        if (accounts.length > 0) {
          setIsConnected(true)
          setAddress(accounts[0])
          const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string
          const chainIdNumber = parseInt(chainId, 16)
          console.log('Connected to chain ID:', chainIdNumber, 'from hex:', chainId)
          setChainId(chainIdNumber)
          
          // Force switch to Sepolia - this is the only supported network
          if (chainIdNumber !== 11155111) {
            console.log(`Current network (${chainIdNumber}) is not Sepolia. Forcing switch to Sepolia...`)
            try {
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }], // 11155111 in hex
              })
              setChainId(11155111)
              console.log('Successfully switched to Sepolia')
              // Refresh balance after network switch
              await fetchBalance(accounts[0])
              await fetchGasBalance()
            } catch (switchError: any) {
              console.log('Switch failed, trying to add Sepolia network...', switchError)
              // If Sepolia is not added, try to add it
              if (switchError.code === 4902) {
                try {
                  await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                      chainId: '0xaa36a7',
                      chainName: 'Sepolia Testnet',
                      rpcUrls: ['https://sepolia.infura.io/v3/'],
                      nativeCurrency: {
                        name: 'ETH',
                        symbol: 'ETH',
                        decimals: 18,
                      },
                      blockExplorerUrls: ['https://sepolia.etherscan.io'],
                    }],
                  })
                  setChainId(11155111)
                  console.log('Successfully added and switched to Sepolia')
                  // Refresh balance after network switch
                  await fetchBalance(accounts[0])
                  await fetchGasBalance()
                } catch (addError) {
                  console.error('Could not add Sepolia network:', addError)
                  // Keep the current chainId but show warning
                }
              } else {
                console.error('Could not switch to Sepolia:', switchError)
                // Keep the current chainId but show warning
              }
            }
          } else {
            console.log('Already on Sepolia testnet')
          }
          
          await fetchBalance(accounts[0])
          await fetchGasBalance()
        }
      } catch (error: any) {
        clearTimeout(connectionTimeout)
        console.error('Error connecting wallet:', error)
        
        // Handle specific MetaMask error codes
        if (error.code === -32002) {
          console.log('Wallet connection request already pending. Please check your wallet.')
          // Don't show alert for pending requests, just log it
        } else if (error.code === 4001) {
          console.log('User rejected the connection request.')
          // Don't show alert for user rejection
        } else if (error.code === -32602) {
          console.log('Invalid parameters for wallet connection.')
        } else if (error.code === -32603) {
          console.log('Internal error in wallet connection.')
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

  const refreshBalance = async () => {
    if (address) {
      console.log('Manually refreshing balance...')
      await fetchBalance(address)
      await fetchGasBalance()
    }
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
    fetchGasBalance,
    refreshBalance
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
