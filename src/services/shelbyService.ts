/**
 * Shelby Protocol Service
 * Handles uploading and downloading premium content to/from Shelby
 * Uses token gating to control access to premium content
 */

// Shelby network configuration
const SHELBY_RPC_ENDPOINT = import.meta.env.VITE_SHELBY_RPC_ENDPOINT || 'https://api.shelbynet.shelby.xyz/shelby'
const SHELBY_NETWORK = import.meta.env.VITE_SHELBY_NETWORK || 'shelbynet'

// For now, we'll use REST API directly since SDK has dependency conflicts
// In production, you can use the Shelby CLI or SDK with proper setup

/**
 * Upload premium content to Shelby via backend
 * The backend will handle the actual Shelby upload using the CLI
 * @param file - File to upload (File object or Blob)
 * @param blobName - Name/path for the blob in Shelby
 * @param expirationDays - Number of days until expiration (default: 365)
 * @returns Blob URL and metadata
 */
export async function uploadPremiumContent(
  file: File | Blob,
  blobName: string,
  expirationDays: number = 365
): Promise<{ blobUrl: string; blobId: string; expirationDate: Date }> {
  try {
    // Calculate expiration date
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + expirationDays)

    // Convert file to FormData
    const formData = new FormData()
    formData.append('file', file)
    formData.append('blobName', blobName)
    formData.append('expiration', expirationDate.toISOString())

    // Upload via backend API
    const response = await fetch('http://localhost:5001/api/shelby/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to upload premium content')
    }

    const result = await response.json()
    return {
      blobUrl: result.blobUrl || result.blobId,
      blobId: result.blobId || result.blobName,
      blobName: result.blobName,
      accountAddress: result.accountAddress,
      transactionHash: result.transactionHash,
      expirationDate: result.expirationDate ? new Date(result.expirationDate) : expirationDate,
      explorerUrl: result.explorerUrl,
      aptosExplorerUrl: result.aptosExplorerUrl,
    }
  } catch (error) {
    console.error('Failed to upload premium content to Shelby:', error)
    throw new Error(`Failed to upload premium content: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Download premium content from Shelby via backend
 * @param blobUrl - URL or ID of the blob in Shelby
 * @returns Blob data
 */
export async function downloadPremiumContent(blobUrl: string): Promise<Blob> {
  try {
    // Download via backend API
    const response = await fetch(`http://localhost:5001/api/shelby/download?blobUrl=${encodeURIComponent(blobUrl)}`)
    
    if (!response.ok) {
      throw new Error('Failed to download premium content')
    }

    const blob = await response.blob()
    return blob
  } catch (error) {
    console.error('Failed to download premium content from Shelby:', error)
    throw new Error(`Failed to download premium content: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get blob metadata from Shelby
 * @param blobUrl - URL or ID of the blob
 * @returns Blob metadata
 */
export async function getBlobMetadata(blobUrl: string): Promise<any> {
  try {
    const response = await fetch(`http://localhost:5001/api/shelby/metadata?blobUrl=${encodeURIComponent(blobUrl)}`)
    
    if (!response.ok) {
      throw new Error('Failed to get blob metadata')
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to get blob metadata from Shelby:', error)
    throw error
  }
}

/**
 * Check if user has access to premium content based on token balance
 * Uses backend verification for security
 * @param userAddress - User's wallet address
 * @param creatorAddress - Token creator's address
 * @param tokenId - Token ID (content_id)
 * @param minimumBalance - Minimum token balance required (default: 1)
 * @returns true if user has access, false otherwise
 */
export async function checkPremiumAccess(
  userAddress: string,
  creatorAddress: string,
  tokenId: string,
  minimumBalance: number = 1
): Promise<boolean> {
  try {
    console.log(`[checkPremiumAccess] Checking access: user=${userAddress.slice(0, 10)}..., creator=${creatorAddress.slice(0, 10)}..., tokenId=${String(tokenId).slice(0, 20)}...`)
    
    // Use backend verification for security (server-side check)
    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
    
    try {
      const response = await fetch('http://localhost:5001/api/premium/access-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          creatorAddress,
          tokenId: String(tokenId), // Ensure tokenId is string
          blobUrl: 'check-access-only', // Placeholder for validation (backend makes it optional)
          minimumBalance
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        // Check both hasAccess field and success field (backend may return either)
        const hasAccess = data.hasAccess === true || (data.success === true && data.hasAccess !== false)
        console.log(`[checkPremiumAccess] Backend check result: ${hasAccess} (response: ${JSON.stringify(data)})`)
        return hasAccess
      } else if (response.status === 403) {
        // Access denied - insufficient balance
        console.log(`[checkPremiumAccess] Access denied (403) - insufficient balance`)
        return false
      } else {
        // Backend error - fallback to frontend check
        const errorText = await response.text().catch(() => 'Unknown error')
        console.warn(`[checkPremiumAccess] Backend check failed (${response.status}): ${errorText}, falling back to frontend check`)
        const { getTokenBalance } = await import('./petraWalletService')
        const balance = await getTokenBalance(creatorAddress, String(tokenId), userAddress)
        const hasAccess = balance >= minimumBalance
        console.log(`[checkPremiumAccess] Frontend check result: ${hasAccess} (balance: ${balance}, minimum: ${minimumBalance})`)
        return hasAccess
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        console.warn('[checkPremiumAccess] Request timeout, falling back to frontend check')
      } else {
        console.warn(`[checkPremiumAccess] Backend request failed: ${fetchError.message}, falling back to frontend check`)
      }
      
      // Fallback to frontend check
      const { getTokenBalance } = await import('./petraWalletService')
      const balance = await getTokenBalance(creatorAddress, String(tokenId), userAddress)
      const hasAccess = balance >= minimumBalance
      console.log(`[checkPremiumAccess] Frontend check result: ${hasAccess} (balance: ${balance}, minimum: ${minimumBalance})`)
      return hasAccess
    }
  } catch (error) {
    console.error('[checkPremiumAccess] Error checking premium access:', error)
    // Final fallback to frontend check
    try {
      const { getTokenBalance } = await import('./petraWalletService')
      const balance = await getTokenBalance(creatorAddress, String(tokenId), userAddress)
      const hasAccess = balance >= minimumBalance
      console.log(`[checkPremiumAccess] Final fallback result: ${hasAccess} (balance: ${balance}, minimum: ${minimumBalance})`)
      return hasAccess
    } catch (fallbackError) {
      console.error('[checkPremiumAccess] Fallback access check also failed:', fallbackError)
      return false
    }
  }
}

/**
 * Get secure access token for premium content
 * This token is time-limited and verified by the backend
 * @param userAddress - User's wallet address
 * @param creatorAddress - Token creator's address
 * @param tokenId - Token ID (content_id)
 * @param blobUrl - Shelby blob URL
 * @param minimumBalance - Minimum token balance required (default: 1)
 * @returns Access token and expiration time
 */
export async function getPremiumAccessToken(
  userAddress: string,
  creatorAddress: string,
  tokenId: string,
  blobUrl: string,
  minimumBalance: number = 1
): Promise<{ accessToken: string; expiresAt: string } | null> {
  try {
    console.log(`[getPremiumAccessToken] Requesting access token: user=${userAddress.slice(0, 10)}..., tokenId=${String(tokenId).slice(0, 20)}...`)
    
    // Add timeout protection
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
    
    try {
      const response = await fetch('http://localhost:5001/api/premium/access-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          creatorAddress,
          tokenId: String(tokenId), // Ensure tokenId is string
          blobUrl,
          minimumBalance
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        const errorMsg = errorData.error || `Failed to get access token: ${response.status}`
        console.error(`[getPremiumAccessToken] Access denied: ${errorMsg}`)
        throw new Error(errorMsg)
      }
      
      const data = await response.json()
      if (data.accessToken && data.expiresAt) {
        console.log(`[getPremiumAccessToken] ✅ Access token issued (expires: ${data.expiresAt})`)
        return {
          accessToken: data.accessToken,
          expiresAt: data.expiresAt
        }
      } else {
        throw new Error('Invalid access token response')
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout - please try again')
      }
      throw fetchError
    }
  } catch (error: any) {
    console.error('[getPremiumAccessToken] Failed to get premium access token:', error)
    return null
  }
}

/**
 * Create a secure premium content URL that requires access verification
 * Uses backend proxy for security - verifies token balance on every request
 * @param blobUrl - Shelby blob URL, blob ID, or full URL
 * @param accessToken - Time-limited access token from backend
 * @returns Secure URL that proxies through backend
 */
export function getPremiumContentUrl(blobUrl: string, accessToken?: string): string {
  // If access token is provided, use secure backend proxy
  if (accessToken) {
    return `http://localhost:5001/api/premium/content?token=${encodeURIComponent(accessToken)}`
  }
  
  // Fallback to direct URL (less secure, but for backwards compatibility)
  // If it's already a full URL, return it as-is
  if (blobUrl.startsWith('http://') || blobUrl.startsWith('https://')) {
    return blobUrl
  }
  
  // If it's a shelby:// protocol URL, convert it
  if (blobUrl.startsWith('shelby://')) {
    const blobName = blobUrl.replace('shelby://', '')
    return `${SHELBY_RPC_ENDPOINT}/v1/blobs/${blobName}`
  }
  
  // If it contains a blob ID and name (format: blobId/blobName or account_address/blobName)
  if (blobUrl.includes('/')) {
    return `${SHELBY_RPC_ENDPOINT}/v1/blobs/${blobUrl}`
  }
  
  // Otherwise, assume it's just a blob name and construct URL
  return `${SHELBY_RPC_ENDPOINT}/v1/blobs/${blobUrl}`
}

