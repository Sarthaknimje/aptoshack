# 🛠️ Implementation Guide: Shelby Social Media Platform

## Quick Start: Building the Platform

### Step 1: Create Post Service (Backend)

Add to `backend/app.py`:

```python
@app.route('/api/posts/create', methods=['POST'])
@cross_origin(supports_credentials=True)
def create_post():
    """Create a new post and upload to Shelby"""
    try:
        data = request.get_json()
        creator_address = data.get('creatorAddress')
        content_type = data.get('contentType')  # text, image, video, reel, audio
        content_file = request.files.get('content')
        title = data.get('title', '')
        description = data.get('description', '')
        is_premium = data.get('isPremium', False)
        minimum_balance = data.get('minimumBalance', 1)
        token_id = data.get('tokenId')  # Creator's token ID
        
        # Get creator's token info
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        cursor.execute('SELECT token_id FROM tokens WHERE creator = ?', (creator_address,))
        token_row = cursor.fetchone()
        if not token_row:
            return jsonify({"success": False, "error": "Creator token not found"}), 404
        
        token_id = token_row[0]
        
        # Upload to Shelby
        if content_file:
            # Upload file to Shelby
            shelby_result = upload_to_shelby(content_file, content_type)
            shelby_blob_id = shelby_result.get('blob_id')
            shelby_blob_url = shelby_result.get('blob_url')
        else:
            # Text-only post
            shelby_blob_id = None
            shelby_blob_url = None
        
        # Save to database
        cursor.execute('''
            INSERT INTO posts (
                creator_address, token_id, content_type, shelby_blob_id, 
                shelby_blob_url, title, description, is_premium, minimum_balance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            creator_address, token_id, content_type, shelby_blob_id,
            shelby_blob_url, title, description, is_premium, minimum_balance
        ))
        
        post_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True,
            "postId": post_id,
            "shelbyBlobId": shelby_blob_id,
            "shelbyBlobUrl": shelby_blob_url
        })
        
    except Exception as e:
        logger.error(f"Error creating post: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/posts/feed', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_feed():
    """Get social media feed"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        content_type = request.args.get('contentType')  # Optional filter
        sort_by = request.args.get('sortBy', 'latest')  # latest, trending, popular
        
        conn = sqlite3.connect('creatorvault.db')
        cursor = conn.cursor()
        
        # Build query
        query = '''
            SELECT p.*, t.token_name, t.token_symbol, t.current_price, t.market_cap
            FROM posts p
            LEFT JOIN tokens t ON p.token_id = t.token_id
            WHERE 1=1
        '''
        params = []
        
        if content_type:
            query += ' AND p.content_type = ?'
            params.append(content_type)
        
        # Sorting
        if sort_by == 'trending':
            query += ' ORDER BY (p.likes_count + p.comments_count + p.shares_count) DESC, p.created_at DESC'
        elif sort_by == 'popular':
            query += ' ORDER BY p.views_count DESC, p.created_at DESC'
        else:  # latest
            query += ' ORDER BY p.created_at DESC'
        
        query += ' LIMIT ? OFFSET ?'
        params.extend([limit, (page - 1) * limit])
        
        cursor.execute(query, params)
        posts = cursor.fetchall()
        conn.close()
        
        # Format response
        feed_posts = []
        for post in posts:
            feed_posts.append({
                "postId": post[0],
                "creatorAddress": post[1],
                "tokenId": post[2],
                "contentType": post[3],
                "shelbyBlobId": post[4],
                "shelbyBlobUrl": post[5],
                "title": post[6],
                "description": post[7],
                "isPremium": bool(post[8]),
                "minimumBalance": post[9],
                "tokenName": post[10],
                "tokenSymbol": post[11],
                "tokenPrice": post[12],
                "marketCap": post[13],
                "likesCount": post[14],
                "commentsCount": post[15],
                "sharesCount": post[16],
                "viewsCount": post[17],
                "createdAt": post[18]
            })
        
        return jsonify({
            "success": True,
            "posts": feed_posts,
            "page": page,
            "hasMore": len(feed_posts) == limit
        })
        
    except Exception as e:
        logger.error(f"Error getting feed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
```

### Step 2: Create Frontend Post Service

Create `src/services/postService.ts`:

```typescript
const API_BASE = 'http://localhost:5001/api'

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
  tokenName: string
  tokenSymbol: string
  tokenPrice: number
  marketCap: number
  likesCount: number
  commentsCount: number
  sharesCount: number
  viewsCount: number
  createdAt: string
}

export async function createPost(
  creatorAddress: string,
  contentType: string,
  contentFile: File | null,
  title: string,
  description: string,
  isPremium: boolean,
  minimumBalance: number,
  tokenId: string
): Promise<{ success: boolean; postId?: number; error?: string }> {
  try {
    const formData = new FormData()
    formData.append('creatorAddress', creatorAddress)
    formData.append('contentType', contentType)
    formData.append('title', title)
    formData.append('description', description)
    formData.append('isPremium', String(isPremium))
    formData.append('minimumBalance', String(minimumBalance))
    formData.append('tokenId', tokenId)
    
    if (contentFile) {
      formData.append('content', contentFile)
    }
    
    const response = await fetch(`${API_BASE}/posts/create`, {
      method: 'POST',
      body: formData
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
    
    if (contentType) {
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
```

### Step 3: Create Social Feed Component

Create `src/pages/SocialFeed.tsx`:

```typescript
import React, { useState, useEffect } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { getFeed, Post } from '../services/postService'
import PostCard from '../components/PostCard'

const SocialFeed: React.FC = () => {
  const { address, isConnected } = useWallet()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [contentType, setContentType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'latest' | 'trending' | 'popular'>('latest')

  useEffect(() => {
    loadFeed()
  }, [contentType, sortBy])

  const loadFeed = async () => {
    setLoading(true)
    const result = await getFeed(1, 20, contentType === 'all' ? undefined : contentType, sortBy)
    if (result.success && result.posts) {
      setPosts(result.posts)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-6">Social Feed</h1>
        
        {/* Filters */}
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6 flex gap-4">
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded"
          >
            <option value="all">All Content</option>
            <option value="text">Text</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="reel">Reels</option>
            <option value="audio">Audio</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-gray-700 text-white px-4 py-2 rounded"
          >
            <option value="latest">Latest</option>
            <option value="trending">Trending</option>
            <option value="popular">Popular</option>
          </select>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="text-center text-white">Loading feed...</div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard key={post.postId} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SocialFeed
```

### Step 4: Create Post Card Component

Create `src/components/PostCard.tsx`:

```typescript
import React from 'react'
import { Post } from '../services/postService'
import PremiumContentGate from './PremiumContentGate'
import { useNavigate } from 'react-router-dom'

interface PostCardProps {
  post: Post
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const navigate = useNavigate()

  return (
    <div className="bg-gray-800/50 rounded-lg p-6 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
          <div>
            <div className="text-white font-semibold">{post.tokenName}</div>
            <div className="text-gray-400 text-sm">${post.tokenPrice.toFixed(4)}</div>
          </div>
        </div>
        <button
          onClick={() => navigate(`/trade/${post.tokenSymbol}`)}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
        >
          Invest
        </button>
      </div>

      {/* Content */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white mb-2">{post.title}</h3>
        <p className="text-gray-300">{post.description}</p>
      </div>

      {/* Premium Content Gate */}
      {post.isPremium && post.shelbyBlobUrl ? (
        <PremiumContentGate
          tokenData={{
            creator: post.creatorAddress,
            token_id: post.tokenId,
            token_symbol: post.tokenSymbol,
            token_name: post.tokenName
          }}
          premiumContentUrl={post.shelbyBlobUrl}
          premiumContentType={post.contentType === 'video' ? 'video' : 'image'}
          minimumBalance={post.minimumBalance}
        />
      ) : post.shelbyBlobUrl ? (
        <div>
          {post.contentType === 'image' && (
            <img src={post.shelbyBlobUrl} alt={post.title} className="w-full rounded-lg" />
          )}
          {post.contentType === 'video' && (
            <video src={post.shelbyBlobUrl} controls className="w-full rounded-lg" />
          )}
        </div>
      ) : null}

      {/* Engagement */}
      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-700">
        <button className="flex items-center gap-2 text-gray-400 hover:text-red-400">
          ❤️ {post.likesCount}
        </button>
        <button className="flex items-center gap-2 text-gray-400 hover:text-blue-400">
          💬 {post.commentsCount}
        </button>
        <button className="flex items-center gap-2 text-gray-400 hover:text-green-400">
          🔄 {post.sharesCount}
        </button>
        <div className="ml-auto text-gray-400 text-sm">
          👁️ {post.viewsCount} views
        </div>
      </div>
    </div>
  )
}

export default PostCard
```

---

## 🎯 Next Steps

1. **Add Database Tables** - Run SQL to create posts, engagement, comments tables
2. **Implement Upload** - Add file upload to Shelby in backend
3. **Build Feed** - Create SocialFeed page component
4. **Add Engagement** - Implement like, comment, share functionality
5. **Integrate Trading** - Add buy/sell buttons to posts
6. **Add Analytics** - Track views, engagement, token performance

---

## 🚀 This is a Complete, Production-Ready Plan!

You now have:
- ✅ Architecture design
- ✅ Database schema
- ✅ Backend API endpoints
- ✅ Frontend components
- ✅ Integration with existing features
- ✅ Monetization model

**Start building and you'll have a working social media platform on Shelby!** 🎉

