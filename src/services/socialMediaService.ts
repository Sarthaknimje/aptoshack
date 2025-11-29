/**
 * Multi-Platform Social Media Service
 * FREE - No API keys required! Uses web scraping for Instagram, Twitter, LinkedIn
 * YouTube still uses API (as requested)
 */

const API_BASE_URL = 'http://localhost:5001'

export interface SocialMediaContent {
  id: string
  platform: 'instagram' | 'twitter' | 'linkedin' | 'youtube'
  title: string
  description: string
  thumbnailUrl?: string
  url: string
  authorId?: string
  authorName: string
  createdAt: string
  engagement?: {
    likes?: number
    comments?: number
    shares?: number
    views?: number
  }
  // Ownership verification (for YouTube - checks if video belongs to connected channel)
  isOwned?: boolean
  ownershipMessage?: string
  connectedChannelId?: string
}

export interface ScrapeResult {
  success: boolean
  content?: SocialMediaContent
  error?: string
}

class SocialMediaService {
  /**
   * Scrape content from URL (Instagram, Twitter, LinkedIn)
   * FREE - No API keys required!
   */
  async scrapeContentFromUrl(
    url: string,
    platform?: 'instagram' | 'twitter' | 'linkedin' | 'youtube',
    claimedUsername?: string
  ): Promise<ScrapeResult> {
    try {
      // For YouTube, use the YouTube API endpoint instead of scraping
      if (platform === 'youtube') {
        const response = await fetch(`${API_BASE_URL}/api/youtube/video-info`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            url: url.trim()
          })
        })

        const data = await response.json()
        if (data.success && data.content) {
          // Convert YouTube API response to SocialMediaContent format
          // IMPORTANT: Include ownership verification from backend
          const isOwned = data.content.isOwned !== false && data.verified !== false
          
          return {
            success: true,
            content: {
              id: data.content.id,
              title: data.content.title,
              description: data.content.description,
              thumbnailUrl: data.content.thumbnail,
              url: data.content.url,
              platform: 'youtube',
              authorName: data.content.channelTitle,
              createdAt: data.content.publishedAt || new Date().toISOString(),
              engagement: {
                views: data.content.viewCount,
                likes: data.content.likeCount,
                comments: data.content.commentCount
              },
              // Ownership verification fields
              isOwned: isOwned,
              ownershipMessage: data.content.ownershipMessage || (isOwned ? 'You own this video.' : 'This video belongs to another channel.'),
              connectedChannelId: data.content.connectedChannelId
            },
            verification: {
              verified: isOwned,
              message: isOwned 
                ? '✅ YouTube video verified - you own this content' 
                : '❌ This video belongs to another channel. You can only tokenize your own content.'
            }
          } as any
    } else {
          return {
            success: false,
            error: data.error || 'Failed to fetch YouTube video'
          }
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/scrape-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          url: url.trim(),
          platform: platform?.toLowerCase(),
          username: claimedUsername?.trim()
        })
      })

      const data = await response.json()

      if (data.success && data.content) {
        const result: ScrapeResult = {
          success: true,
          content: {
            id: data.content.id,
            platform: data.content.platform,
            title: data.content.title,
            description: data.content.description,
            thumbnailUrl: data.content.thumbnailUrl,
            url: data.content.url,
            authorId: data.content.authorId,
            authorName: data.content.authorName,
            createdAt: data.content.createdAt,
            engagement: data.content.engagement
          }
        }
        
        // Include verification data if available
        if (data.verification) {
          (result as any).verification = data.verification
        }
        
        return result
      }
    
    return {
        success: false,
        error: data.error || 'Failed to scrape content'
    }
  } catch (error: any) {
      console.error('Error scraping content:', error)
      return {
        success: false,
        error: error.message || 'Network error'
      }
    }
  }

  /**
   * Verify content ownership through bio verification (strongest) or URL pattern matching
   * Bio verification: User adds a unique code to their profile bio to prove ownership
   */
  async verifyUrlOwnership(
    url: string,
    platform: 'instagram' | 'twitter' | 'linkedin',
    claimedUsername?: string,
    walletAddress?: string,
    verificationCode?: string
  ): Promise<{
    verified: boolean, 
    message: string, 
    requires_bio_verification?: boolean,
    verification_code?: string,
    url_username?: string
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/verify-ownership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          url: url.trim(),
          platform: platform.toLowerCase(),
          username: claimedUsername?.trim(),
          wallet_address: walletAddress,
          verification_code: verificationCode
        })
      })

      const data = await response.json()
      if (data.success) {
        return {
          verified: data.verified === true,
          message: data.message || (data.verified ? 'Ownership verified' : 'Ownership verification failed'),
          requires_bio_verification: data.requires_bio_verification,
          verification_code: data.verification_code,
          url_username: data.url_username
        }
      }
      return {
        verified: false,
        message: data.error || 'Verification failed'
      }
    } catch (error) {
      console.error('Error verifying ownership:', error)
      return {
        verified: false,
        message: 'Network error during verification'
      }
    }
  }

  /**
   * Detect platform from URL
   */
  detectPlatformFromUrl(url: string): 'instagram' | 'twitter' | 'linkedin' | 'youtube' | null {
    const lowerUrl = url.toLowerCase()
    
    if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagr.am')) {
      return 'instagram'
    } else if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
      return 'twitter'
    } else if (lowerUrl.includes('linkedin.com')) {
      return 'linkedin'
    } else if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
      return 'youtube'
    }
    
    return null
  }

  /**
   * Validate URL format
   */
  validateUrl(url: string, platform?: 'instagram' | 'twitter' | 'linkedin' | 'youtube'): boolean {
    try {
      const urlObj = new URL(url)
      
      if (platform) {
        const detected = this.detectPlatformFromUrl(url)
        return detected === platform
      }
      
      return ['instagram.com', 'instagr.am', 'twitter.com', 'x.com', 'linkedin.com', 'youtube.com', 'youtu.be'].some(
        domain => urlObj.hostname.includes(domain)
      )
    } catch {
      return false
    }
  }

  /**
   * Extract username from URL (for ownership verification)
   */
  extractUsernameFromUrl(url: string, platform: 'instagram' | 'twitter' | 'linkedin'): string | null {
    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split('/').filter(p => p)
      
      if (platform === 'instagram') {
        // Format: /username/reel/ABC123/ or /reel/ABC123/
        if (pathParts.length >= 1 && pathParts[0] !== 'reel') {
          return pathParts[0]
        }
      } else if (platform === 'twitter') {
        // Format: /username/status/123456 (works for both twitter.com and x.com)
        if (pathParts.length >= 1 && pathParts[0] !== 'status') {
          return pathParts[0]
        }
      } else if (platform === 'linkedin') {
        // Format: /in/username/posts/... or /posts/... or /feed/update/...
        const inIndex = pathParts.indexOf('in')
        if (inIndex >= 0 && pathParts.length > inIndex + 1) {
          return pathParts[inIndex + 1]
        }
        // Try to extract from posts URL: /posts/username_activity-123456
        const postsIndex = pathParts.indexOf('posts')
        if (postsIndex >= 0 && pathParts.length > postsIndex + 1) {
          const postPart = pathParts[postsIndex + 1]
          // Extract username from format like "username_activity-123456"
          const usernameMatch = postPart.match(/^([^_]+)_/)
          if (usernameMatch) {
            return usernameMatch[1]
          }
        }
      }
      
      return null
    } catch {
    return null
  }
}

  /**
   * Check YouTube authentication status (still uses API)
   */
  async checkYouTubeAuth(): Promise<{ isConnected: boolean; channelId?: string; channelTitle?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/youtube/status`, {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
    return {
          isConnected: data.authenticated || false,
          channelId: data.channel_id,
          channelTitle: data.channel_title
        }
    }
  } catch (error) {
      console.error('Error checking YouTube auth:', error)
    }

    return { isConnected: false }
  }
}

export const socialMediaService = new SocialMediaService()
export default socialMediaService
