import { useState, useEffect, useCallback } from 'react'

interface WalletState {
  isConnected: boolean
  address: string | null
  balance: number
  isLoading: boolean
  error: string | null
}

// Get Petra wallet from window.aptos
const getPetraWallet = () => {
  if (typeof window !== 'undefined' && 'aptos' in window) {
    return (window as any).aptos
  }
  return null
}

export const usePetraWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: 0,
    isLoading: false,
    error: null,
  })

  const fetchBalanceForAddress = useCallback(async (address: string) => {
    try {
      // Try both testnet and mainnet
      const networks = [
        { name: 'testnet', url: 'https://fullnode.testnet.aptoslabs.com/v1' },
        { name: 'mainnet', url: 'https://fullnode.mainnet.aptoslabs.com/v1' }
      ]
      
      for (const network of networks) {
        try {
          // Method 1: Try view function
          const viewResponse = await fetch(`${network.url}/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              function: '0x1::coin::balance',
              type_arguments: ['0x1::aptos_coin::AptosCoin'],
              arguments: [address]
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
                return balanceInOctas / 100000000
              }
            }
          }
          
          // Method 2: Try resources
          const response = await fetch(`${network.url}/accounts/${address}/resources`)
          if (response.ok) {
            const resources = await response.json()
            const resourcesArray = Array.isArray(resources) ? resources : (resources.data || [])
            const aptCoin = resourcesArray.find((r: any) => {
              const type = r.type || ''
              return type.includes('CoinStore') && (type.includes('AptosCoin') || type.includes('aptos_coin'))
            })
            
            if (aptCoin && aptCoin.data) {
              const coinValue = aptCoin.data.coin?.value || aptCoin.data.value || aptCoin.coin?.value || '0'
              const balanceInOctas = parseInt(String(coinValue), 10)
              if (balanceInOctas > 0) {
                return balanceInOctas / 100000000
              }
            }
          }
        } catch (networkError) {
          continue
        }
      }
      
      return 0
    } catch (error) {
      console.error('Error fetching balance:', error)
      return 0
    }
  }, [])

  const handleDisconnectWallet = useCallback(() => {
    const wallet = getPetraWallet()
    if (wallet) {
      wallet.disconnect().catch(() => {})
    }
    setWalletState({
      isConnected: false,
      address: null,
      balance: 0,
      isLoading: false,
      error: null,
    })
  }, [])

  const connectWallet = useCallback(async () => {
    try {
      setWalletState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const wallet = getPetraWallet()
      if (!wallet) {
        window.open('https://petra.app/', '_blank')
        throw new Error('Petra wallet not installed')
      }
      
      const response = await wallet.connect()
      
      if (response.address) {
        const address = response.address
        // Fetch real balance
        const balance = await fetchBalanceForAddress(address)
            setWalletState({
              isConnected: true,
              address,
          balance,
              isLoading: false,
              error: null,
            })
          }
    } catch (error) {
      // Handle user rejection
      if ((error as any)?.code === 4001) {
            setWalletState(prev => ({
              ...prev,
              isLoading: false,
              error: null,
            }))
      } else {
      setWalletState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      }))
    }
    }
  }, [fetchBalanceForAddress])

  const disconnectWallet = useCallback(async () => {
    try {
      const wallet = getPetraWallet()
      if (wallet) {
        await wallet.disconnect()
      }
      setWalletState({
        isConnected: false,
        address: null,
        balance: 0,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      setWalletState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to disconnect wallet',
      }))
    }
  }, [])

  const refreshBalance = useCallback(async () => {
    if (!walletState.address) return

    const balance = await fetchBalanceForAddress(walletState.address)
      setWalletState(prev => ({
        ...prev,
        balance,
      }))
  }, [walletState.address, fetchBalanceForAddress])

  useEffect(() => {
    // Check if wallet is already connected
    const checkConnection = async () => {
      try {
        const wallet = getPetraWallet()
        if (wallet) {
          const isConnected = await wallet.isConnected()
          if (isConnected) {
            const account = await wallet.account()
            if (account.address) {
              // Fetch real balance first
              const fetchBalanceForAddress = async (address: string) => {
                try {
                  const response = await fetch(`https://testnet.aptoslabs.com/v1/accounts/${address}/resources`)
                  if (response.ok) {
                    const resources = await response.json()
                    const resourcesArray = Array.isArray(resources) ? resources : (resources.data || [])
                    const aptCoin = resourcesArray.find((r: any) => {
                      const type = r.type || r.type_info?.type_name || ''
                      return type.includes('CoinStore') && type.includes('AptosCoin')
                    })
                    if (aptCoin) {
                      const coinValue = aptCoin.data?.coin?.value || aptCoin.data?.value || aptCoin.coin?.value || '0'
                      return parseInt(coinValue, 10) / 100000000
                    }
                  }
                  return 0
                } catch (error) {
                  console.error('Error fetching balance:', error)
                  return 0
                }
              }
              
              const balance = await fetchBalanceForAddress(account.address)
            setWalletState({
              isConnected: true,
                address: account.address,
                balance,
              isLoading: false,
              error: null,
            })
          }
          }
        }
      } catch (error) {
        // Wallet not connected, this is normal
        console.log('No existing connection:', error)
      }
    }

    checkConnection()
  }, [])

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
    refreshBalance,
  }
}
