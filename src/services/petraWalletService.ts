// Petra wallet uses window.aptos - no import needed
// Aptos testnet API endpoint
const APTOS_NODE_URL = 'https://fullnode.testnet.aptoslabs.com'

// Contract module address (updated to match deployed contract address)
const MODULE_ADDRESS = "0x033349213be67033ffd596fa85b69ab5c3ff82a508bb446002c8419d549d12c6"
// Old contract address (for tokens created before redeployment)
const OLD_MODULE_ADDRESS = "0xfbc34c56aab6dcbe5aa1c9c47807e8fc80f0e674341b11a5b4b6a742764cd0e2"

// Transaction queue to prevent multiple simultaneous transactions
let transactionInProgress = false
const transactionQueue: Array<() => Promise<any>> = []

// Cache for supply values to reduce API calls (5 second TTL)
interface SupplyCacheEntry {
  value: number
  timestamp: number
}
const supplyCache = new Map<string, SupplyCacheEntry>()
const CACHE_TTL = 5000 // 5 seconds

/**
 * Retry fetch with exponential backoff for rate limiting
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<Response> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      
      // If 429 (rate limit), wait and retry
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const delay = retryAfter 
          ? parseInt(retryAfter) * 1000 
          : baseDelay * Math.pow(2, attempt)
        
        console.warn(`⚠️ Rate limit (429) on attempt ${attempt + 1}/${maxRetries}. Waiting ${delay}ms before retry...`)
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }
      
      // For other errors, throw immediately (except 429 which we handle above)
      if (!response.ok && response.status !== 429) {
        return response
      }
      
      return response
    } catch (error: any) {
      lastError = error
      
      // If it's a network error and we have retries left, wait and retry
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.warn(`⚠️ Network error on attempt ${attempt + 1}/${maxRetries}. Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch after retries')
}

/**
 * Get cached supply value or fetch new one
 */
function getCachedSupply(key: string): number | null {
  const entry = supplyCache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.value
  }
  return null
}

/**
 * Set cached supply value
 */
function setCachedSupply(key: string, value: number): void {
  supplyCache.set(key, {
    value,
    timestamp: Date.now()
  })
}

/**
 * Clear cached supply values for a specific token (call after successful trade)
 * Also clears token balance cache for all accounts (since balances change after trades)
 * Uses normalized keys to match cache key format
 */
export function clearSupplyCache(creatorAddress: string, tokenId: string, accountAddress?: string): void {
  // Normalize addresses and tokenId to match cache key format
  const normalizedCreator = creatorAddress.toLowerCase().trim()
  const normalizedTokenId = tokenId.trim()
  
  const keys = [
    `current_supply_${normalizedCreator}_${normalizedTokenId}`,
    `total_supply_${normalizedCreator}_${normalizedTokenId}`,
    `apt_reserve_${normalizedCreator}_${normalizedTokenId}`
  ]
  
  // If account address provided, clear that specific balance cache
  if (accountAddress) {
    const normalizedAccount = accountAddress.toLowerCase().trim()
    keys.push(`token_balance_${normalizedCreator}_${normalizedTokenId}_${normalizedAccount}`)
  } else {
    // Clear all token balance caches for this token (since any trade affects all balances)
    const cacheKeysToDelete: string[] = []
    const searchPrefix = `token_balance_${normalizedCreator}_${normalizedTokenId}_`
    supplyCache.forEach((_, key) => {
      if (key.startsWith(searchPrefix)) {
        cacheKeysToDelete.push(key)
      }
    })
    cacheKeysToDelete.forEach(key => supplyCache.delete(key))
  }
  
  // Also try non-normalized keys (for backwards compatibility)
  keys.push(
    `current_supply_${creatorAddress}_${tokenId}`,
    `total_supply_${creatorAddress}_${tokenId}`,
    `apt_reserve_${creatorAddress}_${tokenId}`
  )
  if (accountAddress) {
    keys.push(`token_balance_${creatorAddress}_${tokenId}_${accountAddress}`)
  }
  
  keys.forEach(key => supplyCache.delete(key))
  console.log(`[Cache] Cleared supply cache for ${tokenId}${accountAddress ? ` (account: ${accountAddress.slice(0, 8)}...)` : ''}`)
}

/**
 * Clear all cached supply values
 */
export function clearAllSupplyCache(): void {
  supplyCache.clear()
  console.log(`[Cache] Cleared all supply cache`)
}

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

      // ALWAYS call the smart contract - don't skip even if token might exist
      // The contract will handle "already exists" errors properly
      console.log(`[createASAWithPetra] Proceeding with smart contract initialization...`)
      console.log(`[createASAWithPetra] This will open Petra wallet for approval.`)

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
      console.log(`[createASAWithPetra] Calling smart contract: ${MODULE_ADDRESS}::creator_token::initialize`)
      console.log(`[createASAWithPetra] Waiting for Petra wallet approval...`)

      // Sign and submit transaction (using new API format)
      // This will open Petra wallet for user to approve
      let response
      let txId: string
      try {
        console.log(`[createASAWithPetra] Requesting transaction signature from Petra wallet...`)
        response = await petraWallet.signAndSubmitTransaction({ payload: transaction })
        if (!response || !response.hash) {
          throw new Error('Transaction submission failed: No transaction hash returned')
        }
        txId = response.hash
        console.log(`✅ FA token creation transaction submitted: ${txId}`)
        console.log(`[createASAWithPetra] Transaction is being processed on Aptos blockchain...`)
      } catch (submitError: any) {
        console.error('❌ Error submitting transaction to Petra wallet:', submitError)
        // Check if user rejected the transaction
        if (submitError?.message?.includes('rejected') || 
            submitError?.message?.includes('denied') ||
            submitError?.message?.includes('User rejected') ||
            submitError?.message?.includes('user rejected') ||
            submitError?.code === 4001 ||
            submitError?.code === 'ACTION_REJECTED') {
          throw new Error('Transaction was rejected. Please approve the transaction in Petra wallet to create the token.')
        }
        throw new Error(`Failed to submit transaction: ${submitError?.message || submitError}`)
      }

      // Wait for confirmation
      console.log(`[createASAWithPetra] Waiting for transaction confirmation...`)
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
      
      // Handle "already exists" error - token was already initialized
      if (error?.message?.includes('already exists') || 
          error?.message?.includes('An object already exists') ||
          error?.message?.includes('OBJECT_EXISTS') ||
          (error?.info && typeof error.info === 'string' && error.info.includes('already exists'))) {
        console.log(`ℹ️ Token already exists. Attempting to get metadata address...`)
        try {
          const metadataAddress = await getMetadataAddress(sender, tokenId)
          console.log(`✅ Token already exists. Metadata address: ${metadataAddress}`)
          return {
            txId: '', // No transaction needed
            assetId: metadataAddress,
            metadataAddress
          }
        } catch (metaError) {
          // If we can't get metadata address, return a helpful error
          console.warn(`⚠️ Token exists but could not get metadata address: ${metaError}`)
          throw new Error('Token already exists but could not retrieve metadata. Please try refreshing the page.')
        }
      }
      
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
      } else if (error?.code === 4001 || errorMessage.includes('4001')) {
        errorMessage = 'Transaction failed (Error 4001): Invalid transaction amount or estimate. Please try a smaller amount.'
      }
      
      const detailedError = new Error(errorMessage)
      detailedError.name = error?.name || 'PetraApiError'
      // Preserve error code for better error handling
      if (error?.code) {
        (detailedError as any).code = error.code
      }
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
      // Updated signature: sell_tokens(seller, creator, token_id, token_amount, min_apt_received)
      // seller is implicit from transaction signer
      const tokenIdBytes = Array.from(new TextEncoder().encode(tokenId))
      
      const transaction = {
        type: "entry_function_payload",
        function: `${MODULE_ADDRESS}::creator_token::sell_tokens`,
        type_arguments: [],
        arguments: [
          creatorAddress, // creator: address
          tokenIdBytes, // token_id: vector<u8>
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
      } else if (error?.code === 4001 || errorMessage.includes('4001')) {
        errorMessage = 'Transaction failed (Error 4001): Invalid transaction amount or estimate. Please try a smaller amount.'
      }
      
      const detailedError = new Error(errorMessage)
      detailedError.name = error?.name || 'PetraApiError'
      // Preserve error code for better error handling
      if (error?.code) {
        (detailedError as any).code = error.code
      }
      throw detailedError
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
 * Tries new contract first, then falls back to old contract if token doesn't exist
 * Uses caching and retry logic to handle rate limits
 */
export async function getTokenBalance(
  creatorAddress: string,
  tokenId: string,
  accountAddress: string
): Promise<number> {
  // Convert tokenId string to hex-encoded bytes (Aptos expects hex string for vector<u8>)
  const tokenIdBytes = new TextEncoder().encode(tokenId)
  const tokenIdHex = '0x' + Array.from(tokenIdBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  // Check cache first (balance is per account, so include accountAddress in key)
  // Use normalized addresses to ensure cache key consistency
  const normalizedCreator = creatorAddress.toLowerCase().trim()
  const normalizedAccount = accountAddress.toLowerCase().trim()
  const normalizedTokenId = tokenId.trim()
  const cacheKey = `token_balance_${normalizedCreator}_${normalizedTokenId}_${normalizedAccount}`
  const cached = getCachedSupply(cacheKey)
  if (cached !== null) {
    console.log(`[getTokenBalance] Using cached value: ${cached} for ${normalizedAccount} (key: ${cacheKey})`)
    return cached
  }
  
  // Try new contract first
  try {
    const response = await fetchWithRetry(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${MODULE_ADDRESS}::creator_token::get_balance`,
        type_arguments: [],
        arguments: [creatorAddress, tokenIdHex, accountAddress]
      })
    }, 3, 1000) // 3 retries with 1s base delay

    if (response.ok) {
      const data = await response.json()
      const balance = parseInt(data[0] || '0', 10)
      console.log(`[getTokenBalance] Balance fetched: ${balance} tokens (new contract)`)
      setCachedSupply(cacheKey, balance)
      return balance
    }
    
    // If 400 error, check the error type
    if (response.status === 400) {
      const errorText = await response.text()
      let errorData: any = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        // Not JSON, use text as-is
      }
      
      // Check for specific error codes
      const isTokenNotFound = errorText.includes('E_TOKEN_NOT_FOUND') || 
                             errorText.includes('Failed to borrow global resource') ||
                             (errorData.get?.vm_error_code === 4016)
      
      if (isTokenNotFound) {
        // Token doesn't exist in new contract - try old contract only if it's a "not found" error
        console.warn(`⚠️ Token not found in new contract (${errorData.get?.vm_error_code || 'unknown'}), trying old contract...`)
        // Fall through to try old contract
      } else {
        // Other 400 error - don't try old contract, return 0
        console.error(`❌ Failed to fetch token balance: ${response.status} ${errorText}`)
        setCachedSupply(cacheKey, 0)
        return 0 // Return 0 instead of throwing for balance checks
      }
    } else if (response.status === 429) {
      // Rate limit - return cached value if available, otherwise return 0
      console.warn(`⚠️ Rate limit on new contract, skipping old contract to avoid more rate limits`)
      setCachedSupply(cacheKey, 0)
      return 0 // Return 0 to avoid more API calls
    } else {
      // Other error - return 0 instead of throwing
      console.error(`❌ Failed to fetch token balance: ${response.status}`)
      setCachedSupply(cacheKey, 0)
      return 0
    }
  } catch (error: any) {
    // If it's a rate limit, don't try old contract (avoid more rate limits)
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      console.warn(`⚠️ Rate limit hit, skipping old contract to avoid more rate limits`)
      setCachedSupply(cacheKey, 0)
      return 0
    } else if (error.message?.includes('E_TOKEN_NOT_FOUND') || error.message?.includes('4016')) {
      // Token not found - try old contract
      console.warn(`⚠️ Token not found error, trying old contract...`)
    } else {
      // Other error - return 0 instead of throwing
      console.error(`❌ Error fetching token balance: ${error.message}`)
      setCachedSupply(cacheKey, 0)
      return 0
    }
  }
  
  // Try old contract as fallback (only if new contract failed with "not found" error)
  // BUT: Skip if we got rate limited (to avoid more rate limits)
  try {
    const response = await fetchWithRetry(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${OLD_MODULE_ADDRESS}::creator_token::get_balance`,
        type_arguments: [],
        arguments: [creatorAddress, tokenIdHex, accountAddress]
      })
    }, 3, 1000) // 3 retries with 1s base delay

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: any = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        // Not JSON
      }
      
      // If old contract also says token not found, return 0 (token doesn't exist)
      if (errorText.includes('E_TOKEN_NOT_FOUND') || errorData.get?.vm_error_code === 4016) {
        console.warn(`⚠️ Token not found in old contract either. Token may not exist.`)
        setCachedSupply(cacheKey, 0)
        return 0
      }
      
      console.error(`❌ Failed to fetch token balance from old contract: ${response.status} ${errorText}`)
      throw new Error('Failed to fetch token balance from old contract')
    }

    const data = await response.json()
    const balance = parseInt(data[0] || '0', 10)
    console.log(`[getTokenBalance] Balance fetched: ${balance} tokens (old contract)`)
    setCachedSupply(cacheKey, balance)
    return balance
  } catch (error: any) {
    // If it's a token not found error, return 0 instead of throwing
    if (error.message?.includes('E_TOKEN_NOT_FOUND') || error.message?.includes('4016')) {
      console.warn(`⚠️ Token not found in both contracts. Returning 0 balance.`)
      setCachedSupply(cacheKey, 0)
      return 0
    }
    console.error('❌ Error getting token balance from both contracts:', error)
    return 0 // Return 0 instead of throwing for balance (it's OK if it fails)
  }
}

/**
 * Get current supply of a token
 * Tries new contract first, then falls back to old contract if token doesn't exist
 * Uses caching and retry logic to handle rate limits
 */
export async function getCurrentSupply(creatorAddress: string, tokenId: string): Promise<number> {
  const tokenIdHex = '0x' + Array.from(new TextEncoder().encode(tokenId)).map(b => b.toString(16).padStart(2, '0')).join('')
  
  // Check cache first (use normalized key)
  const normalizedCreator = creatorAddress.toLowerCase().trim()
  const normalizedTokenId = tokenId.trim()
  const cacheKey = `current_supply_${normalizedCreator}_${normalizedTokenId}`
  const cached = getCachedSupply(cacheKey)
  if (cached !== null) {
    console.log(`[getCurrentSupply] Using cached value: ${cached}`)
    return cached
  }
  
  // Try new contract first
  try {
    const response = await fetchWithRetry(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${MODULE_ADDRESS}::creator_token::get_current_supply`,
        type_arguments: [],
        arguments: [creatorAddress, tokenIdHex]
      })
    }, 3, 1000) // 3 retries with 1s base delay

    if (response.ok) {
      const data = await response.json()
      const supply = parseInt(data[0] || '0', 10)
      console.log(`[getCurrentSupply] Creator: ${creatorAddress}, Supply: ${supply} (new contract)`)
      setCachedSupply(cacheKey, supply)
      return supply
    }
    
    // If 400 error, check the error type
    if (response.status === 400) {
      const errorText = await response.text()
      let errorData: any = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        // Not JSON
      }
      
      const isTokenNotFound = errorText.includes('E_TOKEN_NOT_FOUND') || 
                             errorText.includes('Failed to borrow global resource') ||
                             (errorData.get?.vm_error_code === 4016)
      
      if (isTokenNotFound) {
        console.warn(`⚠️ Token not found in new contract, trying old contract...`)
        // Fall through to try old contract
      } else {
        throw new Error(`Failed to fetch current supply: ${response.status} ${errorData.get?.message || errorText}`)
      }
    } else if (response.status === 429) {
      // Rate limit - wait a bit longer and try old contract
      console.warn(`⚠️ Rate limit on new contract, trying old contract after delay...`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    } else {
      throw new Error(`Failed to fetch current supply: ${response.status}`)
    }
  } catch (error: any) {
    // If it's a rate limit or other error, try old contract as fallback
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      console.warn(`⚠️ Rate limit hit, trying old contract...`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  // Try old contract as fallback
  try {
    const response = await fetchWithRetry(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${OLD_MODULE_ADDRESS}::creator_token::get_current_supply`,
        type_arguments: [],
        arguments: [creatorAddress, tokenIdHex]
      })
    }, 3, 1000) // 3 retries with 1s base delay

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: any = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        // Not JSON
      }
      
      // If token not found in old contract too, return 0
      if (errorText.includes('E_TOKEN_NOT_FOUND') || errorData.get?.vm_error_code === 4016) {
        console.warn(`⚠️ Token not found in old contract either. Returning 0 supply.`)
        setCachedSupply(cacheKey, 0)
        return 0
      }
      
      console.error(`❌ Failed to fetch current supply from old contract: ${response.status} ${errorText}`)
      throw new Error(`Failed to fetch current supply: ${response.status}`)
    }

    const data = await response.json()
    const supply = parseInt(data[0] || '0', 10)
    console.log(`[getCurrentSupply] Creator: ${creatorAddress}, Supply: ${supply} (old contract)`)
    setCachedSupply(cacheKey, supply)
    return supply
  } catch (error: any) {
    // If it's a token not found error, return 0 instead of throwing
    if (error.message?.includes('E_TOKEN_NOT_FOUND') || error.message?.includes('4016')) {
      console.warn(`⚠️ Token not found in both contracts. Returning 0 current supply.`)
      setCachedSupply(cacheKey, 0)
      return 0
    }
    console.error('❌ Error getting current supply from both contracts:', error)
    throw error
  }
}

/**
 * Get total supply of a token
 * Tries new contract first, then falls back to old contract if token doesn't exist
 * Uses caching and retry logic to handle rate limits
 */
export async function getTotalSupply(creatorAddress: string, tokenId: string): Promise<number> {
  const tokenIdHex = '0x' + Array.from(new TextEncoder().encode(tokenId)).map(b => b.toString(16).padStart(2, '0')).join('')
  
  // Check cache first (use normalized key)
  const normalizedCreator = creatorAddress.toLowerCase().trim()
  const normalizedTokenId = tokenId.trim()
  const cacheKey = `total_supply_${normalizedCreator}_${normalizedTokenId}`
  const cached = getCachedSupply(cacheKey)
  if (cached !== null) {
    console.log(`[getTotalSupply] Using cached value: ${cached}`)
    return cached
  }
  
  // Try new contract first
  try {
    const response = await fetchWithRetry(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${MODULE_ADDRESS}::creator_token::get_total_supply`,
        type_arguments: [],
        arguments: [creatorAddress, tokenIdHex]
      })
    }, 3, 1000) // 3 retries with 1s base delay

    if (response.ok) {
      const data = await response.json()
      const totalSupply = parseInt(data[0] || '0', 10)
      console.log(`[getTotalSupply] Creator: ${creatorAddress}, Total Supply: ${totalSupply} (new contract)`)
      setCachedSupply(cacheKey, totalSupply)
      return totalSupply
    }
    
    // If 400 error, check the error type
    if (response.status === 400) {
      const errorText = await response.text()
      let errorData: any = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        // Not JSON
      }
      
      const isTokenNotFound = errorText.includes('E_TOKEN_NOT_FOUND') || 
                             errorText.includes('Failed to borrow global resource') ||
                             (errorData.get?.vm_error_code === 4016)
      
      if (isTokenNotFound) {
        console.warn(`⚠️ Token not found in new contract, trying old contract...`)
        // Fall through to try old contract
      } else {
        throw new Error(`Failed to fetch total supply: ${response.status} ${errorData.get?.message || errorText}`)
      }
    } else if (response.status === 429) {
      // Rate limit - wait a bit longer and try old contract
      console.warn(`⚠️ Rate limit on new contract, trying old contract after delay...`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    } else {
      throw new Error(`Failed to fetch total supply: ${response.status}`)
    }
  } catch (error: any) {
    // If it's a rate limit or other error, try old contract as fallback
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      console.warn(`⚠️ Rate limit hit, trying old contract...`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  // Try old contract as fallback
  try {
    const response = await fetchWithRetry(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${OLD_MODULE_ADDRESS}::creator_token::get_total_supply`,
        type_arguments: [],
        arguments: [creatorAddress, tokenIdHex]
      })
    }, 3, 1000) // 3 retries with 1s base delay

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: any = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        // Not JSON
      }
      
      // If token not found in old contract too, return 0
      if (errorText.includes('E_TOKEN_NOT_FOUND') || errorData.get?.vm_error_code === 4016) {
        console.warn(`⚠️ Token not found in old contract either. Returning 0 total supply.`)
        setCachedSupply(cacheKey, 0)
        return 0
      }
      
      console.error(`❌ Failed to fetch total supply from old contract: ${response.status} ${errorText}`)
      throw new Error(`Failed to fetch total supply: ${response.status}`)
    }

    const data = await response.json()
    const totalSupply = parseInt(data[0] || '0', 10)
    console.log(`[getTotalSupply] Creator: ${creatorAddress}, Total Supply: ${totalSupply} (old contract)`)
    setCachedSupply(cacheKey, totalSupply)
    return totalSupply
  } catch (error: any) {
    // If it's a token not found error, return 0 instead of throwing
    if (error.message?.includes('E_TOKEN_NOT_FOUND') || error.message?.includes('4016')) {
      console.warn(`⚠️ Token not found in both contracts. Returning 0 total supply.`)
      setCachedSupply(cacheKey, 0)
      return 0
    }
    console.error('❌ Error getting total supply from both contracts:', error)
    throw error
  }
}

/**
 * Get APT reserve for a token
 * Tries new contract first, then falls back to old contract if token doesn't exist
 * Uses caching and retry logic to handle rate limits
 */
export async function getAptReserve(creatorAddress: string, tokenId: string): Promise<number> {
  const tokenIdHex = '0x' + Array.from(new TextEncoder().encode(tokenId)).map(b => b.toString(16).padStart(2, '0')).join('')
  
  // Check cache first (use normalized key)
  const normalizedCreator = creatorAddress.toLowerCase().trim()
  const normalizedTokenId = tokenId.trim()
  const cacheKey = `apt_reserve_${normalizedCreator}_${normalizedTokenId}`
  const cached = getCachedSupply(cacheKey)
  if (cached !== null) {
    console.log(`[getAptReserve] Using cached value: ${cached}`)
    return cached
  }
  
  // Try new contract first
  try {
    const response = await fetchWithRetry(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${MODULE_ADDRESS}::creator_token::get_apt_reserve`,
        type_arguments: [],
        arguments: [creatorAddress, tokenIdHex]
      })
    }, 3, 1000) // 3 retries with 1s base delay

    if (response.ok) {
      const data = await response.json()
      // Convert octas to APT (1 APT = 100000000 octas)
      const octas = parseInt(data[0] || '0', 10)
      const aptReserve = octas / 100000000
      setCachedSupply(cacheKey, aptReserve)
      return aptReserve
    }
    
    // If 400 error, check the error type
    if (response.status === 400) {
      const errorText = await response.text()
      let errorData: any = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        // Not JSON
      }
      
      const isTokenNotFound = errorText.includes('E_TOKEN_NOT_FOUND') || 
                             errorText.includes('Failed to borrow global resource') ||
                             (errorData.get?.vm_error_code === 4016)
      
      if (isTokenNotFound) {
        console.warn(`⚠️ Token not found in new contract, trying old contract...`)
        // Fall through to try old contract
      } else {
        throw new Error(`Failed to fetch APT reserve: ${errorData.get?.message || errorText}`)
      }
    } else if (response.status === 429) {
      // Rate limit - wait a bit longer and try old contract
      console.warn(`⚠️ Rate limit on new contract, trying old contract after delay...`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    } else {
      throw new Error('Failed to fetch APT reserve')
    }
  } catch (error: any) {
    // If it's a rate limit or other error, try old contract as fallback
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      console.warn(`⚠️ Rate limit hit, trying old contract...`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  // Try old contract as fallback
  try {
    const response = await fetchWithRetry(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${OLD_MODULE_ADDRESS}::creator_token::get_apt_reserve`,
        type_arguments: [],
        arguments: [creatorAddress, tokenIdHex]
      })
    }, 3, 1000) // 3 retries with 1s base delay

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: any = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        // Not JSON
      }
      
      // If token not found in old contract too, return 0
      if (errorText.includes('E_TOKEN_NOT_FOUND') || errorData.get?.vm_error_code === 4016) {
        console.warn(`⚠️ Token not found in old contract either. Returning 0 reserve.`)
        setCachedSupply(cacheKey, 0)
        return 0
      }
      
      console.error(`❌ Failed to fetch APT reserve from old contract: ${response.status} ${errorText}`)
      throw new Error('Failed to fetch APT reserve from old contract')
    }

    const data = await response.json()
    // Convert octas to APT (1 APT = 100000000 octas)
    const octas = parseInt(data[0] || '0', 10)
    const aptReserve = octas / 100000000
    setCachedSupply(cacheKey, aptReserve)
    return aptReserve
  } catch (error) {
    console.error('❌ Error getting APT reserve from both contracts:', error)
    return 0 // Return 0 instead of throwing for reserve (it's OK if it fails)
  }
}

/**
 * Place a bet on a prediction market (send APTOS payment)
 * This sends APTOS to the prediction pool
 */
export async function placePredictionBet({
  bettor,
  petraWallet,
  recipientAddress, // Address to receive the bet (prediction pool or contract)
  amount, // APT amount to bet
  predictionId, // For transaction memo
  side // 'YES' or 'NO'
}: {
  bettor: string
  petraWallet: any
  recipientAddress: string
  amount: number // APT amount
  predictionId: string
  side: 'YES' | 'NO'
}): Promise<{ txId: string }> {
  return executeWithQueue(async () => {
    try {
      if (!petraWallet) {
        throw new Error('Petra wallet not connected')
      }

      // Convert APT to octas (1 APT = 100000000 octas)
      const amountOctas = Math.round(amount * 100000000)
      if (!Number.isSafeInteger(amountOctas) || amountOctas <= 0) {
        throw new Error(`Invalid bet amount: ${amount} APT`)
      }

      // Build transaction to transfer APT
      const transaction = {
        type: "entry_function_payload",
        function: "0x1::coin::transfer",
        type_arguments: ["0x1::aptos_coin::AptosCoin"],
        arguments: [
          recipientAddress,
          amountOctas.toString()
        ]
      }

      // Sign and submit transaction
      const response = await petraWallet.signAndSubmitTransaction({ payload: transaction })
      const txId = response.hash

      console.log(`✅ Prediction bet placed: ${side} ${amount} APTOS on ${predictionId}, TX: ${txId}`)

      // Wait for confirmation
      await waitForTransaction(txId)

      return { txId }
    } catch (error: any) {
      console.error('❌ Error placing prediction bet:', error)
      
      // Extract detailed error message
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
      if (errorMessage.includes('INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE')) {
        errorMessage = 'Insufficient APT balance for transaction fees. Please add more APT to your wallet.'
      } else if (errorMessage.includes('rejected') || errorMessage.includes('User rejected')) {
        errorMessage = 'Transaction was rejected. Please approve the transaction in your wallet.'
      } else if (error?.code === 4001 || errorMessage.includes('4001')) {
        errorMessage = 'Transaction failed (Error 4001): Invalid transaction. Please try again.'
      }
      
      const detailedError = new Error(errorMessage)
      detailedError.name = error?.name || 'PetraApiError'
      if (error?.code) {
        (detailedError as any).code = error.code
      }
      throw detailedError
    }
  })
}

/**
 * Get metadata address for a token
 * Uses retry logic to handle rate limits
 */
export async function getMetadataAddress(creatorAddress: string, tokenId: string): Promise<string> {
  const tokenIdHex = '0x' + Array.from(new TextEncoder().encode(tokenId)).map(b => b.toString(16).padStart(2, '0')).join('')
  
  // Try new contract first
  try {
    const response = await fetchWithRetry(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${MODULE_ADDRESS}::creator_token::get_metadata_address`,
        type_arguments: [],
        arguments: [creatorAddress, tokenIdHex]
      })
    }, 3, 1000) // 3 retries with 1s base delay

    if (response.ok) {
      const data = await response.json()
      // Extract object address from the response
      const metadataObj = data[0]
      if (typeof metadataObj === 'object' && metadataObj.inner) {
        return metadataObj.inner
      } else if (typeof metadataObj === 'string') {
        return metadataObj
      }
      return creatorAddress
    }
    
    // If 400 error, try old contract
    if (response.status === 400) {
      const errorText = await response.text()
      if (errorText.includes('Failed to borrow global resource')) {
        console.warn(`⚠️ Token not found in new contract, trying old contract...`)
        // Fall through to try old contract
      } else {
        throw new Error(`Failed to fetch metadata address: ${response.status}`)
      }
    } else if (response.status === 429) {
      // Rate limit - wait a bit longer and try old contract
      console.warn(`⚠️ Rate limit on new contract, trying old contract after delay...`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    } else {
      throw new Error(`Failed to fetch metadata address: ${response.status}`)
    }
  } catch (error: any) {
    // If it's a rate limit or other error, try old contract as fallback
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      console.warn(`⚠️ Rate limit hit, trying old contract...`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  // Try old contract as fallback
  try {
    const response = await fetchWithRetry(`${APTOS_NODE_URL}/v1/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: `${OLD_MODULE_ADDRESS}::creator_token::get_metadata_address`,
        type_arguments: [],
        arguments: [creatorAddress, tokenIdHex]
      })
    }, 3, 1000) // 3 retries with 1s base delay

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata address from old contract: ${response.status}`)
    }

    const data = await response.json()
    const metadataObj = data[0]
    if (typeof metadataObj === 'object' && metadataObj.inner) {
      return metadataObj.inner
    } else if (typeof metadataObj === 'string') {
      return metadataObj
    }
    return creatorAddress
  } catch (error) {
    console.error('❌ Error getting metadata address from both contracts:', error)
    throw error
  }
}

