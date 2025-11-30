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
    // Use backend verification for security (server-side check)
    // Note: blobUrl is optional for access checks
    const response = await fetch('http://localhost:5001/api/premium/access-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress,
        creatorAddress,
        tokenId,
        blobUrl: 'check-access-only', // Placeholder for validation (backend makes it optional)
        minimumBalance
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.hasAccess === true
    } else if (response.status === 403) {
      // Access denied - insufficient balance
      return false
    } else {
      // Fallback to frontend check if backend fails
      console.warn('Backend access check failed, falling back to frontend check')
      const { getTokenBalance } = await import('./petraWalletService')
      const balance = await getTokenBalance(creatorAddress, tokenId, userAddress)
      return balance >= minimumBalance
    }
  } catch (error) {
    console.error('Failed to check premium access:', error)
    // Fallback to frontend check
    try {
      const { getTokenBalance } = await import('./petraWalletService')
      const balance = await getTokenBalance(creatorAddress, tokenId, userAddress)
      return balance >= minimumBalance
    } catch (fallbackError) {
      console.error('Fallback access check also failed:', fallbackError)
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
    const response = await fetch('http://localhost:5001/api/premium/access-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress,
        creatorAddress,
        tokenId,
        blobUrl,
        minimumBalance
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get access token')
    }
    
    const data = await response.json()
    return {
      accessToken: data.accessToken,
      expiresAt: data.expiresAt
    }
  } catch (error) {
    console.error('Failed to get premium access token:', error)
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

