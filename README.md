# 🚀 Creator Coin - Decentralized Social Media Platform : given links of shelby uploaded docs and images in shelby protocol integration

> **Transform Your Content Into Digital Assets. Build Your Empire. Reward Your Holders.**

Creator Coin is a revolutionary social media platform built on Aptos blockchain that enables creators to tokenize their content and monetize their audience through direct investment. Users can invest in creators by purchasing their tokens, unlocking premium content, and participating in a decentralized creator economy.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Smart Contracts](#-smart-contracts)
- [Shelby Protocol Integration](#-shelby-protocol-integration)
- [Photon Integration](#-photon-integration)
- [Use Cases](#-use-cases)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

### Vision

Creator Coin is a **decentralized social media platform** that combines:
- **Tokenization**: Each creator has their own tradeable token (Creator Coin)
- **Premium Content Gating**: Token holders unlock exclusive content
- **Decentralized Storage**: All content stored on Shelby Protocol
- **Rewards System**: Photon integration for engagement rewards
- **Cross-Platform**: Sync with YouTube, Instagram, Twitter, LinkedIn

### Problem Statement

Traditional social media platforms:
- ❌ Creators have limited monetization options
- ❌ Users can't directly invest in creators they believe in
- ❌ Content is stored on centralized servers (censorship risk)
- ❌ No ownership or investment opportunities for fans
- ❌ Limited engagement rewards

### Solution

Creator Coin provides:
- ✅ **Direct Investment**: Users buy creator tokens to invest in their success
- ✅ **Premium Content**: Token-gated exclusive content
- ✅ **Decentralized Storage**: Content on Shelby Protocol (permanent, censorship-resistant)
- ✅ **Creator Earnings**: 5% fee on every token trade
- ✅ **Rewards**: Photon PAT tokens for engagement
- ✅ **Ownership**: Token holders have voting rights and exclusive access

---

## ✨ Key Features

### 1. **Creator Coin System**
- One token per creator (not per content)
- Bonding curve pricing (early investors get better prices)
- Instant trading on Aptos blockchain
- Creator earns 5% on every trade
- Real-time price charts and analytics

### 2. **Social Media Feed**
- Text, Image, Video, Reel, Audio posts
- All content uploaded to Shelby Protocol
- Premium content gating (token-required)
- Engagement metrics (likes, comments, shares, views)
- Creator profiles with token stats
- Search by creator address or token name

### 3. **Premium Content Gating**
- **Free Content**: Visible to everyone
- **Premium Content**: Requires token ownership
- "Invest to See" mechanism
- Time-limited access tokens
- Automatic access revocation on token sale
- Blurred previews for premium content

### 4. **Trading Marketplace**
- Buy/Sell creator tokens instantly
- Bonding curve pricing
- Real-time price updates
- Transaction history
- Portfolio tracking
- Slippage protection

### 5. **Cross-Platform Integration**
- **YouTube**: Import videos, connect channel
- **Instagram**: Import posts and reels
- **Twitter/X**: Import tweets and threads
- **LinkedIn**: Import professional content
- **Creator Coin**: Native posts with tokenization

### 6. **Photon Rewards System**
- **Rewarded Events**: Token purchase, sell, creation, post creation
- **Unrewarded Events**: Content views, login tracking
- Automatic PAT token distribution
- Real-time reward notifications
- Engagement analytics

### 7. **Shelby Protocol Storage**
- All content stored on decentralized blob storage
- Permanent storage with expiration management
- Explorer links for all uploads
- Account balance tracking
- CLI-based upload/download

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Social Feed  │  │ Trading      │  │ Creator      │      │
│  │              │  │ Marketplace  │  │ Profile      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Create Post │  │ Premium      │  │ Photon       │      │
│  │              │  │ Content Gate│  │ Status       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend API (Flask)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Posts API    │  │ Trading API  │  │ Shelby API   │      │
│  │              │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Photon API   │  │ YouTube API  │  │ Database     │      │
│  │              │  │              │  │ (SQLite)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Aptos        │  │ Shelby       │  │ Photon       │
│ Blockchain   │  │ Protocol     │  │ API          │
│              │  │              │  │              │
│ Smart        │  │ Blob Storage │  │ Rewards      │
│ Contracts    │  │ CLI          │  │ Tracking     │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Frontend Structure

```
src/
├── pages/
│   ├── SocialFeed.tsx              # Main social media feed
│   ├── CreatePost.tsx              # Create and upload posts
│   ├── TradingMarketplace.tsx      # Buy/sell tokens
│   ├── CreatorProfilePage.tsx      # Creator profile with stats
│   ├── MultiPlatformTokenization.tsx # Token creation
│   └── Dashboard.tsx               # User dashboard
├── components/
│   ├── PostCard.tsx                # Post display component
│   ├── PremiumContentGate.tsx      # Token-gated content
│   ├── TradeSuccessModal.tsx       # Trade confirmation
│   ├── PhotonStatus.tsx            # Photon rewards widget
│   └── ShelbyStorageInfo.tsx      # Shelby storage info
├── services/
│   ├── petraWalletService.ts       # Aptos wallet integration
│   ├── shelbyService.ts            # Shelby Protocol integration
│   ├── photonService.ts            # Photon API integration
│   ├── tradingService.ts           # Trading operations
│   └── postService.ts              # Social media posts
└── contexts/
    ├── WalletContext.tsx           # Wallet state management
    └── PhotonContext.tsx           # Photon state management
```

### Backend Structure

```
backend/
├── app.py                          # Main Flask application
├── bonding_curve.py                # Bonding curve calculations
├── requirements.txt                # Python dependencies
├── creatorvault.db                 # SQLite database
└── shelby_upload.js               # Shelby CLI wrapper
```

### Smart Contracts

```
contracts/
├── sources/
│   └── creator_token.move          # Aptos Move smart contract
├── build/                          # Compiled contracts
└── Move.toml                       # Move package config
```

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Recharts** - Charts and graphs
- **React Router** - Navigation

### Backend
- **Flask** - Python web framework
- **SQLite** - Database (can upgrade to PostgreSQL)
- **Flask-CORS** - Cross-origin requests
- **Python 3.13** - Runtime

### Blockchain
- **Aptos** - Layer 1 blockchain
- **Move** - Smart contract language
- **Petra Wallet** - Wallet integration

### Storage
- **Shelby Protocol** - Decentralized blob storage
- **Shelby CLI** - Command-line interface

### Rewards
- **Photon SDK** - Engagement and rewards layer
- **PAT Tokens** - Reward tokens

### Development Tools
- **Git** - Version control
- **npm/pip** - Package managers
- **ESLint** - Code linting
- **TypeScript** - Type checking

---

## 🔐 Smart Contracts

### Creator Token Contract

**Location**: `contracts/sources/creator_token.move`

#### Overview

The Creator Token contract implements a **bonding curve** token system on Aptos blockchain. Each creator has their own token that follows a bonding curve pricing model.

#### Key Functions

```move
// Initialize a new creator token
public fun initialize(
    creator: &signer,
    token_id: vector<u8>,
    name: vector<u8>,
    symbol: vector<u8>,
    total_supply: u64,
    initial_price: u64
): Object<Metadata>

// Buy tokens (adds to supply, increases price)
public fun buy_tokens(
    buyer: &signer,
    creator_address: address,
    token_id: vector<u8>,
    apt_amount: u64
): (u64, u64) // Returns (tokens_received, new_price)

// Sell tokens (reduces supply, decreases price)
public fun sell_tokens(
    seller: &signer,
    creator_address: address,
    token_id: vector<u8>,
    token_amount: u64,
    min_apt_received: u64
): u64 // Returns APT received

// Get current token price
public fun get_current_price(
    creator_address: address,
    token_id: vector<u8>
): u64

// Get token balance for user
public fun get_token_balance(
    owner: address,
    creator_address: address,
    token_id: vector<u8>
): u64

// Get total supply
public fun get_total_supply(
    creator_address: address,
    token_id: vector<u8>
): u64
```

#### Bonding Curve Formula

The bonding curve follows a **constant product formula**:

```
Price = (APT_Reserve * K) / Token_Supply
```

Where:
- `APT_Reserve` = Total APT in the bonding curve
- `Token_Supply` = Current token supply
- `K` = Constant (maintains liquidity)

#### Creator Fee

Creators earn **5%** on every trade:
- Buy: 5% of APT goes to creator
- Sell: 5% of tokens go to creator

#### Security Features

- ✅ Slippage protection
- ✅ Minimum amount checks
- ✅ Reentrancy protection
- ✅ Access control (only creator can initialize)
- ✅ Overflow/underflow protection

#### Deployment

```bash
# Build contract
cd contracts
aptos move compile

# Test contract
aptos move test

# Deploy to testnet
aptos move publish --named-addresses creatorvault=YOUR_ADDRESS
```

#### Contract Address

- **Testnet**: `0xfbc34c56aab6dcbe5aa1c9c47807e8fc80f0e674341b11a5b4b6a742764cd0e2`
- **Module**: `creator_token`

---

## 📦 Shelby Protocol Integration

### Overview

Shelby Protocol is a **decentralized blob storage network** built on Aptos. All content (images, videos, documents) is stored on Shelby for permanent, censorship-resistant storage.
Premium content uploaded to Shelby (8 files)

Token: WORKSHOP - "blockchain"
Blob ID: premium_WORKSHOP_test
Token: XFO - "🚀 CrossFi's Biggest Partnership"
Blob ID: premium_XFO_1764456990935
Token: TXI - "transfer xfu"
Blob ID: premium_TXI_1764460802989
URL: https://api.shelbynet.shelby.xyz/shelby/v1/blobs/0x815d4e93e2eaad3680be8583d95352fb6b2f3858c39a37aca906eae26a09b18f/premium_TXI_1764460802989
Token: RECORD - "gpa recording"
Blob ID: premium_RECORD_1764461781731
URL: https://api.shelbynet.shelby.xyz/shelby/v1/blobs/0x815d4e93e2eaad3680be8583d95352fb6b2f3858c39a37aca906eae26a09b18f/premium_RECORD_1764461781731
Token: PREDICT - "btc"
Blob ID: premium_PREDICT_1764464633809
URL: https://api.shelbynet.shelby.xyz/shelby/v1/blobs/0x815d4e93e2eaad3680be8583d95352fb6b2f3858c39a37aca906eae26a09b18f/premium_PREDICT_1764464633809
Token: ALGO - "algo win"
Blob ID: premium_ALGO_1764464852396
URL: https://api.shelbynet.shelby.xyz/shelby/v1/blobs/0x815d4e93e2eaad3680be8583d95352fb6b2f3858c39a37aca906eae26a09b18f/premium_ALGO_1764464852396
Token: AWESOME - "2025 Called"
Blob ID: premium_AWESOME_1764464989412
URL: https://api.shelbynet.shelby.xyz/shelby/v1/blobs/0x815d4e93e2eaad3680be8583d95352fb6b2f3858c39a37aca906eae26a09b18f/premium_AWESOME_1764464989412
Token: WALLET - "xfi wallet"
Blob ID: premium_WALLET_1764485190211
URL: https://api.shelbynet.shelby.xyz/shelby/v1/blobs/0x815d4e93e2eaad3680be8583d95352fb6b2f3858c39a37aca906eae26a09b18f/premium_WALLET_1764485190211

### Features

- ✅ **Permanent Storage**: Content stored on decentralized network
- ✅ **Expiration Management**: Set expiration dates for content
- ✅ **Explorer Links**: View all uploads on Shelby Explorer
- ✅ **CLI Integration**: Direct command-line interface
- ✅ **Account Management**: Track storage account balance

### Setup

#### 1. Install Shelby CLI

```bash
# Install via npm
npm install -g @shelby-protocol/cli

# Or via cargo
cargo install shelby-cli
```

#### 2. Initialize Shelby

```bash
# Initialize Shelby account
shelby init

# List accounts
shelby account list

# Check balance
shelby account balance
```

#### 3. Upload Content

```bash
# Upload a file
shelby upload <file_path> <blob_name> -e "in 365 days" --assume-yes

# Example
shelby upload image.jpg my_post_image -e "in 365 days" --assume-yes
```

### Backend Integration

The backend uses Shelby CLI commands directly:

```python
# Upload to Shelby
subprocess.run([
    'shelby', 'upload', 
    file_path, 
    blob_name, 
    '-e', expiration_str, 
    '--assume-yes'
])

# Get account balance
subprocess.run(['shelby', 'account', 'balance'])

# Get blob info
subprocess.run(['shelby', 'blob', 'info', blob_name])
```

### API Endpoints

#### Upload Content

```http
POST /api/shelby/upload
Content-Type: multipart/form-data

{
  "file": <file>,
  "blobName": "post_image_123",
  "expiration": "2025-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "blobUrl": "https://api.shelbynet.shelby.xyz/shelby/v1/blobs/0x.../post_image_123",
  "blobId": "post_image_123",
  "blobName": "post_image_123",
  "accountAddress": "0x...",
  "transactionHash": "0x...",
  "explorerUrl": "https://explorer.shelbynet.shelby.xyz/account/0x.../blobs?name=post_image_123",
  "aptosExplorerUrl": "https://explorer.aptoslabs.com/txn/0x...?network=shelbynet"
}
```

#### Get Account Balance

```http
GET /api/shelby/account-balance
```

**Response:**
```json
{
  "success": true,
  "apt_balance": 1.5,
  "shelbyusd_balance": 29.0,
  "account_address": "0x..."
}
```

### Explorer Links

All uploads generate explorer links:
- **Shelby Explorer**: `https://explorer.shelbynet.shelby.xyz/account/{address}/blobs?name={blob_name}`
- **Aptos Explorer**: `https://explorer.aptoslabs.com/txn/{hash}?network=shelbynet`

---

## ⚡ Photon Integration

### Overview

Photon is a **unified identity, embedded wallet, engagement, and rewards layer** on Aptos. It tracks user engagement and rewards them with PAT tokens.

### Features

- ✅ **Automatic Wallet Creation**: Embedded wallets for users
- ✅ **Rewarded Events**: PAT tokens for token purchases, sells, creation
- ✅ **Unrewarded Events**: Analytics tracking (content views, login)
- ✅ **Real-time Notifications**: PAT reward notifications
- ✅ **Status Widget**: In-app Photon status display

### Setup

#### 1. Get Photon API Credentials

1. Visit [Photon Dashboard](https://dashboard.getstan.app)
2. Create a campaign
3. Get your API key and campaign ID

#### 2. Configure Environment Variables

```bash
# Frontend (.env)
REACT_APP_PHOTON_API_KEY=your_api_key
REACT_APP_PHOTON_CAMPAIGN_ID=your_campaign_id
REACT_APP_PHOTON_BASE_URL=https://stage-api.getstan.app/identity-service/api/v1

# Backend (.env)
PHOTON_API_KEY=your_api_key
PHOTON_CAMPAIGN_ID=your_campaign_id
```

### Event Types

#### Rewarded Events (PAT Tokens)

1. **Token Purchase** 🛒
   - Triggered when user buys creator tokens
   - Location: `TradingMarketplace.tsx`
   - Reward: PAT tokens (amount set by campaign)

2. **Token Sell** 💰
   - Triggered when user sells creator tokens
   - Location: `TradingMarketplace.tsx`
   - Reward: PAT tokens

3. **Token Creation** 🎨
   - Triggered when creator creates a new token
   - Location: `MultiPlatformTokenization.tsx`
   - Reward: PAT tokens

4. **Post Creation** 📝
   - Triggered when creator publishes a post
   - Location: `CreatePost.tsx`
   - Reward: PAT tokens

#### Unrewarded Events (Analytics Only)

1. **Content View** 👁️
   - Triggered when user views premium content
   - Location: `PremiumContentGate.tsx`
   - Reward: 0 PAT tokens (tracking only)

2. **Login** 🔐
   - Triggered when user connects wallet
   - Location: `PhotonContext.tsx`
   - Reward: 0 PAT tokens (tracking only)

### API Integration

#### Register User

```typescript
// Frontend
const jwtToken = await generatePhotonJWT(userId, email, name)
const result = await registerPhotonUser(jwtToken)
```

#### Trigger Rewarded Event

```typescript
await trackRewardedEvent(
  'token_purchase',
  campaignId,
  { token_symbol: 'TOKEN', amount: 100 }
)
```

#### Trigger Unrewarded Event

```typescript
await trackUnrewardedEvent(
  'view_content',
  campaignId,
  { content_id: '123' }
)
```

### Monitoring

#### Photon Status Widget

The widget (bottom-right corner) shows:
- ✅ Status: Active/Inactive
- 💰 Total Rewards: Sum of all PAT tokens
- 📊 Event Counts: Success/Error counts
- 📝 Event Logs: Detailed event history

#### External Links

- **Dashboard**: https://dashboard.getstan.app
- **API Docs**: https://docs.getstan.app
- **API Base**: https://stage-api.getstan.app/identity-service/api/v1

---

## 💡 Use Cases

### Use Case 1: Creator Launches Token

**Scenario**: A YouTuber wants to monetize their content and build a community.

**Steps**:
1. Creator connects wallet
2. Creates Creator Coin via MultiPlatform Tokenization
3. Token is deployed on Aptos blockchain
4. Creator earns 5% on every trade
5. Creator can now create premium posts

**Outcome**:
- Creator has a tradeable token
- Fans can invest in creator's success
- Creator earns from token trades

### Use Case 2: User Invests in Creator

**Scenario**: A user discovers a creator with great content and wants to invest.

**Steps**:
1. User browses social feed
2. Sees creator with premium content (blurred preview)
3. Clicks "Invest to See"
4. Buys creator tokens from marketplace
5. Unlocks premium content automatically
6. Earns PAT tokens (Photon reward)

**Outcome**:
- User owns creator tokens
- Access to premium content
- Potential profit if token price rises
- PAT tokens as engagement reward

### Use Case 3: Creator Publishes Premium Post

**Scenario**: Creator wants to publish exclusive content for token holders.

**Steps**:
1. Creator goes to Create Post page
2. Uploads video/image to Shelby Protocol
3. Sets as premium (requires 10 tokens)
4. Publishes post
5. Post appears in feed with "Invest to See"
6. Only token holders can view content
7. Creator earns PAT tokens for post creation

**Outcome**:
- Premium content stored on Shelby
- Token-gated access
- Creator earns from engagement
- Explorer links for verification

### Use Case 4: User Sells Tokens

**Scenario**: User wants to sell tokens for profit or to revoke access.

**Steps**:
1. User goes to Trading Marketplace
2. Switches to "Sell" tab
3. Enters amount to sell
4. Confirms transaction in Petra Wallet
5. Tokens sold, APT received
6. Premium access revoked immediately
7. Earns PAT tokens (Photon reward)

**Outcome**:
- User receives APT
- Premium access revoked
- Creator earns 5% fee
- PAT tokens as reward

### Use Case 5: Cross-Platform Content Sync

**Scenario**: Creator wants to import YouTube video as a post.

**Steps**:
1. Creator connects YouTube channel
2. Selects video to import
3. Video metadata fetched
4. Video uploaded to Shelby Protocol
5. Post created with video link
6. Can set as premium content

**Outcome**:
- YouTube content on platform
- Stored on Shelby Protocol
- Can be token-gated
- Cross-platform presence

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.13+
- **Git**
- **Petra Wallet** browser extension
- **Shelby CLI** installed
- **Photon API** credentials (optional)

### Installation

#### 1. Clone Repository

```bash
git clone https://github.com/yourusername/aptoshack.git
cd aptoshack/algos2/contentvault
```

#### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
# REACT_APP_PHOTON_API_KEY=your_key
# REACT_APP_PHOTON_CAMPAIGN_ID=your_campaign_id

# Start development server
npm run dev
```

Frontend runs on `http://localhost:5175`

#### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp env.template .env

# Edit .env with your configuration
# YOUTUBE_CLIENT_ID=your_client_id
# YOUTUBE_CLIENT_SECRET=your_client_secret
# PHOTON_API_KEY=your_key

# Initialize database
python -c "from app import init_db; init_db()"

# Start Flask server
python app.py
```

Backend runs on `http://localhost:5001`

#### 4. Shelby Setup

```bash
# Install Shelby CLI
npm install -g @shelby-protocol/cli

# Initialize Shelby
shelby init

# Verify installation
shelby account balance
```

#### 5. Smart Contract Setup

```bash
cd contracts

# Install Aptos CLI
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3

# Build contracts
aptos move compile

# Test contracts
aptos move test
```

### Configuration

#### Frontend Environment Variables

```env
# Photon Integration
REACT_APP_PHOTON_API_KEY=your_api_key
REACT_APP_PHOTON_CAMPAIGN_ID=your_campaign_id
REACT_APP_PHOTON_BASE_URL=https://stage-api.getstan.app/identity-service/api/v1

# Backend URL
REACT_APP_BACKEND_URL=http://localhost:5001
```

#### Backend Environment Variables

```env
# Flask Configuration
FLASK_SECRET_KEY=your-secret-key
FLASK_ENV=development
CORS_ORIGINS=http://localhost:5175

# YouTube OAuth
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:5175/auth/youtube/callback
YOUTUBE_API_KEY=your_api_key

# Photon Integration
PHOTON_API_KEY=your_api_key
PHOTON_CAMPAIGN_ID=your_campaign_id

# Aptos Configuration
APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com
```

---

## 📚 API Documentation

### Posts API

#### Create Post

```http
POST /api/posts/create
Content-Type: application/json

{
  "creatorAddress": "0x...",
  "tokenId": "token_id",
  "contentType": "image",
  "shelbyBlobId": "blob_id",
  "shelbyBlobUrl": "https://...",
  "title": "Post Title",
  "description": "Post Description",
  "isPremium": true,
  "minimumBalance": 10
}
```

#### Get Feed

```http
GET /api/posts/feed?page=1&limit=20&contentType=image&sortBy=latest
```

#### Engage with Post

```http
POST /api/posts/{post_id}/engage
Content-Type: application/json

{
  "userAddress": "0x...",
  "type": "like"  // like, comment, share, view
}
```

### Trading API

#### Estimate Buy

```http
POST /api/bonding-curve/estimate
Content-Type: application/json

{
  "tokenId": "token_id",
  "action": "buy",
  "amount": 100
}
```

#### Execute Buy

```http
POST /api/trading/buy
Content-Type: application/json

{
  "tokenId": "token_id",
  "amount": 100,
  "userAddress": "0x..."
}
```

### Shelby API

#### Upload Content

```http
POST /api/shelby/upload
Content-Type: multipart/form-data

file: <file>
blobName: "post_image_123"
expiration: "2025-12-31T23:59:59Z"
```

#### Get Account Balance

```http
GET /api/shelby/account-balance
```

### Photon API

#### Generate JWT

```http
POST /api/photon/generate-jwt
Content-Type: application/json

{
  "userId": "user_123",
  "email": "user@example.com",
  "name": "User Name"
}
```

---

## 🚢 Deployment

### Frontend Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Backend Deployment (Heroku/Railway)

```bash
# Install Heroku CLI
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set FLASK_SECRET_KEY=your_key
heroku config:set YOUTUBE_CLIENT_ID=your_id

# Deploy
git push heroku main
```

### Database Migration

For production, migrate from SQLite to PostgreSQL:

```python
# Update app.py to use PostgreSQL
import psycopg2

DATABASE_URL = os.getenv('DATABASE_URL')
conn = psycopg2.connect(DATABASE_URL)
```

### Smart Contract Deployment

```bash
cd contracts

# Deploy to testnet
aptos move publish \
  --named-addresses creatorvault=YOUR_ADDRESS \
  --profile testnet

# Deploy to mainnet
aptos move publish \
  --named-addresses creatorvault=YOUR_ADDRESS \
  --profile mainnet
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript/React best practices
- Write tests for new features
- Update documentation
- Follow the existing code style
- Add comments for complex logic

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **GitHub Repository**: https://github.com/yourusername/aptoshack
- **Photon Dashboard**: https://dashboard.getstan.app
- **Shelby Explorer**: https://explorer.shelbynet.shelby.xyz
- **Aptos Explorer**: https://explorer.aptoslabs.com
- **Documentation**: See `/docs` folder

---

## 📞 Support

For questions or support:
- **GitHub Issues**: https://github.com/yourusername/aptoshack/issues
- **Email**: support@creatorcoin.io
- **Discord**: [Join our Discord](https://discord.gg/creatorcoin)

---

## 🙏 Acknowledgments

- **Aptos Foundation** - Blockchain infrastructure
- **Shelby Protocol** - Decentralized storage
- **Photon** - Rewards and engagement layer
- **Petra Wallet** - Wallet integration
- **React Community** - Frontend framework

---

**Built with ❤️ by the Creator Coin Team**

*Transform Your Content Into Digital Assets. Build Your Empire. Reward Your Holders.*

