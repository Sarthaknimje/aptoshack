/**
 * Python Backend Service Integration
 * Communicates with the Python Flask backend for real ASA creation
 */

import { YouTubeVideo } from './youtubeApi'

const API_BASE_URL = 'http://localhost:8000'

// Your mnemonic phrase (in production, this should be stored securely)
const MNEMONIC_PHRASE = "clean lend scan box absorb cancel legal wood frost dynamic frequent uphold cluster lake sibling luggage flat unfair runway pole physical receive foam above hat"

export interface VideoTokenInfo {
  appId: number
  assetId: number
  videoId: string
  videoTitle: string
  videoUrl: string
  totalSupply: number
  mintedSupply: number
  currentPrice: number
  creator: string
  transactionId: string
  assetName: string
  unitName: string
  url: string
  decimals: number
}

export interface CreateVideoTokenRequest {
  video_id: string
  video_title: string
  total_supply: number
}

class PythonBackendService {
  private appId: number

  constructor(appId: number = 123456) {
    this.appId = appId
  }

  /**
   * Convert mnemonic to private key and address
   */
  async convertMnemonic(mnemonicPhrase: string = MNEMONIC_PHRASE): Promise<{ privateKey: string; address: string }> {
    try {
      console.log('🔑 Converting mnemonic to private key...')
      
      const response = await fetch(`${API_BASE_URL}/convert-mnemonic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mnemonic: mnemonicPhrase })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to convert mnemonic')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to convert mnemonic')
      }

      console.log('✅ Mnemonic converted successfully')
      return {
        privateKey: result.private_key,
        address: result.address
      }

    } catch (error) {
      console.error('❌ Error converting mnemonic:', error)
      throw error
    }
  }

  /**
   * Create a real ASA for a video using Python backend
   */
  async createVideoToken(
    video: YouTubeVideo,
    totalSupply: number = 1000000
  ): Promise<VideoTokenInfo> {
    try {
      console.log('🎬 Creating video token using Python backend...')
      console.log('Video:', video.title)
      console.log('Total supply:', totalSupply)
      
      const request: CreateVideoTokenRequest = {
        video_id: video.id,
        video_title: video.title,
        total_supply: totalSupply
      }

      const response = await fetch(`${API_BASE_URL}/create-video-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create video token')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create video token')
      }

      const data = result.data
      console.log('✅ Video token created successfully:', data)

      const videoTokenInfo: VideoTokenInfo = {
        appId: this.appId,
        assetId: data.asset_id,
        videoId: data.video_id,
        videoTitle: data.video_title,
        videoUrl: data.video_url,
        totalSupply: data.total_supply,
        mintedSupply: data.minted_supply,
        currentPrice: data.current_price,
        creator: data.creator,
        transactionId: data.transaction_id,
        assetName: data.asset_name,
        unitName: data.unit_name,
        url: data.url,
        decimals: data.decimals
      }

      return videoTokenInfo

    } catch (error) {
      console.error('❌ Error creating video token:', error)
      throw error
    }
  }

  /**
   * Get token information for a video
   */
  async getTokenInfo(videoId: string): Promise<VideoTokenInfo | null> {
    try {
      console.log('📊 Getting token info for video:', videoId)
      
      const response = await fetch(`${API_BASE_URL}/get-token-info/${videoId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get token info')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get token info')
      }

      return result.data

    } catch (error) {
      console.error('❌ Error getting token info:', error)
      return null
    }
  }

  /**
   * Health check for the Python backend
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`)
      const result = await response.json()
      return result.status === 'healthy'
    } catch (error) {
      console.error('❌ Python backend health check failed:', error)
      return false
    }
  }
}

export const pythonBackendService = new PythonBackendService()
export default pythonBackendService
