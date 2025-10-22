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
    if (!address || !window.ethereum) {
      return
    }
    
    
    try {
      // Get contract address
      const contractAddress =
        (import.meta.env.VITE_CONTRACT_ADDRESS as string) ||
        (import.meta.env.VITE_MEMORY_REGISTRY_CONTRACT_ADDRESS as string)

      if (!contractAddress) {
        console.error('Missing VITE_CONTRACT_ADDRESS in environment')
        setGasBalance(null)
        return
      }

      // Call getUserGasBalance(address) function on the smart contract
      // Function selector: 0xbb383c69 (getUserGasBalance(address))
      const functionSelector = '0xbb383c69'
      const addressParam = address.slice(2).padStart(64, '0') // Remove 0x and pad to 64 chars
      const data = functionSelector + addressParam

      const result = await window.ethereum.request({
        method: 'eth_call',
        params: [{
          to: contractAddress,
          data: data
        }, 'latest']
      }) as string

      
      // Convert hex result to ETH
      const balanceWei = parseInt(result, 16)
      const balanceEth = (balanceWei / Math.pow(10, 18)).toFixed(6)
      setGasBalance(balanceEth)
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
      // Prefer contract address from env for frontend usage
      const contractAddress =
        (import.meta.env.VITE_CONTRACT_ADDRESS as string) ||
        (import.meta.env.VITE_MEMORY_REGISTRY_CONTRACT_ADDRESS as string)

      if (!contractAddress) {
        throw new Error('Missing VITE_CONTRACT_ADDRESS in environment')
      }
      const amountWei = (parseFloat(amount) * Math.pow(10, 18)).toString(16)
      
      // depositGas() is a payable function with no parameters
      // Function selector: 0xae9bb692 (depositGas())
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
            setChainId(chainIdNumber)
            
            // Force switch to Sepolia if not already on it
            if (chainIdNumber !== 11155111) {
              try {
                await window.ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: '0xaa36a7' }],
                })
                setChainId(11155111)
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
        setChainId(chainIdNumber)
        
        // Auto-switch to Sepolia if user switched to a different network
        if (chainIdNumber !== 11155111) {
          try {
            if (window.ethereum) {
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }],
              })
              setChainId(11155111)
              // Refresh balance after network switch
              if (address) {
                await fetchBalance(address)
                await fetchGasBalance()
              }
            }
          } catch (switchError: any) {
            // Keep the current network but show warning
          }
        } else {
          // If already on Sepolia, refresh balance to ensure it's correct
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

  // Fetch gas balance when address changes
  useEffect(() => {
    if (address) {
      fetchGasBalance()
    }
  }, [address, fetchGasBalance])

  const connect = async () => {
    if (isConnecting) {
      return
    }

    if (typeof window !== 'undefined' && window.ethereum) {
      setIsConnecting(true)
      
      // Add a timeout to prevent hanging connections
      const connectionTimeout = setTimeout(() => {
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
          setChainId(chainIdNumber)
          
          // Force switch to Sepolia - this is the only supported network
          if (chainIdNumber !== 11155111) {
            try {
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }], // 11155111 in hex
              })
              setChainId(11155111)
              // Refresh balance after network switch
              await fetchBalance(accounts[0])
              await fetchGasBalance()
            } catch (switchError: any) {
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
          }
          
          await fetchBalance(accounts[0])
          await fetchGasBalance()
        }
      } catch (error: any) {
        clearTimeout(connectionTimeout)
        console.error('Error connecting wallet:', error)
        
        // Handle specific MetaMask error codes
        if (error.code === -32002) {
          // Don't show alert for pending requests, just log it
        } else if (error.code === 4001) {
          // Don't show alert for user rejection
        } else if (error.code === -32602) {
        } else if (error.code === -32603) {
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
