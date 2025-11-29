import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

// Petra wallet type
interface PetraWallet {
  connect: () => Promise<{ address: string }>
  disconnect: () => Promise<void>
  account: () => Promise<{ address: string }>
  isConnected: () => Promise<boolean>
  signAndSubmitTransaction: (transaction: any) => Promise<any>
  signTransaction: (transaction: any) => Promise<any>
  network?: () => Promise<string>
  getBalance?: (address: string) => Promise<string>
}

interface WalletContextType {
  wallet: { address: string | null; isConnected: boolean; loading: boolean }
  isConnectedToPetraWallet: boolean
  isConnected: boolean
  accounts: string[]
  address: string | null
  balance: number
  connectWallet: () => Promise<void>
  disconnectWallet: () => Promise<void>
  petraWallet: PetraWallet | null
  isLoading: boolean
}

const WalletContext = createContext<WalletContextType>({
  wallet: { address: null, isConnected: false, loading: false },
  isConnectedToPetraWallet: false,
  isConnected: false,
  accounts: [],
  address: null,
  balance: 0,
  connectWallet: async () => {},
  disconnectWallet: async () => {},
  petraWallet: null,
  isLoading: false
})

// Helper to get Petra wallet
const getPetraWallet = (): PetraWallet | null => {
  if (typeof window !== 'undefined' && 'aptos' in window) {
    return (window as any).aptos as PetraWallet
  }
  return null
}

export const useWallet = () => useContext(WalletContext)

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [petraWallet, setPetraWallet] = useState<PetraWallet | null>(null)
  const [accounts, setAccounts] = useState<string[]>([])
  const [address, setAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)
  const [isConnectedToPetraWallet, setIsConnectedToPetraWallet] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)

  // 🔌 CONNECT WALLET
  const connectWallet = async () => {
    const wallet = getPetraWallet()
    if (!wallet) {
      window.open('https://petra.app/', '_blank')
      alert('Please install Petra Wallet extension first!')
      return
    }

    setIsLoading(true)
    try {
      // Connect to Petra Wallet
      const response = await wallet.connect()
      
      // Get account info
      const account = await wallet.account()
      
      // Save account info
      setAccounts([account.address])
      setAddress(account.address)
      setIsConnectedToPetraWallet(true)
      setPetraWallet(wallet)
      await fetchBalance(account.address)
    } catch (error: any) {
      console.error('Error connecting to Petra Wallet:', error)
      
      if (error?.code === 4001) {
        // User rejected
        console.log('User rejected connection')
      } else if (error?.message) {
        alert(`Connection Error: ${error.message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ❌ DISCONNECT WALLET
  const disconnectWallet = async () => {
    const wallet = getPetraWallet()
    if (!wallet) return

    try {
      await wallet.disconnect()
      handleDisconnect()
    } catch (error) {
      console.error('Error disconnecting:', error)
    }
  }

  const handleDisconnect = () => {
    setAccounts([])
    setAddress(null)
    setIsConnectedToPetraWallet(false)
    setBalance(0)
    setPetraWallet(null)
  }

  const fetchBalance = async (addr: string) => {
    try {
      // Try both testnet and mainnet to find the balance
      const networks = [
        { name: 'testnet', url: 'https://fullnode.testnet.aptoslabs.com/v1' },
        { name: 'mainnet', url: 'https://fullnode.mainnet.aptoslabs.com/v1' }
      ]
      
      for (const network of networks) {
        try {
          // Method 1: Try view function (most reliable)
          const viewResponse = await fetch(`${network.url}/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              function: '0x1::coin::balance',
              type_arguments: ['0x1::aptos_coin::AptosCoin'],
              arguments: [addr]
            })
          })
          
          if (viewResponse.ok) {
            const viewResult = await viewResponse.json()
            if (Array.isArray(viewResult) && viewResult.length > 0) {
              const balanceStr = viewResult[0]
              const balanceInOctas = typeof balanceStr === 'string' 
                ? parseInt(balanceStr, 10) 
                : parseInt(String(balanceStr), 10)
              
              if (balanceInOctas > 0) {
                const balanceInAptos = balanceInOctas / 100000000
                setBalance(balanceInAptos)
                console.log(`✅ Fetched Aptos balance from ${network.name}: ${balanceInAptos} APTOS (${balanceInOctas} octas)`)
                return
              }
            }
          }
          
          // Method 2: Try resources endpoint as fallback
          const resourcesResponse = await fetch(`${network.url}/accounts/${addr}/resources`)
          if (resourcesResponse.ok) {
            const resources = await resourcesResponse.json()
            const resourcesArray = Array.isArray(resources) ? resources : (resources.data || [])
            
            // Find APT coin balance
            const aptCoin = resourcesArray.find((r: any) => {
              const type = r.type || ''
              return type.includes('CoinStore') && (type.includes('AptosCoin') || type.includes('aptos_coin'))
            })
            
            if (aptCoin && aptCoin.data) {
              const coinValue = aptCoin.data.coin?.value || aptCoin.data.value || aptCoin.coin?.value || '0'
              const balanceInOctas = parseInt(String(coinValue), 10)
              
              if (balanceInOctas > 0) {
                const balanceInAptos = balanceInOctas / 100000000
                setBalance(balanceInAptos)
                console.log(`✅ Fetched Aptos balance from ${network.name} resources: ${balanceInAptos} APTOS`)
                return
              }
            }
          }
        } catch (networkError) {
          console.log(`Error checking ${network.name}:`, networkError)
          continue
        }
      }
      
      // If all methods fail, set to 0
      setBalance(0)
      console.log('ℹ️ Could not fetch balance from any network')
    } catch (error) {
      console.error('Error fetching Aptos balance:', error)
      setBalance(0)
    }
  }

  // 🚀 INITIALIZE on mount
  useEffect(() => {
    const wallet = getPetraWallet()
    if (wallet) {
      setPetraWallet(wallet)
      
      // Check for existing connection
      const checkConnection = async () => {
        try {
          const isConnected = await wallet.isConnected()
          if (isConnected) {
            const account = await wallet.account()
            setAccounts([account.address])
            setAddress(account.address)
            setIsConnectedToPetraWallet(true)
            await fetchBalance(account.address)
          }
        } catch (error) {
          console.error('Error checking connection:', error)
        }
      }

      checkConnection()
    }
  }, [])

  const value: WalletContextType = {
    wallet: { address, isConnected: isConnectedToPetraWallet, loading: isLoading },
    isConnectedToPetraWallet,
    isConnected: isConnectedToPetraWallet,
    accounts,
    address,
    balance,
    connectWallet,
    disconnectWallet,
      petraWallet: petraWallet,
    isLoading
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}
