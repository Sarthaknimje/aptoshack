import { useState, useCallback } from 'react'
import { youtubeApi, YouTubeChannel, YouTubeVideo } from '../services/youtubeApi'

// Placeholder type - will be replaced with Aptos token type
interface CreatedASA {
  assetId: number
  transactionId: string
  assetName: string
  unitName: string
  totalSupply: number
  decimals: number
  creator: string
  url: string
}

interface YouTubeDataState {
  channel: YouTubeChannel | null
  videos: YouTubeVideo[]
  isLoading: boolean
  error: string | null
  createdASAs: CreatedASA[]
}

export const useYouTubeData = () => {
  const [state, setState] = useState<YouTubeDataState>({
    channel: null,
    videos: [],
    isLoading: false,
    error: null,
    createdASAs: []
  })

  const connectChannel = useCallback(async (channelIdOrUsername: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      let channel: YouTubeChannel
      
      // Try to get channel by ID first, then by username
      if (channelIdOrUsername.startsWith('UC')) {
        channel = await youtubeApi.getChannelInfo(channelIdOrUsername)
      } else {
        channel = await youtubeApi.getChannelByUsername(channelIdOrUsername)
      }

      // Get recent videos
      const videos = await youtubeApi.getChannelVideos(channel.id, 10)

      setState(prev => ({
        ...prev,
        channel,
        videos,
        isLoading: false,
        error: null
      }))

      return { channel, videos }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to connect channel'
      }))
      throw error
    }
  }, [])

  const searchVideos = useCallback(async (query: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const videos = await youtubeApi.searchVideos(query, 20)
      
      setState(prev => ({
        ...prev,
        videos,
        isLoading: false,
        error: null
      }))

      return videos
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to search videos'
      }))
      throw error
    }
  }, [])

  const createVideoToken = useCallback(async (
    video: YouTubeVideo,
    creatorAddress: string,
    totalSupply: number = 1000000
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      // TODO: Implement with Aptos SDK
      // Placeholder - will create token on Aptos blockchain
      const createdASA: CreatedASA = {
        assetId: 0, // TODO: Get from Aptos transaction
        transactionId: '', // TODO: Get from Aptos transaction
        assetName: video.title,
        unitName: video.id.substring(0, 8).toUpperCase(),
        totalSupply,
        decimals: 0,
        creator: creatorAddress,
        url: `https://www.youtube.com/watch?v=${video.id}`
      }
      
      // TODO: Actually create token on Aptos
      throw new Error('Token creation not yet implemented with Aptos SDK')

      setState(prev => ({
        ...prev,
        createdASAs: [...prev.createdASAs, createdASA],
        isLoading: false,
        error: null
      }))

      return createdASA
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create video token'
      }))
      throw error
    }
  }, [])

  const getVideoInfo = useCallback(async (videoId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const video = await youtubeApi.getVideoInfo(videoId)
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null
      }))

      return video
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to get video info'
      }))
      throw error
    }
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    connectChannel,
    searchVideos,
    createVideoToken,
    getVideoInfo,
    clearError
  }
}
