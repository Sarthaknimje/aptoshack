// Petra wallet uses window.aptos - no import needed
// Aptos testnet API endpoint
const APTOS_NODE_URL = 'https://fullnode.testnet.aptoslabs.com'

// Transaction queue to prevent multiple simultaneous transactions
let transactionInProgress = false
const transactionQueue: Array<() => Promise<any>> = []

async function executeWithQueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const execute = async () => {
      if (transactionInProgress) {
        // Wait for current transaction to complete
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
        // Process next transaction in queue
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
 * Helper function to convert string to Uint8Array
 */
function stringToUint8Array(str: string): Uint8Array {
  return new Uint8Array(Buffer.from(str, 'utf-8'))
}

/**
 * Create Aptos Fungible Asset (FA) token using Petra Wallet
 * This function calls the Move contract to create a new FA token
 */
export async function createASAWithPetra({
  sender,           // User's Aptos address
  petraWallet,       // Petra Wallet instance
  assetName,
  unitName,
  totalSupply,
  decimals = 0,
  url = '',
  manager = '',
  reserve = '',
  freeze = '',
  clawback = ''
}: {
  sender: string
  petraWallet: any // Petra wallet from window.aptos
  assetName: string
  unitName: string
  totalSupply: number
  decimals?: number
  url?: string
  manager?: string
  reserve?: string
  freeze?: string
  clawback?: string
}): Promise<{ txId: string; assetId: string }> {
  return executeWithQueue(async () => {
    try {
      if (!petraWallet) {
        throw new Error('Petra wallet not connected')
      }

      // Ensure totalSupply is a safe integer
      const safeTotalSupply = Math.round(totalSupply)
      if (!Number.isSafeInteger(safeTotalSupply)) {
        throw new Error(`Total supply ${totalSupply} is not a safe integer`)
      }
      if (safeTotalSupply <= 0) {
        throw new Error(`Total supply must be greater than 0`)
      }

      // Get the module address (deployed contract address)
      // Contract is deployed at: 0x9f3074e3274423b1312330ec60c4257e7ccb44d88aac8f53eeb3fe6a5d8b02ba
      const moduleAddress = "0x9f3074e3274423b1312330ec60c4257e7ccb44d88aac8f53eeb3fe6a5d8b02ba"

      // Build the transaction payload to call initialize function
      // Move contract expects: name: vector<u8>, symbol: vector<u8>, decimals: u8, total_supply: u64, icon_uri: vector<u8>, project_uri: vector<u8>
      const transaction = {
        type: "entry_function_payload",
        function: `${moduleAddress}::creator_token::initialize`,
        type_arguments: [],
        arguments: [
          Array.from(new TextEncoder().encode(assetName)), // Convert string to vector<u8>
          Array.from(new TextEncoder().encode(unitName.toUpperCase())), // Convert string to vector<u8>
          decimals,
          safeTotalSupply.toString(),
          Array.from(new TextEncoder().encode(url || "")), // Convert string to vector<u8>
          Array.from(new TextEncoder().encode(url || "")) // Convert string to vector<u8>
        ]
      }

      // Sign and submit transaction using Petra wallet
      const response = await petraWallet.signAndSubmitTransaction(transaction)
      const txId = response.hash

      console.log(`✅ FA token creation transaction submitted: ${txId}`)

      // Wait for transaction confirmation by polling
      let confirmed = false
      let attempts = 0
      const maxAttempts = 30
      
      while (!confirmed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        try {
          const txResponse = await fetch(`${APTOS_NODE_URL}/v1/transactions/by_hash/${txId}`)
          if (txResponse.ok) {
            const txData = await txResponse.json()
            if (txData.type === 'user_transaction' && txData.success) {
              confirmed = true
              
              // Extract metadata object address from transaction events
              // Look for object creation events
              let metadataAddress = null
              if (txData.events) {
                for (const event of txData.events) {
                  if (event.type?.includes('ObjectCreated') || event.data?.object_id) {
                    metadataAddress = event.data?.object_id || event.data?.address
                    break
                  }
                }
              }
              
              // If not found in events, use deterministic address based on symbol
              if (!metadataAddress) {
                // The metadata object is created with create_named_object using the symbol
                // For now, we'll construct a placeholder that the backend can use
                metadataAddress = `${sender}::${unitName.toUpperCase()}`
              }
              
              console.log(`✅ FA token created with metadata address: ${metadataAddress}`)
              return { txId, assetId: metadataAddress }
            }
          }
        } catch (e) {
          console.warn(`Transaction check attempt ${attempts + 1} failed:`, e)
        }
        attempts++
      }
      
      if (!confirmed) {
        throw new Error('Transaction confirmation timeout. Please check the transaction on Aptos Explorer.')
      }
      
      // Fallback return (should not reach here)
      return { txId, assetId: `${sender}::${unitName.toUpperCase()}` }
    } catch (error: any) {
      console.error('❌ Error creating FA token:', error)
      
      // Handle network mismatch error
      if (error?.message?.includes('Network mismatch') || error?.message?.includes('different networks')) {
        const networkError = new Error('Network Mismatch: Please ensure your Petra Wallet is set to TESTNET. Go to Petra Wallet Settings and switch to Testnet, then try again.')
        networkError.name = 'NetworkMismatchError'
        throw networkError
      }
      
      throw error
    }
  })
}

/**
 * Transfer ASA tokens using Petra Wallet
 * Opens Petra Wallet popup for user to sign transaction
 */
export async function transferASAWithPetra({
  sender,           // User's Aptos address
  petraWallet,       // Petra Wallet instance
  receiver,         // Recipient address
  assetId,          // ASA ID to transfer
  amount            // Amount to transfer
}: {
  sender: string
  petraWallet: any // Petra wallet from window.aptos
  receiver: string
  assetId: number
  amount: number
}): Promise<string> {
  return executeWithQueue(async () => {
    try {
      // 1️⃣ Get transaction params
      const params = await algodClient.getTransactionParams().do()

      // 2️⃣ Create asset transfer transaction
    // Ensure amount is a safe integer (tokens must be whole numbers)
    const tokenAmount = Math.floor(amount)
    if (!Number.isSafeInteger(tokenAmount)) {
      throw new Error(`Token amount ${amount} is not a safe integer. Please use a whole number.`)
    }
    if (tokenAmount <= 0) {
      throw new Error(`Token amount must be greater than 0`)
    }
    
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: sender,
      suggestedParams: params,
      receiver: receiver,
      amount: tokenAmount,
      assetIndex: assetId
    })

    // 3️⃣ Sign with Petra Wallet
    const singleTxnGroups = [{
      txn: txn,
      signers: [sender]
    }]

    const signedTxn = await petraWallet.signTransaction([singleTxnGroups])
    const signedTxnBlob = signedTxn[0]

    // 4️⃣ Send to blockchain
    const response = await algodClient.sendRawTransaction(signedTxnBlob).do()
    const txId = response.txId || txn.txID()

      console.log(`✅ Asset transfer transaction submitted: ${txId}`)
      return txId
    } catch (error: any) {
      console.error('❌ Error transferring ASA:', error)
      
      // Handle network mismatch error
      if (error?.message?.includes('Network mismatch') || error?.message?.includes('different networks')) {
        const networkError = new Error('Network Mismatch: Please ensure your Petra Wallet is set to TESTNET. Go to Petra Wallet Settings and switch to Testnet, then try again.')
        networkError.name = 'NetworkMismatchError'
        throw networkError
      }
      
      throw error
    }
  })
}

/**
 * Opt-in to ASA (required before receiving tokens)
 * Opens Petra Wallet popup for user to sign transaction
 */
export async function optInToASAWithPetra({
  sender,           // User's Aptos address
  petraWallet,       // Petra Wallet instance
  assetId           // ASA ID to opt-in
}: {
  sender: string
  petraWallet: any // Petra wallet from window.aptos
  assetId: number
}): Promise<string> {
  return executeWithQueue(async () => {
    try {
      // 1️⃣ Get transaction params
      const params = await algodClient.getTransactionParams().do()

      // 2️⃣ Create opt-in transaction (transfer 0 amount to self)
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: sender,
      suggestedParams: params,
      receiver: sender,  // Transfer to self
      amount: 0,         // Zero amount for opt-in
      assetIndex: assetId
    })

    // 3️⃣ Sign with Petra Wallet
    const singleTxnGroups = [{
      txn: txn,
      signers: [sender]
    }]

    const signedTxn = await petraWallet.signTransaction([singleTxnGroups])
    const signedTxnBlob = signedTxn[0]

    // 4️⃣ Send to blockchain
    const response = await algodClient.sendRawTransaction(signedTxnBlob).do()
    const txId = response.txId || txn.txID()

      console.log(`✅ Opt-in transaction submitted: ${txId}`)
      return txId
    } catch (error: any) {
      console.error('❌ Error opting in to ASA:', error)
      
      // Handle network mismatch error
      if (error?.message?.includes('Network mismatch') || error?.message?.includes('different networks')) {
        const networkError = new Error('Network Mismatch: Please ensure your Petra Wallet is set to TESTNET. Go to Petra Wallet Settings and switch to Testnet, then try again.')
        networkError.name = 'NetworkMismatchError'
        throw networkError
      }
      
      throw error
    }
  })
}

/**
 * Send APTOS payment using Petra Wallet
 * Opens Petra Wallet popup for user to sign transaction
 */
export async function sendAlgoPaymentWithPetra({
  sender,           // User's Aptos address
  petraWallet,       // Petra Wallet instance
  receiver,         // Recipient address
  amount            // Amount in Algos (will be converted to microAlgos)
}: {
  sender: string
  petraWallet: any // Petra wallet from window.aptos
  receiver: string
  amount: number
}): Promise<string> {
  return executeWithQueue(async () => {
    try {
      // Get account info to check balance
      const accountInfo = await algodClient.accountInformation(sender).do()
      const currentBalance = accountInfo.amount || 0
    
      // Aptos minimum balance requirements:
      // - Base minimum: 100,000 microAlgos (0.1 APTOS)
      // - Per asset: 100,000 microAlgos (0.1 APTOS)
      // - Transaction fee: 1,000 microAlgos (0.001 APTOS)
      const numAssets = accountInfo.assets?.length || 0
      const minBalance = 100_000 + (numAssets * 100_000) // Base + per asset
      const transactionFee = 1_000
      const requiredBalance = minBalance + transactionFee
      
      // Validate amount
      if (!amount || isNaN(amount) || amount <= 0) {
        throw new Error(`Invalid amount: ${amount} APTOS. Amount must be greater than 0.`)
      }
      
      // Convert Algos to microAlgos and ensure it's a safe integer
      const microAlgos = Math.round(amount * 1000000)
      if (!Number.isSafeInteger(microAlgos)) {
        throw new Error(`Amount ${amount} APTOS results in unsafe integer: ${microAlgos}. Please use a smaller amount.`)
      }
      if (microAlgos <= 0) {
        throw new Error(`Amount must be greater than 0. Received: ${amount} APTOS (${microAlgos} microAlgos)`)
      }
      
      // Check if account has sufficient balance (including minimum balance requirement)
      if (currentBalance < microAlgos + requiredBalance) {
        const needed = (microAlgos + requiredBalance - currentBalance) / 1_000_000
        throw new Error(
          `Insufficient balance! You need ${(microAlgos / 1_000_000).toFixed(4)} APTOS for payment ` +
          `plus ${(requiredBalance / 1_000_000).toFixed(4)} APTOS for minimum balance (${numAssets} assets). ` +
          `You need ${needed.toFixed(4)} more APTOS. Current balance: ${(currentBalance / 1_000_000).toFixed(4)} APTOS.`
        )
      }
      
      // 1️⃣ Get transaction params
      const params = await algodClient.getTransactionParams().do()

      // 2️⃣ Create payment transaction
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: sender,
        suggestedParams: params,
        receiver: receiver,
        amount: microAlgos
      })

      // 3️⃣ Sign with Petra Wallet
      const singleTxnGroups = [{
        txn: txn,
        signers: [sender]
      }]

      const signedTxn = await petraWallet.signTransaction([singleTxnGroups])
      const signedTxnBlob = signedTxn[0]

      // 4️⃣ Send to blockchain
      const response = await algodClient.sendRawTransaction(signedTxnBlob).do()
      const txId = response.txId || txn.txID()

      console.log(`✅ Payment transaction submitted: ${txId}`)
      return txId
    } catch (error: any) {
      console.error('❌ Error sending payment:', error)
      
      // Handle network mismatch error
      if (error?.message?.includes('Network mismatch') || error?.message?.includes('different networks')) {
        const networkError = new Error('Network Mismatch: Please ensure your Petra Wallet is set to TESTNET. Go to Petra Wallet Settings and switch to Testnet, then try again.')
        networkError.name = 'NetworkMismatchError'
        throw networkError
      }
      
      throw error
    }
  })
}

/**
 * Get asset information from blockchain
 */
export async function getAssetInfo(assetId: number) {
  try {
    const assetInfo = await algodClient.getAssetByID(assetId).do()
    return assetInfo
  } catch (error) {
    console.error('❌ Error fetching asset info:', error)
    throw error
  }
}

/**
 * Get transaction ID from asset creation transaction
 */
export async function getAssetIdFromTransaction(txId: string): Promise<number> {
  try {
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4)
    const assetId = confirmedTxn['asset-index']
    return assetId
  } catch (error) {
    console.error('❌ Error getting asset ID:', error)
    throw error
  }
}

