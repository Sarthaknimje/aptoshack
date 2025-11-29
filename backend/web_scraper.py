"""
Web Scraper for Social Media Content
Scrapes Instagram Reels, Twitter Tweets, LinkedIn Posts without APIs
FREE - No API keys required!
"""

import requests
from bs4 import BeautifulSoup
import re
import json
import logging
from typing import Dict, Optional, List
from urllib.parse import urlparse, parse_qs
import time

logger = logging.getLogger(__name__)

class WebScraper:
    """Web scraper for social media platforms"""
    
    @staticmethod
    def get_headers() -> Dict[str, str]:
        """Get headers to mimic browser requests"""
        return {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
    
    @staticmethod
    def scrape_instagram_reel(reel_url: str) -> Optional[Dict]:
        """
        Scrape Instagram Reel data from URL using multiple methods
        No API required - uses oEmbed endpoint and web scraping
        """
        try:
            # Instagram Reel URL format: https://www.instagram.com/reel/ABC123/ or /reels/ABC123/
            reel_id_match = re.search(r'/reels?/([A-Za-z0-9_-]+)', reel_url)
            if not reel_id_match:
                return None
            
            reel_id = reel_id_match.group(1)
            
            # Initialize data
            username = ''
            title_text = ''
            description_text = ''
            thumbnail_url = ''
            likes = 0
            comments = 0
            views = 0
            
            # METHOD 1: Try Instagram's oEmbed endpoint (FREE, no API key needed!)
            # oEmbed returns title in format: "2M likes, 10K comments - username on Nov 27: caption"
            # or "2,144,147 likes, 9,992 comments - username on Nov 27: caption"
            try:
                oembed_url = f'https://api.instagram.com/oembed/?url={reel_url}'
                oembed_response = requests.get(oembed_url, timeout=10, headers={
                    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
                })
                if oembed_response.status_code == 200:
                    oembed_data = oembed_response.json()
                    username = oembed_data.get('author_name', '')
                    raw_title = oembed_data.get('title', '')
                    thumbnail_url = oembed_data.get('thumbnail_url', '')
                    
                    logger.info(f"oEmbed raw title: {raw_title}")
                    
                    # Parse engagement from title format: "280K likes, 1,621 comments - username..."
                    if raw_title:
                        # LIKES: Try abbreviated FIRST (280K, 2M, 1.5B)
                        abbrev_likes = re.search(r'([\d.]+)\s*([KMB])\s*likes?', raw_title, re.IGNORECASE)
                        if abbrev_likes:
                            num = float(abbrev_likes.group(1))
                            suffix = abbrev_likes.group(2).upper()
                            multiplier = {'K': 1000, 'M': 1000000, 'B': 1000000000}.get(suffix, 1)
                            likes = int(num * multiplier)
                            logger.info(f"Found abbreviated likes: {abbrev_likes.group(0)} -> {likes:,}")
                        
                        # If no abbreviated, try exact (2,144,147 likes)
                        if likes == 0:
                            exact_likes = re.search(r'([\d,]+)\s*likes?', raw_title, re.IGNORECASE)
                            if exact_likes:
                                likes_str = exact_likes.group(1).replace(',', '')
                                if likes_str.isdigit():
                                    likes = int(likes_str)
                                    logger.info(f"Found exact likes: {likes:,}")
                        
                        # COMMENTS: Try abbreviated FIRST (10K, 2M)
                        abbrev_comments = re.search(r'([\d.]+)\s*([KMB])\s*comments?', raw_title, re.IGNORECASE)
                        if abbrev_comments:
                            num = float(abbrev_comments.group(1))
                            suffix = abbrev_comments.group(2).upper()
                            multiplier = {'K': 1000, 'M': 1000000, 'B': 1000000000}.get(suffix, 1)
                            comments = int(num * multiplier)
                            logger.info(f"Found abbreviated comments: {abbrev_comments.group(0)} -> {comments:,}")
                        
                        # If no abbreviated, try exact (1,621 comments)
                        if comments == 0:
                            exact_comments = re.search(r'([\d,]+)\s*comments?', raw_title, re.IGNORECASE)
                            if exact_comments:
                                comments_str = exact_comments.group(1).replace(',', '')
                                if comments_str.isdigit():
                                    comments = int(comments_str)
                                    logger.info(f"Found exact comments: {comments:,}")
                        
                        # Extract clean title (caption part after ":")
                        caption_match = re.search(r':\s*(.+)$', raw_title)
                        if caption_match:
                            title_text = caption_match.group(1).strip()
                        else:
                            # Remove engagement prefix
                            title_text = re.sub(r'^[\d,.]+[KMB]?\s*likes?,?\s*[\d,.]+[KMB]?\s*comments?\s*-?\s*', '', raw_title, flags=re.IGNORECASE)
                            title_text = re.sub(r'^\w+\s+on\s+\w+\s+\d+,?\s*\d*:\s*', '', title_text)
                    
                    # oEmbed sometimes includes HTML with the content
                    html_content = oembed_data.get('html', '')
                    if html_content and not title_text:
                        caption_match = re.search(r'<p[^>]*>([^<]+)</p>', html_content)
                        if caption_match:
                            title_text = caption_match.group(1)[:100]
            except Exception as e:
                logger.warning(f"oEmbed failed: {e}")
            
            # METHOD 2: Try the embed page which sometimes has more data
            embed_headers_list = [
                {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
                {
                    'User-Agent': 'Twitterbot/1.0',
                    'Accept': '*/*',
                },
                {
                    'User-Agent': 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
                    'Accept': '*/*',
                }
            ]
            
            for embed_headers in embed_headers_list:
                try:
                    embed_url = f'https://www.instagram.com/p/{reel_id}/embed/'
                    embed_response = requests.get(embed_url, timeout=10, headers=embed_headers)
                    if embed_response.status_code == 200:
                        embed_soup = BeautifulSoup(embed_response.text, 'html.parser')
                        
                        # Look for engagement in embed page
                        embed_text = embed_response.text
                        
                        # Log what we got from embed
                        logger.info(f"Instagram embed page size: {len(embed_text)} bytes")
                        
                        # Try to find likes in various formats
                        likes_patterns = [
                            r'"edge_media_preview_like":\s*{\s*"count":\s*(\d+)',
                            r'"like_count":\s*(\d+)',
                            r'"likes":\s*{\s*"count":\s*(\d+)',
                            r'(\d{1,3}(?:,\d{3})*)\s*likes?',  # 642,384 likes
                            r'"likes":\s*(\d+)',
                        ]
                        for pattern in likes_patterns:
                            if likes > 0:
                                break
                            match = re.search(pattern, embed_text, re.IGNORECASE)
                            if match:
                                likes_str = match.group(1).replace(',', '')
                                likes = int(likes_str) if likes_str.isdigit() else 0
                                if likes > 0:
                                    logger.info(f"Found likes from embed: {likes:,}")
                                    break
                        
                        # Try to find comments - multiple patterns (including escaped quotes)
                        comments_patterns = [
                            r'"comments_count\\"?:\s*(\d+)',  # "comments_count\":2596 or "comments_count":2596
                            r'"comment_count\\"?:\s*(\d+)',   # "comment_count\":123
                            r'"edge_media_to_comment":\s*\{\s*"count":\s*(\d+)',
                            r'"edge_media_to_parent_comment":\s*\{\s*"count":\s*(\d+)',
                            r'"edge_media_preview_comment":\s*\{\s*"count":\s*(\d+)',
                            r'"comments":\s*\{\s*"count":\s*(\d+)',
                            r'comments_count["\s:]+(\d+)',  # looser pattern
                            r'(\d{1,3}(?:,\d{3})*)\s*comments?',  # 1,234 comments
                        ]
                        for pattern in comments_patterns:
                            if comments > 0:
                                break
                            match = re.search(pattern, embed_text, re.IGNORECASE)
                            if match:
                                comments_str = match.group(1).replace(',', '')
                                comments = int(comments_str) if comments_str.isdigit() else 0
                                if comments > 0:
                                    logger.info(f"Found comments from embed: {comments:,}")
                                    break
                        
                        # Try to find views for videos/reels
                        views_patterns = [
                            r'"video_view_count":\s*(\d+)',
                            r'"play_count":\s*(\d+)',
                            r'(\d+(?:,\d+)*)\s*views?',
                        ]
                        for pattern in views_patterns:
                            if views > 0:
                                break
                            match = re.search(pattern, embed_text, re.IGNORECASE)
                            if match:
                                views_str = match.group(1).replace(',', '')
                                views = int(views_str) if views_str.isdigit() else 0
                                if views > 0:
                                    logger.info(f"Found views from embed: {views:,}")
                                    break
                        
                        # Extract username if not already found
                        if not username:
                            username_match = re.search(r'"username":\s*"([^"]+)"', embed_text)
                            if username_match:
                                username = username_match.group(1)
                        
                        # Extract thumbnail if not already found
                        if not thumbnail_url:
                            thumb_match = re.search(r'"display_url":\s*"([^"]+)"', embed_text)
                            if thumb_match:
                                thumbnail_url = thumb_match.group(1).replace('\\u0026', '&')
                            else:
                                # Try og:image from embed page
                                og_img = embed_soup.find('meta', property='og:image')
                                if og_img:
                                    thumbnail_url = og_img.get('content', '')
                        
                        # If we found data, stop trying other headers
                        if likes > 0 or comments > 0:
                            break
                except Exception as e:
                    logger.warning(f"Embed scraping failed with {embed_headers.get('User-Agent', '')[:20]}: {e}")
            
            # METHOD 3: Try direct page scraping with Facebook bot UA (gets more access)
            try:
                headers = {
                    'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
                    'Accept': '*/*',
                }
                response = requests.get(reel_url, headers=headers, timeout=15)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # Extract from meta tags
                    if not thumbnail_url:
                        og_image = soup.find('meta', property='og:image')
                        if og_image:
                            thumbnail_url = og_image.get('content', '')
                    
                    # Get og:title - Instagram format: "X likes, Y comments - username on Date"
                    og_title = soup.find('meta', property='og:title')
                    og_title_content = og_title.get('content', '') if og_title else ''
                    
                    logger.info(f"Instagram og:title: {og_title_content[:150]}")
                    
                    # Parse engagement from og:title FIRST (most reliable source!)
                    # Format: "70,542 likes, 586 comments - username on November 27, 2025"
                    if og_title_content and likes == 0:
                        # Try to get likes from og:title
                        abbrev_likes_title = re.search(r'([\d.]+)\s*([KMB])\s*likes?', og_title_content, re.IGNORECASE)
                        exact_likes_title = re.search(r'([\d,]+)\s*likes?', og_title_content, re.IGNORECASE)
                        
                        if abbrev_likes_title:
                            num = float(abbrev_likes_title.group(1))
                            suffix = abbrev_likes_title.group(2).upper()
                            multiplier = {'K': 1000, 'M': 1000000, 'B': 1000000000}.get(suffix, 1)
                            likes = int(num * multiplier)
                            logger.info(f"Found likes from og:title: {abbrev_likes_title.group(0)} -> {likes:,}")
                        elif exact_likes_title:
                            likes_str = exact_likes_title.group(1).replace(',', '')
                            if likes_str.isdigit():
                                likes = int(likes_str)
                                logger.info(f"Found exact likes from og:title: {likes:,}")
                    
                    if og_title_content and comments == 0:
                        # Try to get comments from og:title
                        abbrev_comments_title = re.search(r'([\d.]+)\s*([KMB])\s*comments?', og_title_content, re.IGNORECASE)
                        exact_comments_title = re.search(r'([\d,]+)\s*comments?', og_title_content, re.IGNORECASE)
                        
                        if abbrev_comments_title:
                            num = float(abbrev_comments_title.group(1))
                            suffix = abbrev_comments_title.group(2).upper()
                            multiplier = {'K': 1000, 'M': 1000000, 'B': 1000000000}.get(suffix, 1)
                            comments = int(num * multiplier)
                            logger.info(f"Found comments from og:title: {abbrev_comments_title.group(0)} -> {comments:,}")
                        elif exact_comments_title:
                            comments_str = exact_comments_title.group(1).replace(',', '')
                            if comments_str.isdigit():
                                comments = int(comments_str)
                                logger.info(f"Found exact comments from og:title: {comments:,}")
                    
                    if not title_text:
                        # Extract username from title
                        username_match = re.search(r'^([^\s]+)\s+on\s+Instagram', og_title_content, re.IGNORECASE)
                        if username_match and not username:
                            username = username_match.group(1).replace('@', '')
                        title_text = re.sub(r'\s+on\s+Instagram.*$', '', og_title_content, flags=re.IGNORECASE)
                        # Remove engagement prefix from title
                        title_text = re.sub(r'^[\d,.]+[KMB]?\s*likes?,?\s*[\d,.]+[KMB]?\s*comments?\s*-?\s*', '', title_text, flags=re.IGNORECASE)
                    
                    if not description_text:
                        og_desc = soup.find('meta', property='og:description')
                        if og_desc:
                            description_text = og_desc.get('content', '')
                    
                    # Combine for fallback parsing
                    all_text = f"{og_title_content} {description_text}"
                    
                    logger.info(f"Instagram meta text: {all_text[:200]}...")
                    
                    # Extract likes from meta text if not found yet
                    if likes == 0:
                        abbrev_likes = re.search(r'([\d.]+)\s*([KMB])\s*likes?', all_text, re.IGNORECASE)
                        if abbrev_likes:
                            num = float(abbrev_likes.group(1))
                            suffix = abbrev_likes.group(2).upper()
                            multiplier = {'K': 1000, 'M': 1000000, 'B': 1000000000}.get(suffix, 1)
                            likes = int(num * multiplier)
                            logger.info(f"Found likes from meta: {likes:,}")
                        else:
                            exact_likes = re.search(r'([\d,]+)\s*likes?', all_text, re.IGNORECASE)
                            if exact_likes:
                                likes_str = exact_likes.group(1).replace(',', '')
                                if likes_str.isdigit():
                                    likes = int(likes_str)
                                    logger.info(f"Found exact likes from meta: {likes:,}")
                    
                    # Extract comments from meta text - THIS IS KEY!
                    if comments == 0:
                        abbrev_comments = re.search(r'([\d.]+)\s*([KMB])\s*comments?', all_text, re.IGNORECASE)
                        if abbrev_comments:
                            num = float(abbrev_comments.group(1))
                            suffix = abbrev_comments.group(2).upper()
                            multiplier = {'K': 1000, 'M': 1000000, 'B': 1000000000}.get(suffix, 1)
                            comments = int(num * multiplier)
                            logger.info(f"Found comments from meta: {comments:,}")
                        else:
                            exact_comments = re.search(r'([\d,]+)\s*comments?', all_text, re.IGNORECASE)
                            if exact_comments:
                                comments_str = exact_comments.group(1).replace(',', '')
                                if comments_str.isdigit():
                                    comments = int(comments_str)
                                    logger.info(f"Found exact comments from meta: {comments:,}")
                    
                    # Look for JSON data in script tags (fallback)
                    page_text = response.text
                    
                    # More patterns for engagement from JSON - Instagram often includes this in shared_data
                    if likes == 0:
                        for pattern in [
                            r'"edge_liked_by":\s*{\s*"count":\s*(\d+)', 
                            r'"likeCount":\s*(\d+)',
                            r'"like_count":\s*(\d+)',
                            r'edge_media_preview_like.*?"count":\s*(\d+)',
                        ]:
                            match = re.search(pattern, page_text)
                            if match:
                                likes = int(match.group(1))
                                logger.info(f"Found likes from JSON: {likes:,}")
                                break
                    
                    # COMMENTS - Look for comment count in JSON (including escaped quotes)
                    if comments == 0:
                        for pattern in [
                            r'"comments_count\\"?:\s*(\d+)',  # "comments_count\":2596
                            r'"comment_count\\"?:\s*(\d+)',   # "comment_count":123
                            r'"edge_media_to_comment":\s*\{\s*"count":\s*(\d+)',
                            r'"edge_media_to_parent_comment":\s*\{\s*"count":\s*(\d+)',
                            r'"commentCount":\s*(\d+)',
                            r'"comments":\s*\{\s*"count":\s*(\d+)',
                            r'edge_media_preview_comment.*?"count":\s*(\d+)',
                            r'comments_count["\s:\\]+(\d+)',  # looser pattern
                        ]:
                            match = re.search(pattern, page_text)
                            if match:
                                comments = int(match.group(1))
                                logger.info(f"Found comments from JSON: {comments:,}")
                                break
                    
                    if views == 0:
                        for pattern in [r'"viewCount":\s*"?(\d+)"?', r'"video_view_count":\s*(\d+)', r'"play_count":\s*(\d+)']:
                            match = re.search(pattern, page_text)
                            if match:
                                views = int(match.group(1))
                                logger.info(f"Found views from JSON: {views:,}")
                                break
            except Exception as e:
                logger.warning(f"Direct scraping failed: {e}")
            
            # Extract username from URL if still not found
            if not username:
                url_username_match = re.search(r'instagram\.com/([^/?]+)/reels?/', reel_url)
                if url_username_match and url_username_match.group(1) not in ['reel', 'reels', 'p']:
                    username = url_username_match.group(1)
            
            # Clean up title and description - remove engagement prefix
            # Format: "280K likes, 1,621 comments - username on Date: caption"
            def clean_instagram_text(text):
                if not text:
                    return ''
                # Remove "X likes, Y comments - " prefix
                cleaned = re.sub(r'^[\d,.]+[KMB]?\s*likes?,?\s*[\d,.]+[KMB]?\s*comments?\s*-?\s*', '', text, flags=re.IGNORECASE)
                # Remove "username on Date: " prefix
                cleaned = re.sub(r'^[\w._]+\s+on\s+\w+\s+\d+,?\s*\d*:\s*', '', cleaned, flags=re.IGNORECASE)
                # Remove leading/trailing quotes and whitespace
                cleaned = cleaned.strip().strip('"').strip()
                return cleaned
            
            clean_title = clean_instagram_text(title_text)
            clean_description = clean_instagram_text(description_text)
            
            # Use title as description if description is empty or same as title
            final_description = clean_description if clean_description and clean_description != clean_title else clean_title
            
            # Build the result
            result = {
                'id': reel_id,
                'title': clean_title or (f'Instagram Reel by @{username}' if username else 'Instagram Reel'),
                'description': final_description or (f'Instagram Reel content by @{username}' if username else 'Instagram Reel content'),
                'thumbnailUrl': thumbnail_url,
                'url': reel_url,
                'platform': 'instagram',
                'authorName': username,
                'createdAt': '',
                'engagement': {
                    'likes': likes,
                    'comments': comments,
                    'views': 0  # Instagram oEmbed doesn't provide views, so we set to 0
                },
                'requiresVerification': True
            }
            
            logger.info(f"Instagram scrape: @{username} - {likes:,} likes, {comments:,} comments, title='{clean_title[:50]}...'")
            
            return result
            
        except Exception as e:
            logger.error(f"Error scraping Instagram reel: {e}")
            return None
    
    @staticmethod
    def scrape_twitter_tweet(tweet_url: str) -> Optional[Dict]:
        """
        Scrape Twitter/X Tweet data using multiple methods:
        1. Twitter oEmbed API (publish.twitter.com)
        2. Syndication API
        3. Nitter (public Twitter mirror)
        4. Direct page scraping
        """
        try:
            # Twitter URL format: https://twitter.com/username/status/1234567890 or x.com
            tweet_id_match = re.search(r'/status/(\d+)', tweet_url)
            if not tweet_id_match:
                return None
            
            tweet_id = tweet_id_match.group(1)
            # Extract username from both twitter.com and x.com URLs
            username_match = re.search(r'(?:twitter\.com|x\.com)/([^/]+)', tweet_url)
            username = username_match.group(1) if username_match else ''
            
            # Initialize engagement
            likes = 0
            retweets = 0
            replies = 0
            views = 0
            quotes = 0
            bookmarks = 0
            tweet_text = ''
            thumbnail_url = ''
            author_name = username
            
            # METHOD 0: Try FxTwitter/VxTwitter API (public, returns engagement!)
            try:
                # FxTwitter provides JSON API with full engagement data
                fx_url = f'https://api.fxtwitter.com/status/{tweet_id}'
                fx_response = requests.get(fx_url, timeout=10, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                })
                
                if fx_response.status_code == 200:
                    fx_data = fx_response.json()
                    tweet_data = fx_data.get('tweet', {})
                    
                    if tweet_data:
                        likes = tweet_data.get('likes', 0) or 0
                        retweets = tweet_data.get('retweets', 0) or 0
                        replies = tweet_data.get('replies', 0) or 0
                        views = tweet_data.get('views', 0) or 0
                        quotes = tweet_data.get('quotes', 0) or 0
                        bookmarks = tweet_data.get('bookmarks', 0) or 0
                        
                        tweet_text = tweet_data.get('text', '')
                        author_name = tweet_data.get('author', {}).get('screen_name', username) or username
                        
                        # Get media
                        media = tweet_data.get('media', {})
                        if media and media.get('photos'):
                            thumbnail_url = media['photos'][0].get('url', '')
                        elif media and media.get('videos'):
                            thumbnail_url = media['videos'][0].get('thumbnail_url', '')
                        
                        if likes > 0 or retweets > 0:
                            logger.info(f"FxTwitter API: {likes:,} likes, {retweets:,} retweets, {replies:,} replies, {views:,} views, {bookmarks:,} bookmarks")
            except Exception as e:
                logger.warning(f"FxTwitter API failed: {e}")
            
            # METHOD 1: Try Twitter oEmbed API (publish.twitter.com) 
            if likes == 0 and retweets == 0:
                try:
                    oembed_url = f'https://publish.twitter.com/oembed?url={tweet_url}'
                    oembed_response = requests.get(oembed_url, timeout=10, headers={
                        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
                    })
                    if oembed_response.status_code == 200:
                        oembed_data = oembed_response.json()
                        author_name = oembed_data.get('author_name', username) or username
                        
                        # Parse HTML content for tweet text
                        html_content = oembed_data.get('html', '')
                        if html_content and not tweet_text:
                            # Extract text between <p> tags
                            text_match = re.search(r'<p[^>]*>(.+?)</p>', html_content, re.DOTALL)
                            if text_match:
                                tweet_text = re.sub(r'<[^>]+>', '', text_match.group(1))
                                tweet_text = tweet_text.strip()
                        
                        logger.info(f"Twitter oEmbed: author=@{author_name}")
                except Exception as e:
                    logger.warning(f"Twitter oEmbed failed: {e}")
            
            # METHOD 2: Try Twitter's Syndication API (if FxTwitter didn't work)
            if likes == 0 and retweets == 0:
                try:
                    syndication_url = f'https://cdn.syndication.twimg.com/tweet-result?id={tweet_id}&lang=en&token=x'
                    synd_response = requests.get(syndication_url, timeout=10, headers={
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
                        'Accept': 'application/json',
                        'Referer': 'https://platform.twitter.com/',
                        'Origin': 'https://platform.twitter.com'
                    })
                    
                    if synd_response.status_code == 200:
                        try:
                            tweet_data = synd_response.json()
                            
                            # Extract engagement from JSON
                            likes = tweet_data.get('favorite_count', 0) or tweet_data.get('favoriteCount', 0) or 0
                            retweets = tweet_data.get('retweet_count', 0) or tweet_data.get('retweetCount', 0) or 0
                            replies = tweet_data.get('reply_count', 0) or tweet_data.get('replyCount', 0) or 0
                            quotes = tweet_data.get('quote_count', 0) or tweet_data.get('quoteCount', 0) or 0
                            bookmarks = tweet_data.get('bookmark_count', 0) or tweet_data.get('bookmarkCount', 0) or 0
                            
                            # Views can be in different formats
                            views_data = tweet_data.get('views', tweet_data.get('viewCount', 0))
                            if isinstance(views_data, dict):
                                views = int(views_data.get('count', 0) or 0)
                            elif isinstance(views_data, (int, str)):
                                views = int(views_data) if str(views_data).isdigit() else 0
                            
                            # Get tweet text
                            if not tweet_text:
                                tweet_text = tweet_data.get('text', '')
                            
                            # Get author info
                            user_data = tweet_data.get('user', {})
                            if user_data:
                                author_name = user_data.get('screen_name', username) or username
                            
                            # Get media/thumbnail
                            media_list = tweet_data.get('mediaDetails', []) or tweet_data.get('photos', []) or tweet_data.get('entities', {}).get('media', [])
                            if media_list and len(media_list) > 0:
                                thumbnail_url = media_list[0].get('media_url_https', '') or media_list[0].get('url', '')
                            
                            # Video thumbnail
                            if not thumbnail_url and tweet_data.get('video'):
                                video = tweet_data.get('video', {})
                                thumbnail_url = video.get('poster', '')
                            
                            # User profile pic as fallback
                            if not thumbnail_url and user_data:
                                thumbnail_url = user_data.get('profile_image_url_https', '').replace('_normal', '')
                            
                            if likes > 0 or retweets > 0:
                                logger.info(f"Twitter syndication: {likes:,} likes, {retweets:,} retweets, {replies:,} replies, {views:,} views")
                        except (json.JSONDecodeError, ValueError) as e:
                            logger.warning(f"Twitter syndication JSON error: {e}")
                except Exception as e:
                    logger.warning(f"Twitter syndication API failed: {e}")
            
            # METHOD 3: Try Nitter instances (public Twitter mirrors)
            if likes == 0 and retweets == 0:
                nitter_instances = [
                    'nitter.poast.org',
                    'nitter.privacydev.net', 
                    'nitter.1d4.us',
                ]
                
                for nitter in nitter_instances:
                    try:
                        nitter_url = f'https://{nitter}/{username}/status/{tweet_id}'
                        nitter_response = requests.get(nitter_url, timeout=10, headers={
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        })
                        
                        if nitter_response.status_code == 200:
                            soup = BeautifulSoup(nitter_response.text, 'html.parser')
                            
                            # Nitter shows stats in specific elements
                            # Format: <span class="tweet-stat">123</span>
                            stats = soup.find_all(class_='tweet-stat')
                            
                            # Also try icon-based stats
                            for stat in soup.find_all(class_='icon-container'):
                                stat_text = stat.get_text(strip=True)
                                if stat_text:
                                    num = WebScraper._parse_count(stat_text)
                                    icon = stat.find('svg') or stat.find('use')
                                    if icon:
                                        icon_href = icon.get('href', '') or icon.get('xlink:href', '') or ''
                                        if 'heart' in icon_href or 'like' in icon_href:
                                            likes = max(likes, num)
                                        elif 'retweet' in icon_href or 'repeat' in icon_href:
                                            retweets = max(retweets, num)
                                        elif 'comment' in icon_href or 'reply' in icon_href:
                                            replies = max(replies, num)
                            
                            # Get tweet content
                            content_div = soup.find(class_='tweet-content')
                            if content_div and not tweet_text:
                                tweet_text = content_div.get_text(strip=True)
                            
                            # Get image
                            img = soup.find(class_='still-image') or soup.find('img', class_='media')
                            if img and not thumbnail_url:
                                thumbnail_url = img.get('src', '')
                                if thumbnail_url and not thumbnail_url.startswith('http'):
                                    thumbnail_url = f'https://{nitter}{thumbnail_url}'
                            
                            if likes > 0 or retweets > 0:
                                logger.info(f"Nitter ({nitter}): {likes:,} likes, {retweets:,} retweets")
                                break
                    except Exception as e:
                        logger.warning(f"Nitter {nitter} failed: {e}")
                        continue
            
            # METHOD 4: Direct page scraping with bot user agents
            if likes == 0 and retweets == 0:
                headers_list = [
                    {'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'},
                    {'User-Agent': 'Twitterbot/1.0'},
                    {'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)'},
                ]
                
                for headers in headers_list:
                    try:
                        response = requests.get(tweet_url, headers=headers, timeout=15)
                        if response.status_code == 200:
                            soup = BeautifulSoup(response.text, 'html.parser')
                            page_text = response.text
                            
                            # Extract from meta tags
                            og_image = soup.find('meta', property='og:image') or soup.find('meta', attrs={'name': 'twitter:image'})
                            if og_image and not thumbnail_url:
                                thumbnail_url = og_image.get('content', '')
                            
                            og_desc = soup.find('meta', property='og:description')
                            if og_desc and not tweet_text:
                                desc = og_desc.get('content', '')
                                tweet_text = re.sub(r'^.*? on (Twitter|X):\s*["\']?', '', desc, flags=re.IGNORECASE)
                                tweet_text = tweet_text.strip('"\'')
                            
                            # Try to find engagement in page (rare but possible)
                            engagement_patterns = [
                                (r'(\d[\d,]*)\s*(?:Likes?|likes?)', 'likes'),
                                (r'(\d[\d,]*)\s*(?:Retweets?|retweets?|Reposts?|reposts?)', 'retweets'),
                                (r'(\d[\d,]*)\s*(?:Replies?|replies?|Comments?|comments?)', 'replies'),
                                (r'(\d[\d,]*)\s*(?:Views?|views?)', 'views'),
                            ]
                            
                            for pattern, metric in engagement_patterns:
                                match = re.search(pattern, page_text)
                                if match:
                                    num = int(match.group(1).replace(',', ''))
                                    if metric == 'likes' and num > likes:
                                        likes = num
                                    elif metric == 'retweets' and num > retweets:
                                        retweets = num
                                    elif metric == 'replies' and num > replies:
                                        replies = num
                                    elif metric == 'views' and num > views:
                                        views = num
                            
                            if thumbnail_url:
                                break
                    except Exception as e:
                        logger.warning(f"Twitter page scrape failed: {e}")
                        continue
            
            # Add quotes to retweets total
            total_shares = retweets + quotes
            
            logger.info(f"Twitter final: @{author_name} - {likes:,} likes, {replies:,} replies, {total_shares:,} retweets, {views:,} views, {bookmarks:,} bookmarks")
            
            return {
                'id': tweet_id,
                'title': tweet_text[:100] if tweet_text else f'Tweet by @{author_name}',
                'description': tweet_text,
                'thumbnailUrl': thumbnail_url,
                'url': tweet_url,
                'platform': 'twitter',
                'authorName': author_name,
                'createdAt': '',
                'engagement': {
                    'likes': likes,
                    'comments': replies,
                    'shares': total_shares,
                    'views': views,
                    'bookmarks': bookmarks
                }
            }
            
        except Exception as e:
            logger.error(f"Error scraping Twitter tweet: {e}")
            return None
    
    @staticmethod
    def scrape_linkedin_post(post_url: str) -> Optional[Dict]:
        """
        Scrape LinkedIn Post data from URL
        Extracts reactions, comments, reposts from meta tags
        LinkedIn format: "45 reactions · 30 comments" or "1.2K reactions"
        """
        try:
            # LinkedIn URL format: https://www.linkedin.com/posts/username_activity-1234567890-abcdef
            post_id_match = re.search(r'activity-(\d+)', post_url)
            if not post_id_match:
                # Try alternative format
                post_id_match = re.search(r'/posts/([^/?]+)', post_url)
            
            post_id = post_id_match.group(1) if post_id_match else ''
            
            # Initialize engagement
            likes = 0
            comments = 0
            shares = 0
            post_text = ''
            thumbnail_url = ''
            author = ''
            
            # Try multiple user agents
            headers_list = [
                {
                    'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
                    'Accept': '*/*',
                },
                {
                    'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
                    'Accept': 'text/html',
                },
                {
                    'User-Agent': 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
                    'Accept': 'text/html',
                },
                WebScraper.get_headers()
            ]
            
            for headers in headers_list:
                try:
                    response = requests.get(post_url, headers=headers, timeout=15)
                    if response.status_code == 200:
                        soup = BeautifulSoup(response.text, 'html.parser')
                        
                        # Extract from meta tags
                        og_title = soup.find('meta', property='og:title')
                        og_desc = soup.find('meta', property='og:description')
                        og_image = soup.find('meta', property='og:image')
                        
                        title_text = og_title.get('content', '') if og_title else ''
                        desc_text = og_desc.get('content', '') if og_desc else ''
                        thumbnail_url = og_image.get('content', '') if og_image else ''
                        
                        # Combine title and description for parsing
                        all_text = f"{title_text} {desc_text}"
                        
                        # Log for debugging
                        logger.info(f"LinkedIn meta text: {all_text[:300]}...")
                        
                        # Get post text (clean version) - remove "| X comments on LinkedIn" suffix
                        post_text = desc_text or title_text
                        post_text = re.sub(r'\s*\|\s*\d+\s*comments?\s+on\s+LinkedIn\s*$', '', post_text, flags=re.IGNORECASE)
                        
                        # Parse engagement from meta tags
                        # LinkedIn meta description format: "Post text... | 30 comments on LinkedIn"
                        # NOTE: LinkedIn does NOT include reactions/likes in meta tags
                        # Reactions are only visible in JavaScript-rendered content
                        
                        # Try to find reactions in rendered HTML (may not work without JS)
                        page_text = response.text
                        
                        # Log some of the page content for debugging
                        logger.info(f"LinkedIn page title: {title_text[:100] if title_text else 'None'}")
                        
                        # Look for reactions in the HTML (LinkedIn shows them as plain numbers)
                        # LinkedIn format: "317 reactions" or just "317" followed by comments section
                        # Sometimes in format: "317 `` `` `` 30 Comments"
                        reaction_patterns = [
                            r'>\s*([\d,]+)\s*<[^>]*>\s*(?:reactions?|likes?)',  # >317< reactions
                            r'([\d,]+)\s+(?:reactions?|likes?)',  # 317 reactions
                            r'([\d,.]+)\s*([KMB])\s*(?:reactions?|likes?)',  # 1.2K reactions
                            r'"numLikes":\s*(\d+)',  # JSON format
                            r'"reactionCount":\s*(\d+)',  # Alternative JSON
                            r'data-num-likes="(\d+)"',  # data attribute
                            r'socialActivityCount[^>]*>\s*(\d+)',  # social activity count
                        ]
                        
                        for pattern in reaction_patterns:
                            match = re.search(pattern, page_text, re.IGNORECASE)
                            if match:
                                num_str = match.group(1).replace(',', '')
                                suffix = match.group(2).upper() if len(match.groups()) > 1 and match.group(2) else ''
                                if num_str.replace('.', '').isdigit():
                                    num = float(num_str)
                                    if suffix:
                                        multiplier = {'K': 1000, 'M': 1000000, 'B': 1000000000}.get(suffix, 1)
                                        likes = int(num * multiplier)
                                    else:
                                        likes = int(num)
                                    if likes > 0:
                                        logger.info(f"LinkedIn found reactions: {match.group(0).strip()} -> {likes:,}")
                                        break
                        
                        # Comments - LinkedIn format: "| 30 comments on LinkedIn"
                        comment_patterns = [
                            r'\|\s*([\d,]+)\s*comments?\s+on\s+LinkedIn',  # | 30 comments on LinkedIn
                            r'([\d,]+)\s*([KMB])?\s*comments?',  # 30 comments
                            r'>\s*([\d,]+)\s*<[^>]*>\s*[Cc]omments?',  # >30< Comments
                        ]
                        
                        for pattern in comment_patterns:
                            match = re.search(pattern, all_text + ' ' + page_text, re.IGNORECASE)
                            if match:
                                num_str = match.group(1).replace(',', '')
                                suffix = match.group(2).upper() if len(match.groups()) > 1 and match.group(2) else ''
                                if num_str.replace('.', '').isdigit():
                                    num = float(num_str)
                                    if suffix:
                                        multiplier = {'K': 1000, 'M': 1000000, 'B': 1000000000}.get(suffix, 1)
                                        comments = int(num * multiplier)
                                    else:
                                        comments = int(num)
                                    if comments > 0:
                                        logger.info(f"LinkedIn found comments: {match.group(0).strip()} -> {comments:,}")
                                        break
                        
                        # Reposts/Shares - LinkedIn shows these in various formats
                        # Combined search text for better matching
                        search_text = f"{all_text} {page_text}"
                        
                        share_patterns = [
                            r'(\d+)\s*repost',  # "1 repost" (singular)
                            r'([\d,]+)\s*reposts',  # "5 reposts" (plural)  
                            r'([\d,]+)\s*([KMB])\s*reposts?',  # "1K reposts"
                            r'([\d,]+)\s*shares?',  # "30 shares"
                            r'([\d,]+)\s*([KMB])\s*shares?',  # "1K shares"
                            r'>\s*(\d+)\s*<[^>]*>[^<]*(?:repost|share)',  # >1< ...repost
                            r'reposts?[^<]*>\s*(\d+)',  # reposts>1
                            r'data-[^=]*="\d*"[^>]*>\s*(\d+)\s*<',  # data attributes with counts
                        ]
                        
                        for pattern in share_patterns:
                            match = re.search(pattern, search_text, re.IGNORECASE)
                            if match:
                                # Find the number group (could be group 1 or last group depending on pattern)
                                num_str = match.group(1).replace(',', '') if match.group(1) else ''
                                suffix = ''
                                if len(match.groups()) > 1 and match.group(2) and match.group(2).upper() in 'KMB':
                                    suffix = match.group(2).upper()
                                
                                if num_str and num_str.replace('.', '').isdigit():
                                    num = float(num_str)
                                    if suffix:
                                        multiplier = {'K': 1000, 'M': 1000000, 'B': 1000000000}.get(suffix, 1)
                                        shares = int(num * multiplier)
                                    else:
                                        shares = int(num)
                                    if shares > 0:
                                        logger.info(f"LinkedIn found shares/reposts: {match.group(0).strip()} -> {shares:,}")
                                        break
                        
                        if likes > 0 or comments > 0 or thumbnail_url:
                            break  # Got good data
                except Exception as e:
                    logger.warning(f"LinkedIn scrape attempt failed: {e}")
                    continue
            
            # Extract author from URL
            author_match = re.search(r'linkedin\.com/in/([^/?]+)', post_url)
            if not author_match:
                posts_match = re.search(r'linkedin\.com/posts/([^_]+)_', post_url)
                if posts_match:
                    author_match = posts_match
            author = author_match.group(1) if author_match else ''
            
            logger.info(f"LinkedIn scrape: @{author} - {likes:,} reactions, {comments:,} comments, {shares:,} shares")
            
            return {
                'id': post_id,
                'title': post_text[:100] or f'LinkedIn Post by {author}',
                'description': post_text,
                'thumbnailUrl': thumbnail_url,
                'url': post_url,
                'platform': 'linkedin',
                'authorName': author,
                'createdAt': '',
                'engagement': {
                    'likes': likes,
                    'comments': comments,
                    'shares': shares,
                    'views': 0
                }
            }
            
        except Exception as e:
            logger.error(f"Error scraping LinkedIn post: {e}")
            return None
    
    @staticmethod
    def scrape_linkedin_profile(profile_url: str) -> Optional[Dict]:
        """
        Scrape LinkedIn profile to get followers count
        Format: https://www.linkedin.com/in/username/
        """
        try:
            # Extract username from URL
            username_match = re.search(r'/in/([^/?]+)', profile_url)
            if not username_match:
                return None
            
            username = username_match.group(1)
            
            # Try to get followers from meta tags
            headers = WebScraper.get_headers()
            headers.update({
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.google.com/',
            })
            
            try:
                response = requests.get(profile_url, headers=headers, timeout=15, allow_redirects=True)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    page_text = response.text
                    
                    # Try to find followers in various formats
                    followers = 0
                    
                    # Pattern 1: "5,400+ followers" or "5.4K followers"
                    follower_patterns = [
                        r'([\d,]+)\+?\s*followers?',
                        r'([\d.]+)\s*([KMB])\s*followers?',
                        r'"followersCount":\s*(\d+)',
                        r'followers["\']?\s*:\s*(\d+)',
                        r'(\d+)\s*followers?',
                    ]
                    
                    for pattern in follower_patterns:
                        match = re.search(pattern, page_text, re.IGNORECASE)
                        if match:
                            if len(match.groups()) == 2:
                                # Abbreviated format (5.4K)
                                num = float(match.group(1))
                                suffix = match.group(2).upper()
                                multiplier = {'K': 1000, 'M': 1000000, 'B': 1000000000}.get(suffix, 1)
                                followers = int(num * multiplier)
                            else:
                                # Exact format
                                followers_str = match.group(1).replace(',', '')
                                if followers_str.isdigit():
                                    followers = int(followers_str)
                            
                            if followers > 0:
                                logger.info(f"Found LinkedIn followers: {followers:,}")
                                break
                    
                    # Also try meta tags
                    if followers == 0:
                        meta_followers = soup.find('meta', attrs={'name': re.compile(r'followers', re.I)})
                        if meta_followers:
                            content = meta_followers.get('content', '')
                            num_match = re.search(r'(\d+)', content.replace(',', ''))
                            if num_match:
                                followers = int(num_match.group(1))
                    
                    return {
                        'username': username,
                        'followers': followers,
                        'url': profile_url
                    }
            except Exception as e:
                logger.warning(f"LinkedIn profile scrape error: {e}")
                return None
                
        except Exception as e:
            logger.error(f"Error scraping LinkedIn profile: {e}")
            return None
    
    @staticmethod
    def _parse_count(count_str: str) -> int:
        """Parse count string like '1.2K' or '5M' to integer"""
        try:
            count_str = count_str.upper().strip()
            if 'K' in count_str:
                return int(float(count_str.replace('K', '')) * 1000)
            elif 'M' in count_str:
                return int(float(count_str.replace('M', '')) * 1000000)
            elif 'B' in count_str:
                return int(float(count_str.replace('B', '')) * 1000000000)
            else:
                return int(count_str)
        except:
            return 0
    
    @staticmethod
    def generate_verification_code(wallet_address: str, platform: str) -> str:
        """
        Generate a unique verification code for account ownership verification.
        User must add this code to their profile bio to prove ownership.
        """
        import hashlib
        import time
        
        # Create a unique code based on wallet + platform + timestamp (rounded to hour)
        timestamp = str(int(time.time()) // 3600)  # Changes every hour
        raw = f"{wallet_address}:{platform}:{timestamp}"
        hash_obj = hashlib.sha256(raw.encode())
        code = f"CV-{hash_obj.hexdigest()[:8].upper()}"
        return code
    
    @staticmethod
    def verify_bio_code(platform: str, username: str, verification_code: str) -> Dict[str, any]:
        """
        Verify that the user has added our verification code to their profile bio.
        This proves they own the account.
        """
        try:
            bio_text = ""
            
            if platform == 'instagram':
                # Try to fetch Instagram profile bio
                profile_url = f'https://www.instagram.com/{username}/'
                headers_list = [
                    {'User-Agent': 'facebookexternalhit/1.1'},
                    {'User-Agent': 'Twitterbot/1.0'},
                    {'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)'},
                ]
                
                for headers in headers_list:
                    try:
                        response = requests.get(profile_url, headers=headers, timeout=10)
                        if response.status_code == 200:
                            soup = BeautifulSoup(response.text, 'html.parser')
                            # Try meta description which often contains bio
                            meta_desc = soup.find('meta', property='og:description')
                            if meta_desc:
                                bio_text = meta_desc.get('content', '')
                            # Also check page content
                            bio_text += ' ' + response.text
                            break
                    except:
                        continue
                        
            elif platform == 'twitter':
                # Try to fetch Twitter profile
                profile_url = f'https://twitter.com/{username}'
                try:
                    # Try FxTwitter API first
                    fx_url = f'https://api.fxtwitter.com/{username}'
                    response = requests.get(fx_url, timeout=10, headers={
                        'User-Agent': 'Mozilla/5.0',
                        'Accept': 'application/json'
                    })
                    if response.status_code == 200:
                        data = response.json()
                        if 'user' in data:
                            bio_text = data['user'].get('description', '') or data['user'].get('bio', '')
                except:
                    pass
                
                if not bio_text:
                    # Fallback to page scraping
                    headers = {'User-Agent': 'Twitterbot/1.0'}
                    response = requests.get(profile_url, headers=headers, timeout=10)
                    if response.status_code == 200:
                        soup = BeautifulSoup(response.text, 'html.parser')
                        meta_desc = soup.find('meta', property='og:description')
                        if meta_desc:
                            bio_text = meta_desc.get('content', '')
                        bio_text += ' ' + response.text
                        
            elif platform == 'linkedin':
                # LinkedIn profile scraping
                profile_url = f'https://www.linkedin.com/in/{username}/'
                headers = {
                    'User-Agent': 'LinkedInBot/1.0 (compatible; Mozilla/5.0)',
                    'Accept': '*/*'
                }
                try:
                    response = requests.get(profile_url, headers=headers, timeout=10)
                    if response.status_code == 200:
                        soup = BeautifulSoup(response.text, 'html.parser')
                        meta_desc = soup.find('meta', property='og:description')
                        if meta_desc:
                            bio_text = meta_desc.get('content', '')
                        bio_text += ' ' + response.text
                except:
                    pass
            
            # Check if verification code exists in bio/profile
            if verification_code and verification_code.upper() in bio_text.upper():
                return {
                    'verified': True,
                    'message': f'✅ Account verified! Code {verification_code} found in your {platform} profile.'
                }
            else:
                return {
                    'verified': False,
                    'message': f'Code not found. Please add "{verification_code}" to your {platform} bio and try again. This proves you own the account.'
                }
                
        except Exception as e:
            logger.error(f"Bio verification error: {e}")
            return {
                'verified': False,
                'message': f'Could not verify bio. Please try again.'
            }
    
    @staticmethod
    def verify_url_ownership(url: str, platform: str, claimed_username: str = '', wallet_address: str = '', verification_code: str = '') -> Dict[str, any]:
        """
        Verify URL ownership through bio verification (strongest) or username matching.
        
        Verification Flow:
        1. Extract username from URL
        2. If verification_code provided, check if it's in user's bio (STRONGEST verification)
        3. If wallet_address provided but no code, generate a code for user to add to bio
        4. Basic username matching as fallback
        
        Returns dict with 'verified' (bool), 'message' (str), 'verification_code' if needed, 'requires_bio_verification' flag
        """
        try:
            url_username = None
            
            # Extract username from URL based on platform
            if platform == 'instagram':
                username_match = re.search(r'instagram\.com/([^/?]+)/reel/', url)
                if not username_match:
                    username_match = re.search(r'instagram\.com/([^/?]+)', url)
                    if username_match and username_match.group(1) in ['reel', 'reels', 'p']:
                        username_match = None
                if username_match:
                    url_username = username_match.group(1).lower()
                    
            elif platform == 'twitter':
                username_match = re.search(r'(?:twitter\.com|x\.com)/([^/?]+)/status/', url)
                if username_match:
                    url_username = username_match.group(1).lower()
                    
            elif platform == 'linkedin':
                username_match = re.search(r'linkedin\.com/in/([^/?]+)', url)
                if not username_match:
                    posts_match = re.search(r'linkedin\.com/posts/([^_]+)_', url)
                    if posts_match:
                        username_match = posts_match
                if username_match:
                    url_username = username_match.group(1).lower()
            
            # Determine the username to verify
            final_username = claimed_username.replace('@', '').lower() if claimed_username else url_username
            
            if not final_username:
                return {
                    'verified': False,
                    'message': f'Could not determine username. Please enter your {platform} username.',
                    'requires_bio_verification': False
                }
            
            # Check URL username matches claimed username
            if url_username and claimed_username:
                claimed_lower = claimed_username.replace('@', '').lower()
                if url_username != claimed_lower:
                    return {
                        'verified': False,
                        'message': f'⚠️ Username mismatch! URL shows @{url_username} but you entered @{claimed_username}. Only the content owner can tokenize their content.',
                        'requires_bio_verification': False
                    }
            
            # BIO VERIFICATION (Strongest - Proves ownership)
            if verification_code and wallet_address:
                # User provided a verification code - check if it's in their bio
                bio_result = WebScraper.verify_bio_code(platform, final_username, verification_code)
                if bio_result['verified']:
                    return {
                        'verified': True,
                        'message': f'✅ Account ownership verified! Code {verification_code} found in @{final_username}\'s {platform} profile.',
                        'requires_bio_verification': False,
                        'verified_username': final_username
                    }
                else:
                    # Code not found - tell user to add it
                    return {
                        'verified': False,
                        'message': f'🔐 To prove you own @{final_username}, please add this code to your {platform} bio:\n\n{verification_code}\n\nThen click "Verify" again.',
                        'requires_bio_verification': True,
                        'verification_code': verification_code
                    }
            
            # Generate verification code if wallet connected but no code provided
            if wallet_address and not verification_code:
                new_code = WebScraper.generate_verification_code(wallet_address, platform)
                return {
                    'verified': False,
                    'message': f'🔐 Account Verification Required\n\nTo prove you own @{final_username}, please add this code to your {platform} bio:\n\n{new_code}\n\nThis prevents others from tokenizing your content. Click "Verify" after adding the code.',
                    'requires_bio_verification': True,
                    'verification_code': new_code,
                    'url_username': url_username,
                    'claimed_username': final_username
                }
            
            # No wallet - basic username verification only (weaker)
            if url_username:
                if not claimed_username:
                    return {
                        'verified': False,
                        'message': f'Please enter your {platform} username (@{url_username}) to verify you own this content.',
                        'requires_bio_verification': False
                    }
                return {
                    'verified': False,
                    'message': f'⚠️ Connect your wallet for full verification. Username @{url_username} detected in URL.',
                    'requires_bio_verification': True,
                    'url_username': url_username
                }
            
            return {
                'verified': False,
                'message': f'Could not extract username from {platform} URL. Please check the URL format.',
                'requires_bio_verification': False
            }
            
        except Exception as e:
            logger.error(f"Error verifying URL ownership: {e}")
            return {
                'verified': False,
                'message': f'Verification error: {str(e)}',
                'requires_bio_verification': False
            }

