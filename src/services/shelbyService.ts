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
      blobId: result.blobId,
      expirationDate: expirationDate,
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
    // Import getTokenBalance from petraWalletService
    const { getTokenBalance } = await import('./petraWalletService')
    
    const balance = await getTokenBalance(creatorAddress, tokenId, userAddress)
    return balance >= minimumBalance
  } catch (error) {
    console.error('Failed to check premium access:', error)
    return false
  }
}

/**
 * Create a premium content URL that can be used in iframe or video player
 * @param blobUrl - Shelby blob URL
 * @returns Direct URL to the content
 */
export function getPremiumContentUrl(blobUrl: string): string {
  // Shelby provides direct URLs for streaming
  return `${SHELBY_RPC_ENDPOINT}/blob/${blobUrl}`
}

