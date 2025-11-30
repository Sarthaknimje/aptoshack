# 🎯 Creator Coin - PowerPoint Presentation Content

## Slide 1: Title & Problem Statement

### Title
**Creator Coin: Decentralized Social Media Platform**
*Transform Your Content Into Digital Assets. Build Your Empire. Reward Your Holders.*

### Subtitle
Tokenized Creator Economy on Aptos Blockchain

---

### Problem Statement

**Traditional Social Media Challenges:**
- ❌ Limited monetization options for creators
- ❌ No direct investment opportunities for fans
- ❌ Centralized storage (censorship risk)
- ❌ Creators don't own their audience
- ❌ No engagement rewards system

**Our Solution:**
- ✅ Direct investment via creator tokens
- ✅ Premium content gating
- ✅ Decentralized storage (Shelby Protocol)
- ✅ Creator earns 5% on every trade
- ✅ Photon rewards for engagement

---

## Slide 2: Architecture & System Flow

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Social Feed  │  │ Trading      │  │ Creator      │      │
│  │              │  │ Marketplace  │  │ Profile      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Create Post │  │ Premium      │  │ Photon       │      │
│  │              │  │ Content Gate│  │ Rewards      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Posts API    │  │ Trading API  │  │ Shelby API   │      │
│  │              │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Photon API   │  │ YouTube API  │  │ Database     │      │
│  │              │  │              │  │ (SQLite)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   APTOS      │  │   SHELBY     │  │   PHOTON     │
│  BLOCKCHAIN  │  │   PROTOCOL   │  │     API      │
│              │  │              │  │              │
│ Smart        │  │ Blob Storage │  │ Rewards &    │
│ Contracts    │  │ CLI          │  │ Analytics    │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Technology Stack

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS + Framer Motion
- Vite Build System

**Backend:**
- Flask (Python)
- SQLite Database
- RESTful API

**Blockchain:**
- Aptos (Move Smart Contracts)
- Petra Wallet Integration

**Storage:**
- Shelby Protocol (Decentralized Blob Storage)

**Rewards:**
- Photon SDK (PAT Tokens)

---

## Slide 3: Core Features & Workflow

### Key Features

#### 1. **Creator Coin System** 🪙
- One token per creator
- Bonding curve pricing
- Creator earns 5% on every trade
- Real-time price charts

#### 2. **Social Media Feed** 📱
- Text, Image, Video, Reel, Audio posts
- All content on Shelby Protocol
- Premium content gating
- Engagement metrics

#### 3. **Premium Content Gating** 🔒
- Free content: Visible to all
- Premium content: Token-required
- "Invest to See" mechanism
- Automatic access revocation

#### 4. **Trading Marketplace** 💹
- Instant buy/sell tokens
- Bonding curve pricing
- Portfolio tracking
- Transaction history

#### 5. **Photon Rewards** ⚡
- PAT tokens for engagement
- Rewarded events: Buy, Sell, Create
- Real-time notifications
- Analytics dashboard

---

### User Flow

```
┌─────────────┐
│   CREATOR   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Create Token    │
│ (Creator Coin)  │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Upload Content  │
│ to Shelby       │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Publish Post    │
│ (Premium/Free)  │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Users See Post  │
│ (Blurred if     │
│  Premium)       │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ User Clicks     │
│ "Invest to See" │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Buy Creator     │
│ Tokens          │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Unlock Premium  │
│ Content         │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Earn PAT Tokens │
│ (Photon Reward) │
└─────────────────┘
```

---

## Slide 4: Smart Contracts & Blockchain Integration

### Smart Contract Architecture

**Contract:** `creator_token.move` (Aptos Move)

#### Key Functions

```move
// Initialize Creator Token
initialize(creator, token_id, name, symbol, total_supply, initial_price)

// Buy Tokens (Increases Supply & Price)
buy_tokens(buyer, creator_address, token_id, apt_amount)
→ Returns: (tokens_received, new_price)

// Sell Tokens (Decreases Supply & Price)
sell_tokens(seller, creator_address, token_id, token_amount, min_apt)
→ Returns: apt_received

// Get Current Price
get_current_price(creator_address, token_id)
→ Returns: current_price
```

### Bonding Curve Formula

```
Price = (APT_Reserve × K) / Token_Supply

Where:
- APT_Reserve = Total APT in bonding curve
- Token_Supply = Current token supply
- K = Constant (maintains liquidity)
```

### Creator Fee Model

- **Buy Transaction**: 5% of APT goes to creator
- **Sell Transaction**: 5% of tokens go to creator
- **Automatic Distribution**: Fees sent directly to creator wallet

### Security Features

- ✅ Slippage protection
- ✅ Reentrancy protection
- ✅ Access control
- ✅ Overflow/underflow protection
- ✅ Minimum amount validation

### Contract Deployment

- **Network**: Aptos Testnet
- **Module Address**: `0xfbc34c56aab6dcbe5aa1c9c47807e8fc80f0e674341b11a5b4b6a742764cd0e2`
- **Module Name**: `creator_token`

---

## Slide 5: Integration Details & Use Cases

### Shelby Protocol Integration

**Purpose**: Decentralized blob storage for all content

**Features:**
- Permanent storage on decentralized network
- Expiration management
- Explorer links for verification
- CLI-based upload/download

**Commands:**
```bash
shelby upload <file> <blob_name> -e "in 365 days"
shelby account balance
shelby blob info <blob_name>
```

**Storage Flow:**
```
User Uploads File
    ↓
Backend Receives File
    ↓
Shelby CLI Upload Command
    ↓
Content Stored on Shelby Network
    ↓
Explorer Link Generated
    ↓
Post Created with Blob Reference
```

---

### Photon Integration

**Purpose**: Engagement tracking and rewards system

**Rewarded Events** (PAT Tokens):
- ✅ Token Purchase
- ✅ Token Sell
- ✅ Token Creation
- ✅ Post Creation

**Unrewarded Events** (Analytics):
- 📊 Content Views
- 📊 Login Tracking

**Integration Flow:**
```
User Action (Buy/Sell/Create)
    ↓
Frontend Triggers Photon Event
    ↓
Backend Generates JWT Token
    ↓
Photon API Validates Event
    ↓
PAT Tokens Minted & Distributed
    ↓
User Receives Notification
```

---

### Real-World Use Cases

#### Use Case 1: Creator Monetization
1. Creator launches token
2. Fans invest by buying tokens
3. Creator earns 5% on every trade
4. Premium content drives token demand
5. Token price increases with popularity

#### Use Case 2: Fan Investment
1. User discovers creator with premium content
2. Buys creator tokens to unlock content
3. Token price rises as creator grows
4. User can sell tokens for profit
5. Or hold for more premium content

#### Use Case 3: Content Monetization
1. Creator uploads exclusive video to Shelby
2. Sets as premium (requires 10 tokens)
3. Post appears with "Invest to See"
4. Users buy tokens to unlock
5. Creator earns from trades + engagement

---

### Key Metrics & Benefits

**For Creators:**
- 💰 Multiple revenue streams
- 📈 Direct fan investment
- 🔒 Content ownership
- 📊 Analytics dashboard
- ⚡ Instant payments

**For Users:**
- 🎯 Early investment opportunities
- 🔓 Premium content access
- 💎 Token appreciation potential
- 🎁 PAT token rewards
- 🗳️ Voting rights

**For Platform:**
- 🌐 Decentralized storage
- 🔗 Cross-platform integration
- 📱 Social media features
- 💹 Trading marketplace
- 📈 Scalable architecture

---

## Visual Elements for PPT

### Slide 1: Title Slide
- **Background**: Gradient (Purple → Blue → Amber)
- **Logo**: Creator Coin logo (if available)
- **Tagline**: "Transform Your Content Into Digital Assets"

### Slide 2: Architecture
- **Diagram**: System architecture (as shown above)
- **Colors**: 
  - Frontend: Blue
  - Backend: Green
  - Blockchain: Purple
  - Storage: Orange
  - Rewards: Yellow

### Slide 3: Features
- **Icons**: Use emoji or custom icons for each feature
- **Flow Diagram**: User journey (as shown above)
- **Colors**: Match feature categories

### Slide 4: Smart Contracts
- **Code Snippets**: Highlighted Move code
- **Formula**: Bonding curve equation (large, clear)
- **Security Badges**: Visual security features

### Slide 5: Integration & Use Cases
- **Integration Diagrams**: Shelby and Photon flows
- **Use Case Cards**: Visual cards for each use case
- **Metrics Dashboard**: Key numbers and benefits

---

## Presentation Tips

1. **Slide 1**: Start with impact - show the problem clearly
2. **Slide 2**: Architecture should be clear and easy to follow
3. **Slide 3**: Use visual flow diagrams for user journey
4. **Slide 4**: Keep code snippets minimal, focus on concepts
5. **Slide 5**: End with real-world value and benefits

### Color Scheme
- **Primary**: Purple (#8B5CF6)
- **Secondary**: Blue (#3B82F6)
- **Accent**: Amber (#F59E0B)
- **Success**: Green (#10B981)
- **Background**: Dark (#0A0A0F)

### Fonts
- **Headings**: Bold, Sans-serif (Inter, Roboto)
- **Body**: Regular, Sans-serif
- **Code**: Monospace (Fira Code, Consolas)

---

## Additional Notes for Presenter

### Key Points to Emphasize

1. **Decentralization**: Content stored on Shelby (not centralized servers)
2. **Direct Investment**: Users invest directly in creators (no middleman)
3. **Creator Earnings**: 5% on every trade (sustainable revenue)
4. **Premium Gating**: Token ownership = premium access
5. **Rewards System**: Photon PAT tokens for engagement

### Demo Flow (If Presenting Live)

1. Show social feed with posts
2. Click on premium post (shows "Invest to See")
3. Navigate to trading marketplace
4. Buy creator tokens
5. Return to post (now unlocked)
6. Show Photon reward notification

### Q&A Preparation

**Common Questions:**
- How does bonding curve work?
- What happens if creator deletes account?
- How is content stored permanently?
- How are rewards distributed?
- What's the difference from other platforms?

---

**End of Presentation Content**

