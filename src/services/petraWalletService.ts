// Petra wallet uses window.aptos - no import needed
// Aptos testnet API endpoint
const APTOS_NODE_URL = 'https://fullnode.testnet.aptoslabs.com'

// Contract module address (updated to match sender address)
const MODULE_ADDRESS = "0xfbc34c56aab6dcbe5aa1c9c47807e8fc80f0e674341b11a5b4b6a742764cd0e2"

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
  tokenId,  // content_id (e.g., video_id, tweet_id, LinkedIn post ID)
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
  tokenId: string  // Unique identifier for this token (content_id)
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

      // Validate inputs
      if (!assetName || assetName.trim().length === 0) {
        throw new Error('Asset name cannot be empty')
      }
      if (!unitName || unitName.trim().length === 0) {
        throw new Error('Unit name (symbol) cannot be empty')
      }
      if (decimals < 0 || decimals > 18) {
        throw new Error('Decimals must be between 0 and 18')
      }

      // Validate tokenId
      if (!tokenId || tokenId.trim().length === 0) {
        throw new Error('Token ID (content_id) is required')
      }

      console.log(`[createASAWithPetra] Creating token with:`)
      console.log(`  - Name: ${assetName}`)
      console.log(`  - Symbol: ${unitName.toUpperCase()}`)
      console.log(`  - Token ID: ${tokenId}`)
      console.log(`  - Decimals: ${decimals}`)
      console.log(`  - Total Supply: ${safeTotalSupply}`)
      console.log(`  - Creator: ${sender}`)

      // Build transaction to call initialize function
      // Note: Aptos accepts u64 as string to avoid JavaScript number precision issues
      const transaction = {
        type: "entry_function_payload",
        function: `${MODULE_ADDRESS}::creator_token::initialize`,
        type_arguments: [],
        arguments: [
          Array.from(new TextEncoder().encode(tokenId)), // token_id: vector<u8> (content_id)
          Array.from(new TextEncoder().encode(assetName)), // name: vector<u8>
          Array.from(new TextEncoder().encode(unitName.toUpperCase())), // symbol: vector<u8>
          decimals.toString(), // decimals: u8 (as string for consistency)
          safeTotalSupply.toString(), // total_supply: u64 (as string to avoid precision issues)
          Array.from(new TextEncoder().encode(iconUri || url || "")), // icon_uri: vector<u8>
          Array.from(new TextEncoder().encode(projectUri || url || "")) // project_uri: vector<u8>
        ]
      }

      console.log(`[createASAWithPetra] Transaction payload:`, JSON.stringify(transaction, null, 2))

      // Sign and submit transaction (using new API format)
      const response = await petraWallet.signAndSubmitTransaction({ payload: transaction })
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

  // Sign and submit transaction (using new API format)
  const response = await petraWallet.signAndSubmitTransaction({ payload: transaction })
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
  tokenId,  // content_id (e.g., video_id, tweet_id, LinkedIn post ID)
  aptPayment,
  minTokensReceived
}: {
  buyer: string
  petraWallet: any
  creatorAddress: string
  tokenId: string  // Unique identifier for this token (content_id)
  aptPayment: number // APT amount to pay (will be converted to octas)
  minTokensReceived?: number // Minimum tokens expected (slippage protection)
}): Promise<{ txId: string; tokensReceived: number; aptSpent: number }> {
  return executeWithQueue(async () => {
    try {
      if (!petraWallet) {
        throw new Error('Petra wallet not connected')
      }

      if (!tokenId || tokenId.trim().length === 0) {
        throw new Error('Token ID (content_id) is required')
      }

      // Convert APT to octas (1 APT = 100000000 octas)
      const aptPaymentOctas = Math.round(aptPayment * 100000000)
      if (!Number.isSafeInteger(aptPaymentOctas) || aptPaymentOctas <= 0) {
        throw new Error(`Invalid APT payment: ${aptPayment}`)
      }

      // Minimum tokens (slippage protection) - default to 0 if not provided
      const minTokens = minTokensReceived ? Math.round(minTokensReceived) : 0

      // Convert tokenId string to bytes (vector<u8>)
      const tokenIdBytes = Array.from(new TextEncoder().encode(tokenId))

      // Build transaction to call buy_tokens function
      // Signature: buy_tokens(buyer, creator, token_id, apt_payment, min_tokens_received)
      const transaction = {
        type: "entry_function_payload",
        function: `${MODULE_ADDRESS}::creator_token::buy_tokens`,
        type_arguments: [],
        arguments: [
          creatorAddress, // creator: address
          tokenIdBytes, // token_id: vector<u8>
          aptPaymentOctas.toString(), // apt_payment: u64 (in octas)
          minTokens.toString() // min_tokens_received: u64
        ]
      }

      // Sign and submit transaction (using new API format)
      // Petra wallet now requires { payload } instead of just payload
      const response = await petraWallet.signAndSubmitTransaction({ payload: transaction })
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
      
      // Extract detailed error message from PetraApiError
      let errorMessage = 'Transaction failed'
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.info) {
        errorMessage = error.info
      } else if (error?.code) {
        errorMessage = `Error code: ${error.code}`
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      // Check for specific error types
      if (errorMessage.includes('E_INSUFFICIENT_BALANCE') || errorMessage.includes('0x10002')) {
        errorMessage = 'Insufficient token supply. The transaction would exceed the total supply limit.'
      } else if (errorMessage.includes('E_INSUFFICIENT_PAYMENT') || errorMessage.includes('0x10003')) {
        errorMessage = 'Slippage protection: You would receive fewer tokens than expected. Please try again.'
      } else if (errorMessage.includes('INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE')) {
        errorMessage = 'Insufficient APT balance for transaction fees. Please add more APT to your wallet.'
      } else if (errorMessage.includes('rejected') || errorMessage.includes('User rejected')) {
        errorMessage = 'Transaction was rejected. Please approve the transaction in your wallet.'
      }
      
      const detailedError = new Error(errorMessage)
      detailedError.name = error?.name || 'PetraApiError'
      throw detailedError
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
  tokenId,  // content_id
  tokenAmount,
  minAptReceived
}: {
  seller: string
  petraWallet: any
  creatorAddress: string
  tokenId: string  // content_id
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
      // Note: sell_tokens requires creator to sign, so this will need to be updated
      // For now, we'll need the creator to sign the transaction
      const transaction = {
        type: "entry_function_payload",
        function: `${MODULE_ADDRESS}::creator_token::sell_tokens`,
        type_arguments: [],
        arguments: [
          Array.from(new TextEncoder().encode(tokenId)), // token_id: vector<u8>
          safeTokenAmount.toString(), // token_amount: u64
          minAptReceivedOctas.toString() // min_apt_received: u64 (in octas)
        ]
      }

      // Sign and submit transaction (using new API format)
      const response = await petraWallet.signAndSubmitTransaction({ payload: transaction })
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

      // Sign and submit transaction (using new API format)
      const response = await petraWallet.signAndSubmitTransaction({ payload: transaction })
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
  tokenId: string,
  accountAddress: string
): Promise<number> {
  try {
    // Convert tokenId string to hex-encoded bytes (Aptos expects hex string for vector<u8>)
    const tokenIdBytes = new TextEncoder().encode(tokenId)
    const tokenIdHex = '0x' + Array.from(tokenIdBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    const response = await fetch(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${MODULE_ADDRESS}::creator_token::get_balance`,
        type_arguments: [],
        arguments: [creatorAddress, tokenIdHex, accountAddress]
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
export async function getCurrentSupply(creatorAddress: string, tokenId: string): Promise<number> {
  try {
    const response = await fetch(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${MODULE_ADDRESS}::creator_token::get_current_supply`,
        type_arguments: [],
        arguments: [creatorAddress, '0x' + Array.from(new TextEncoder().encode(tokenId)).map(b => b.toString(16).padStart(2, '0')).join('')]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Failed to fetch current supply: ${response.status} ${errorText}`)
      throw new Error(`Failed to fetch current supply: ${response.status}`)
    }

    const data = await response.json()
    const supply = parseInt(data[0] || '0', 10)
    console.log(`[getCurrentSupply] Creator: ${creatorAddress}, Supply: ${supply}`)
    return supply
  } catch (error) {
    console.error('❌ Error getting current supply:', error)
    throw error // Re-throw so caller can handle it
  }
}

/**
 * Get total supply of a token
 */
export async function getTotalSupply(creatorAddress: string, tokenId: string): Promise<number> {
  try {
    const response = await fetch(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${MODULE_ADDRESS}::creator_token::get_total_supply`,
        type_arguments: [],
        arguments: [creatorAddress, '0x' + Array.from(new TextEncoder().encode(tokenId)).map(b => b.toString(16).padStart(2, '0')).join('')]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Failed to fetch total supply: ${response.status} ${errorText}`)
      throw new Error(`Failed to fetch total supply: ${response.status}`)
    }

    const data = await response.json()
    const totalSupply = parseInt(data[0] || '0', 10)
    console.log(`[getTotalSupply] Creator: ${creatorAddress}, Total Supply: ${totalSupply}`)
    return totalSupply
  } catch (error) {
    console.error('❌ Error getting total supply:', error)
    throw error // Re-throw so caller can handle it
  }
}

/**
 * Get APT reserve for a token
 */
export async function getAptReserve(creatorAddress: string, tokenId: string): Promise<number> {
  try {
    const response = await fetch(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${MODULE_ADDRESS}::creator_token::get_apt_reserve`,
        type_arguments: [],
        arguments: [creatorAddress, '0x' + Array.from(new TextEncoder().encode(tokenId)).map(b => b.toString(16).padStart(2, '0')).join('')]
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
