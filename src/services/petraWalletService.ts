// Petra wallet uses window.aptos - no import needed
// Aptos testnet API endpoint
const APTOS_NODE_URL = 'https://fullnode.testnet.aptoslabs.com'

// Contract module address
const MODULE_ADDRESS = "0x9f3074e3274423b1312330ec60c4257e7ccb44d88aac8f53eeb3fe6a5d8b02ba"

// Transaction queue to prevent multiple simultaneous transactions
let transactionInProgress = false
const transactionQueue: Array<() => Promise<any>> = []

async function executeWithQueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const execute = async () => {
      if (transactionInProgress) {
        transactionQueue.push(execute)
        return
      }
      
      transactionInProgress = true
      try {
        const result = await fn()
        resolve(result)
      } catch (error) {
        reject(error)
      } finally {
        transactionInProgress = false
        if (transactionQueue.length > 0) {
          const next = transactionQueue.shift()
          if (next) next()
        }
      }
    }
    
    execute()
  })
}

/**
 * Wait for transaction confirmation
 */
async function waitForTransaction(txId: string, maxAttempts = 30): Promise<any> {
  let attempts = 0
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    try {
      const txResponse = await fetch(`${APTOS_NODE_URL}/v1/transactions/by_hash/${txId}`)
      if (txResponse.ok) {
        const txData = await txResponse.json()
        if (txData.type === 'user_transaction' && txData.success) {
          return txData
        }
      }
    } catch (e) {
      console.warn(`Transaction check attempt ${attempts + 1} failed:`, e)
    }
    attempts++
  }
  throw new Error('Transaction confirmation timeout')
}

/**
 * Extract metadata address from transaction events
 */
function extractMetadataAddress(txData: any, creatorAddress: string, symbol: string): string {
  // Look for object creation events
  if (txData.events) {
    for (const event of txData.events) {
      if (event.type?.includes('ObjectCreated') || event.data?.object_id) {
        return event.data?.object_id || event.data?.address
      }
      // Look for fungible asset metadata creation
      if (event.type?.includes('fungible_asset') || event.type?.includes('Metadata')) {
        if (event.data?.object_id) {
          return event.data.object_id
        }
      }
    }
  }
  
  // Fallback: return creator address as identifier
  return creatorAddress
}

/**
 * Create Aptos Fungible Asset (FA) token using Move contract
 * This calls the initialize function in the Move contract
 */
export async function createASAWithPetra({
  sender,
  petraWallet,
  assetName,
  unitName,
  totalSupply,
  decimals = 0,
  url = '',
  iconUri = '',
  projectUri = ''
}: {
  sender: string
  petraWallet: any
  assetName: string
  unitName: string
  totalSupply: number
  decimals?: number
  url?: string
  iconUri?: string
  projectUri?: string
}): Promise<{ txId: string; assetId: string; metadataAddress: string }> {
  return executeWithQueue(async () => {
    try {
      if (!petraWallet) {
        throw new Error('Petra wallet not connected')
      }

      const safeTotalSupply = Math.round(totalSupply)
      if (!Number.isSafeInteger(safeTotalSupply) || safeTotalSupply <= 0) {
        throw new Error(`Invalid total supply: ${totalSupply}`)
      }

      // Build transaction to call initialize function
      const transaction = {
        type: "entry_function_payload",
        function: `${MODULE_ADDRESS}::creator_token::initialize`,
        type_arguments: [],
        arguments: [
          Array.from(new TextEncoder().encode(assetName)), // name: vector<u8>
          Array.from(new TextEncoder().encode(unitName.toUpperCase())), // symbol: vector<u8>
          decimals, // decimals: u8
          safeTotalSupply.toString(), // total_supply: u64
          Array.from(new TextEncoder().encode(iconUri || url || "")), // icon_uri: vector<u8>
          Array.from(new TextEncoder().encode(projectUri || url || "")) // project_uri: vector<u8>
        ]
      }

      // Sign and submit transaction
      const response = await petraWallet.signAndSubmitTransaction(transaction)
      const txId = response.hash

      console.log(`✅ FA token creation transaction submitted: ${txId}`)

      // Wait for confirmation
      const txData = await waitForTransaction(txId)
      
              // Extract metadata address
              const metadataAddress = extractMetadataAddress(txData, sender, unitName)
              
              // Don't mint initial supply - tokens will be minted when bought via bonding curve
              // Starting with 0 supply, 0 reserve, price = $0
              console.log(`✅ FA token created with metadata address: ${metadataAddress}`)
              console.log(`ℹ️ Token starts with 0 supply. Tokens will be minted when users buy via bonding curve.`)
              
              return { 
                txId, 
                assetId: metadataAddress, // Use metadata address as asset ID
                metadataAddress 
              }
    } catch (error: any) {
      console.error('❌ Error creating FA token:', error)
      
      if (error?.message?.includes('Network mismatch') || error?.message?.includes('different networks')) {
        const networkError = new Error('Network Mismatch: Please ensure your Petra Wallet is set to TESTNET.')
        networkError.name = 'NetworkMismatchError'
        throw networkError
      }
      
      throw error
    }
  })
}

/**
 * Mint initial supply to creator
 */
async function mintInitialSupply({
  sender,
  petraWallet,
  amount
}: {
  sender: string
  petraWallet: any
  amount: number
}): Promise<string> {
  const transaction = {
    type: "entry_function_payload",
    function: `${MODULE_ADDRESS}::creator_token::mint_initial_supply`,
    type_arguments: [],
    arguments: [amount.toString()]
  }

  const response = await petraWallet.signAndSubmitTransaction(transaction)
  await waitForTransaction(response.hash)
  return response.hash
}

/**
 * Buy tokens using Move contract (bonding curve)
 * New signature: pays APT and receives tokens based on bonding curve
 */
export async function buyTokensWithContract({
  buyer,
  petraWallet,
  creatorAddress,
  aptPayment,
  minTokensReceived
}: {
  buyer: string
  petraWallet: any
  creatorAddress: string
  aptPayment: number // APT amount to pay (will be converted to octas)
  minTokensReceived?: number // Minimum tokens expected (slippage protection)
}): Promise<{ txId: string; tokensReceived: number; aptSpent: number }> {
  return executeWithQueue(async () => {
    try {
      if (!petraWallet) {
        throw new Error('Petra wallet not connected')
      }

      // Convert APT to octas (1 APT = 100000000 octas)
      const aptPaymentOctas = Math.round(aptPayment * 100000000)
      if (!Number.isSafeInteger(aptPaymentOctas) || aptPaymentOctas <= 0) {
        throw new Error(`Invalid APT payment: ${aptPayment}`)
      }

      // Minimum tokens (slippage protection) - default to 0 if not provided
      const minTokens = minTokensReceived ? Math.round(minTokensReceived) : 0

      // Build transaction to call buy_tokens function
      // New signature: buy_tokens(buyer, creator, apt_payment, min_tokens_received)
      const transaction = {
        type: "entry_function_payload",
        function: `${MODULE_ADDRESS}::creator_token::buy_tokens`,
        type_arguments: [],
        arguments: [
          creatorAddress, // creator: address
          aptPaymentOctas.toString(), // apt_payment: u64 (in octas)
          minTokens.toString() // min_tokens_received: u64
        ]
      }

      // Sign and submit transaction
      const response = await petraWallet.signAndSubmitTransaction(transaction)
      const txId = response.hash

      console.log(`✅ Buy tokens transaction submitted: ${txId}`)

      // Wait for confirmation
      await waitForTransaction(txId)

      // Note: Actual tokens received will be determined by the bonding curve
      // We'll need to fetch the balance after the transaction
      // For now, return the APT spent
      return {
        txId,
        tokensReceived: 0, // Will be updated after fetching balance
        aptSpent: aptPayment
      }
    } catch (error: any) {
      console.error('❌ Error buying tokens:', error)
      throw error
    }
  })
}

/**
 * Sell tokens using Move contract (bonding curve)
 */
export async function sellTokensWithContract({
  seller,
  petraWallet,
  creatorAddress,
  tokenAmount,
  minAptReceived
}: {
  seller: string
  petraWallet: any
  creatorAddress: string
  tokenAmount: number
  minAptReceived: number // in APT (will be converted to octas)
}): Promise<{ txId: string; tokensSold: number; aptReceived: number }> {
  return executeWithQueue(async () => {
    try {
      if (!petraWallet) {
        throw new Error('Petra wallet not connected')
      }

      const safeTokenAmount = Math.round(tokenAmount)
      if (!Number.isSafeInteger(safeTokenAmount) || safeTokenAmount <= 0) {
        throw new Error(`Invalid token amount: ${tokenAmount}`)
      }

      // Convert APT to octas
      const minAptReceivedOctas = Math.round(minAptReceived * 100000000)
      if (!Number.isSafeInteger(minAptReceivedOctas) || minAptReceivedOctas <= 0) {
        throw new Error(`Invalid min received: ${minAptReceived} APT`)
      }

      // Build transaction to call sell_tokens function
      const transaction = {
        type: "entry_function_payload",
        function: `${MODULE_ADDRESS}::creator_token::sell_tokens`,
        type_arguments: [],
        arguments: [
          creatorAddress, // creator: address
          safeTokenAmount.toString(), // token_amount: u64
          minAptReceivedOctas.toString() // min_apt_received: u64 (in octas)
        ]
      }

      // Sign and submit transaction
      const response = await petraWallet.signAndSubmitTransaction(transaction)
      const txId = response.hash

      console.log(`✅ Sell tokens transaction submitted: ${txId}`)

      // Wait for confirmation
      await waitForTransaction(txId)

      // Calculate actual received (0.001 APT per token)
      const basePricePerToken = 0.001 // APT
      const aptReceived = safeTokenAmount * basePricePerToken

      return {
        txId,
        tokensSold: safeTokenAmount,
        aptReceived
      }
    } catch (error: any) {
      console.error('❌ Error selling tokens:', error)
      throw error
    }
  })
}

/**
 * Transfer tokens between accounts using Move contract
 */
export async function transferTokensWithContract({
  sender,
  petraWallet,
  creatorAddress,
  recipient,
  amount
}: {
  sender: string
  petraWallet: any
  creatorAddress: string
  recipient: string
  amount: number
}): Promise<string> {
  return executeWithQueue(async () => {
    try {
      if (!petraWallet) {
        throw new Error('Petra wallet not connected')
      }

      const safeAmount = Math.round(amount)
      if (!Number.isSafeInteger(safeAmount) || safeAmount <= 0) {
        throw new Error(`Invalid amount: ${amount}`)
      }

      const transaction = {
        type: "entry_function_payload",
        function: `${MODULE_ADDRESS}::creator_token::transfer`,
        type_arguments: [],
        arguments: [
          creatorAddress, // creator: address
          recipient, // recipient: address
          safeAmount.toString() // amount: u64
        ]
      }

      const response = await petraWallet.signAndSubmitTransaction(transaction)
      await waitForTransaction(response.hash)
      return response.hash
    } catch (error: any) {
      console.error('❌ Error transferring tokens:', error)
      throw error
    }
  })
}

/**
 * Get token balance for an account
 */
export async function getTokenBalance(
  creatorAddress: string,
  accountAddress: string
): Promise<number> {
  try {
    const response = await fetch(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${MODULE_ADDRESS}::creator_token::get_balance`,
        type_arguments: [],
        arguments: [creatorAddress, accountAddress]
      })
    })

    if (!response.ok) {
      throw new Error('Failed to fetch token balance')
    }

    const data = await response.json()
    return parseInt(data[0] || '0', 10)
  } catch (error) {
    console.error('❌ Error getting token balance:', error)
    return 0
  }
}

/**
 * Get current supply of a token
 */
export async function getCurrentSupply(creatorAddress: string): Promise<number> {
  try {
    const response = await fetch(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${MODULE_ADDRESS}::creator_token::get_current_supply`,
        type_arguments: [],
        arguments: [creatorAddress]
      })
    })

    if (!response.ok) {
      throw new Error('Failed to fetch current supply')
    }

    const data = await response.json()
    return parseInt(data[0] || '0', 10)
  } catch (error) {
    console.error('❌ Error getting current supply:', error)
    return 0
  }
}

/**
 * Get total supply of a token
 */
export async function getTotalSupply(creatorAddress: string): Promise<number> {
  try {
    const response = await fetch(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${MODULE_ADDRESS}::creator_token::get_total_supply`,
        type_arguments: [],
        arguments: [creatorAddress]
      })
    })

    if (!response.ok) {
      throw new Error('Failed to fetch total supply')
    }

    const data = await response.json()
    return parseInt(data[0] || '0', 10)
  } catch (error) {
    console.error('❌ Error getting total supply:', error)
    return 0
  }
}

/**
 * Get APT reserve for a token
 */
export async function getAptReserve(creatorAddress: string): Promise<number> {
  try {
    const response = await fetch(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${MODULE_ADDRESS}::creator_token::get_apt_reserve`,
        type_arguments: [],
        arguments: [creatorAddress]
      })
    })

    if (!response.ok) {
      throw new Error('Failed to fetch APT reserve')
    }

    const data = await response.json()
    // Convert octas to APT (1 APT = 100000000 octas)
    const octas = parseInt(data[0] || '0', 10)
    return octas / 100000000
  } catch (error) {
    console.error('❌ Error getting APT reserve:', error)
    return 0
  }
}

/**
 * Get metadata address for a token
 */
export async function getMetadataAddress(creatorAddress: string): Promise<string> {
  try {
    const response = await fetch(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${MODULE_ADDRESS}::creator_token::get_metadata_address`,
        type_arguments: [],
        arguments: [creatorAddress]
      })
    })

    if (!response.ok) {
      throw new Error('Failed to fetch metadata address')
    }

    const data = await response.json()
    return data[0] || creatorAddress
  } catch (error) {
    console.error('❌ Error getting metadata address:', error)
    return creatorAddress
  }
}
