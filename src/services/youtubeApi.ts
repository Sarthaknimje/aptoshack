const YOUTUBE_API_KEY = 'AIzaSyBYVrcI-3CGBzVQplilpDT0oEmjL7Xl5gk'
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

export interface YouTubeChannel {
  id: string
  title: string
  description: string
  thumbnail: string
  subscriberCount: number
  videoCount: number
  viewCount: number
  customUrl?: string
}

export interface YouTubeVideo {
  id: string
  title: string
  description: string
  thumbnail: string
  publishedAt: string
  viewCount: number
  likeCount: number
  duration: string
  channelId: string
  channelTitle: string
}

export interface YouTubePlaylist {
  id: string
  title: string
  description: string
  thumbnail: string
  itemCount: number
  channelId: string
}

class YouTubeApiService {
  private async makeRequest(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`${YOUTUBE_API_BASE}${endpoint}`)
    url.searchParams.set('key', YOUTUBE_API_KEY)
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  }

  async getChannelInfo(channelId: string): Promise<YouTubeChannel> {
    const data = await this.makeRequest('/channels', {
      part: 'snippet,statistics,contentDetails',
      id: channelId
    })

    if (!data.items || data.items.length === 0) {
      throw new Error('Channel not found')
    }

    const channel = data.items[0]
    return {
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      thumbnail: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default?.url,
      subscriberCount: parseInt(channel.statistics.subscriberCount || '0'),
      videoCount: parseInt(channel.statistics.videoCount || '0'),
      viewCount: parseInt(channel.statistics.viewCount || '0'),
      customUrl: channel.snippet.customUrl
    }
  }

  async getChannelByUsername(username: string): Promise<YouTubeChannel> {
    const data = await this.makeRequest('/channels', {
      part: 'snippet,statistics,contentDetails',
      forUsername: username
    })

    if (!data.items || data.items.length === 0) {
      throw new Error('Channel not found')
    }

    const channel = data.items[0]
    return {
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      thumbnail: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default?.url,
      subscriberCount: parseInt(channel.statistics.subscriberCount || '0'),
      videoCount: parseInt(channel.statistics.videoCount || '0'),
      viewCount: parseInt(channel.statistics.viewCount || '0'),
      customUrl: channel.snippet.customUrl
    }
  }

  async getChannelVideos(channelId: string, maxResults: number = 10): Promise<YouTubeVideo[]> {
    // First get the uploads playlist
    const channelData = await this.makeRequest('/channels', {
      part: 'contentDetails',
      id: channelId
    })

    if (!channelData.items || channelData.items.length === 0) {
      throw new Error('Channel not found')
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads

    // Get videos from uploads playlist
    const playlistData = await this.makeRequest('/playlistItems', {
      part: 'snippet,contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: maxResults.toString()
    })

    if (!playlistData.items || playlistData.items.length === 0) {
      return []
    }

    // Get video details
    const videoIds = playlistData.items.map((item: any) => item.contentDetails.videoId).join(',')
    const videosData = await this.makeRequest('/videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoIds
    })

    return videosData.items.map((video: any) => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
      publishedAt: video.snippet.publishedAt,
      viewCount: parseInt(video.statistics.viewCount || '0'),
      likeCount: parseInt(video.statistics.likeCount || '0'),
      duration: video.contentDetails.duration,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle
    }))
  }

  async searchVideos(query: string, maxResults: number = 10): Promise<YouTubeVideo[]> {
    const data = await this.makeRequest('/search', {
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: maxResults.toString(),
      order: 'relevance'
    })

    if (!data.items || data.items.length === 0) {
      return []
    }

    const videoIds = data.items.map((item: any) => item.id.videoId).join(',')
    const videosData = await this.makeRequest('/videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoIds
    })

    return videosData.items.map((video: any) => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
      publishedAt: video.snippet.publishedAt,
      viewCount: parseInt(video.statistics.viewCount || '0'),
      likeCount: parseInt(video.statistics.likeCount || '0'),
      duration: video.contentDetails.duration,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle
    }))
  }

  async getVideoInfo(videoId: string): Promise<YouTubeVideo> {
    const data = await this.makeRequest('/videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoId
    })

    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found')
    }

    const video = data.items[0]
    return {
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
      publishedAt: video.snippet.publishedAt,
      viewCount: parseInt(video.statistics.viewCount || '0'),
      likeCount: parseInt(video.statistics.likeCount || '0'),
      duration: video.contentDetails.duration,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle
    }
  }
}

export const youtubeApi = new YouTubeApiService()
