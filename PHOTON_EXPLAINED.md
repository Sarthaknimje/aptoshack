# 📚 Photon Integration - Complete Guide for Beginners

## 🎯 What is Photon?

Photon is a **unified identity, embedded wallet, engagement, and rewards layer** built on Aptos blockchain. Think of it as a system that:
- Creates wallets for users automatically
- Tracks what users do in your app
- Rewards users with PAT tokens for certain actions
- Builds user profiles and engagement analytics

---

## 📊 What Activities Are Being Tracked?

### ✅ **REWARDED Events** (Users Get PAT Tokens)

These actions **automatically mint and deposit PAT tokens** into the user's Photon wallet:

1. **Token Purchase** 🛒
   - **When**: User buys creator tokens
   - **Reward**: PAT tokens (amount set by Photon campaign)
   - **Location**: `TradingMarketplace.tsx` - when buy succeeds

2. **Token Sell** 💰
   - **When**: User sells creator tokens
   - **Reward**: PAT tokens (amount set by Photon campaign)
   - **Location**: `TradingMarketplace.tsx` - when sell succeeds

3. **Token Creation** 🎨
   - **When**: Creator creates a new token
   - **Reward**: PAT tokens (amount set by Photon campaign)
   - **Location**: `MultiPlatformTokenization.tsx` - after token is created

### 📝 **UNREWARDED Events** (No Tokens, Just Tracking)

These actions are **tracked for analytics** but **don't give PAT tokens**:

1. **Content View** 👁️
   - **When**: User views premium content
   - **Reward**: 0 PAT tokens (just tracking)
   - **Location**: `PremiumContentGate.tsx` - when user accesses premium content

2. **Login** 🔐
   - **When**: User connects wallet (future feature)
   - **Reward**: 0 PAT tokens (just tracking)

---

## 👀 Where Can You See Tracked Activities?

### 1. **Photon Status Widget** (Bottom-Right Corner)

The widget shows:
- ✅ **Status**: Active/Inactive
- 💰 **Total Rewards**: Sum of all PAT tokens earned
- 📊 **Event Counts**: Success/Error counts
- 📝 **Event Logs**: Detailed list of all events (click "Event Logs" to expand)

**How to View:**
1. Look at bottom-right corner of the app
2. Click the "Photon Active" widget to expand
3. Click "Event Logs" button to see all tracked events
4. Each event shows:
   - Event type (Token Purchase, Content View, etc.)
   - Timestamp
   - Token amount (if rewarded)
   - Success/Error status

### 2. **Browser Console** (Developer Tools)

Open browser console (F12) to see:
- `✅ Rewarded event triggered: token_purchase - X PAT tokens`
- `✅ Unrewarded event tracked: view_content`
- `📊 Photon Event Details: {...}`

### 3. **Photon Dashboard** (External)

Photon provides a dashboard where you can see:
- All user activities
- Campaign performance
- Token distribution
- User engagement metrics
- Real-time event tracking
- Reward analytics

**Access Links:**
- **Dashboard**: https://dashboard.getstan.app (Contact Photon team for access)
- **API Base**: https://stage-api.getstan.app/identity-service/api/v1
- **API Docs**: https://docs.getstan.app (Contact Photon for documentation)
- **Aptos Explorer**: https://explorer.aptoslabs.com (View blockchain transactions)

**Note**: Dashboard access requires Photon team approval. Contact Photon support for credentials.

---

## 💎 How Do PAT Tokens Actually Work?

### ✅ **YES, Users Actually Get Real PAT Tokens!**

When a **rewarded event** happens:

1. **Photon API is Called** → Your app sends event to Photon
2. **Photon Validates Event** → Checks if event is valid
3. **Photon Mints PAT Tokens** → Creates new tokens on Aptos blockchain
4. **Tokens Deposited** → Automatically sent to user's Photon embedded wallet
5. **User Can See Balance** → In their Photon wallet

### 🔍 **Where Are the Tokens Stored?**

- **Embedded Wallet**: Each user gets an automatic wallet created by Photon
- **Wallet Address**: Shown in Photon Status widget
- **On-Chain**: Tokens are real Aptos blockchain tokens (not fake!)

### 💰 **How Much Do Users Get?**

The amount is **configured in your Photon campaign**:
- Campaign ID: `ea3bcaca-9ce4-4b54-b803-8b9be1f142ba`
- Photon team sets the reward amounts per event type
- You can see the amount in the API response: `token_amount: X`

---

## 💵 Who Pays for the PAT Tokens?

### **Photon Pays for the Tokens!**

Here's how it works:

1. **Photon Platform** maintains a treasury of PAT tokens
2. **When Rewarded Event Happens**:
   - Your app calls Photon API
   - Photon validates the event
   - Photon mints/deposits tokens from their treasury
   - **You don't pay anything!**

3. **Why Photon Does This**:
   - To incentivize user engagement
   - To build their ecosystem
   - To track user behavior
   - To create loyalty programs

### 💡 **Think of it Like:**
- **You**: Provide the app and user actions
- **Photon**: Provides the rewards (PAT tokens) and infrastructure
- **Users**: Get rewarded for using your app

**You don't need to:**
- ❌ Buy tokens
- ❌ Mint tokens
- ❌ Pay transaction fees
- ❌ Manage wallets

**Photon handles everything!**

---

## 🎮 Real-World Example Flow

### Scenario: User Buys Creator Tokens

1. **User Action**: Clicks "Buy" and purchases 100 tokens
2. **Your App**: 
   - Processes the trade
   - Calls `rewardTokenPurchase()` function
3. **Photon API**:
   - Receives event: `token_purchase`
   - Validates user has Photon account
   - Checks campaign rules
   - Mints 2 PAT tokens (example amount)
4. **Blockchain**:
   - PAT tokens are minted on Aptos
   - Deposited to user's Photon wallet
5. **User Sees**:
   - In Photon Status widget: "+2 PAT" reward
   - In event logs: "Token Purchase - +2 PAT"
   - In their Photon wallet: 2 PAT tokens balance

---

## 🔧 How to Check if It's Working

### 1. **Check Photon Status Widget**
- Should show "Photon Active" (green checkmark)
- Total rewards should increase after rewarded events
- Event logs should show recent activities

### 2. **Check Browser Console**
- Look for: `✅ Rewarded event triggered: token_purchase - X PAT tokens`
- Look for: `✅ Unrewarded event tracked: view_content`
- No errors should appear

### 3. **Check Network Tab**
- Open DevTools → Network tab
- Filter by "photon" or "getstan"
- Should see successful API calls to Photon

### 4. **Check Photon Dashboard** (if you have access)
- Login to Photon dashboard
- See all events and rewards
- View user engagement metrics

---

## 📋 Current Integration Status

### ✅ **What's Working:**
- ✅ User registration with Photon
- ✅ Automatic wallet creation
- ✅ Rewarded events: Token Purchase, Token Sell, Token Creation
- ✅ Unrewarded events: Content View, Login
- ✅ Event logging in status widget
- ✅ Real-time reward tracking
- ✅ External links to Photon dashboard and API

### 🔄 **What's Being Tracked:**
- **Rewarded**: Token purchases, Token sells, Token creation
- **Unrewarded**: Content views, Login

### 📊 **Event Types:**
- `token_purchase` → Rewarded (PAT tokens)
- `token_sell` → Rewarded (PAT tokens)
- `create_token` → Rewarded (PAT tokens)
- `view_content` → Unrewarded (0 tokens, just tracking)
- `login` → Unrewarded (0 tokens, just tracking)

---

## 🎯 Summary

1. **What's Tracked**: Token purchases, sells, content views, token creation
2. **Where to See**: Photon Status widget (bottom-right), browser console, Photon dashboard
3. **Do Users Get Tokens**: YES! Real PAT tokens on Aptos blockchain
4. **Who Pays**: Photon platform (you don't pay anything)
5. **How It Works**: Photon mints tokens and deposits to user's embedded wallet automatically

**It's like a loyalty program where Photon rewards your users for engaging with your app!** 🎉

