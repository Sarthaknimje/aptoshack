/**
 * Post Service
 * Handles social media posts and feed
 */

const API_BASE = (import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || 'http://localhost:5001') + '/api'

export interface Post {
  postId: number
  creatorAddress: string
  tokenId: string
  contentType: 'text' | 'image' | 'video' | 'reel' | 'audio'
  shelbyBlobId?: string
  shelbyBlobUrl?: string
  title: string
  description: string
  isPremium: boolean
  minimumBalance: number
  likesCount: number
  commentsCount: number
  sharesCount: number
  viewsCount: number
  createdAt: string
  tokenName: string
  tokenSymbol: string
  tokenPrice: number
  marketCap: number
  creator: string
  thumbnail?: string
}

export interface CreatePostData {
  creatorAddress: string
  tokenId: string
  contentType: 'text' | 'image' | 'video' | 'reel' | 'audio'
  shelbyBlobId?: string
  shelbyBlobUrl?: string
  title: string
  description: string
  isPremium: boolean
  minimumBalance: number
}

export async function createPost(
  data: CreatePostData
): Promise<{ success: boolean; postId?: number; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/posts/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create post')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error creating post:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function getFeed(
  page: number = 1,
  limit: number = 20,
  contentType?: string,
  sortBy: 'latest' | 'trending' | 'popular' = 'latest'
): Promise<{ success: boolean; posts?: Post[]; hasMore?: boolean; error?: string }> {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sortBy
    })
    
    if (contentType && contentType !== 'all') {
      params.append('contentType', contentType)
    }
    
    const response = await fetch(`${API_BASE}/posts/feed?${params}`)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get feed')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error getting feed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function engageWithPost(
  postId: number,
  userAddress: string,
  type: 'like' | 'comment' | 'share' | 'view'
): Promise<{ success: boolean; increment?: number; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/posts/${postId}/engage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress,
        type
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to engage with post')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error engaging with post:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export interface Comment {
  id: number
  userAddress: string
  commentText: string
  shelbyBlobId?: string
  createdAt: string
}

export async function getComments(postId: number): Promise<{ success: boolean; comments?: Comment[]; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/posts/${postId}/comments`)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get comments')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error getting comments:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function createComment(
  postId: number,
  userAddress: string,
  commentText: string,
  shelbyBlobId?: string
): Promise<{ success: boolean; commentId?: number; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress,
        commentText,
        shelbyBlobId
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create comment')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error creating comment:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function getCreatorPosts(
  creatorAddress: string,
  page: number = 1,
  limit: number = 20
): Promise<{ success: boolean; posts?: Post[]; creator?: any; error?: string }> {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    })
    
    const response = await fetch(`${API_BASE}/creators/${creatorAddress}/posts?${params}`)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get creator posts')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error getting creator posts:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function deletePost(
  postId: number,
  creatorAddress: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creatorAddress })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete post')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error deleting post:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function deleteAllPosts(
  userAddress: string
): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/posts/delete-all`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAddress })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete all posts')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error deleting all posts:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

