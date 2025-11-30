# Photon SDK Integration

## Overview

Photon is a unified identity, embedded wallet, engagement, and rewards layer on Aptos. This integration enables:

- **Seamless User Onboarding**: Passwordless onboarding with embedded wallets
- **Rewarded Events**: Users earn PAT tokens for trading activities
- **Unrewarded Events**: Track engagement metrics (logins, content views, etc.)
- **User Analytics**: Track user behavior and engagement

## Setup

### 1. Get Photon API Key

1. Visit Photon dashboard to get your API key
2. Add to `.env` file:
   ```
   REACT_APP_PHOTON_API_KEY=your_api_key_here
   ```

### 2. Install PyJWT (Backend - Optional but Recommended)

For secure JWT generation on the backend:
```bash
cd backend
pip install PyJWT
```

### 3. Configure Backend JWT Secret

Add to backend `.env`:
```
PHOTON_JWT_SECRET=your_secure_secret_key_here
```

## Features

### Auto-Registration

Users are automatically registered with Photon when they connect their wallet. No additional steps required!

### Rewarded Events (Earn PAT Tokens)

Users automatically earn PAT tokens for:

- **Token Purchase**: Buying creator tokens
- **Token Sell**: Selling tokens
- **First Trade**: First trade bonus (can be configured)
- **Daily Trade**: Daily trading rewards (can be configured)
- **Referrals**: Referral bonuses (can be configured)

### Unrewarded Events (Tracking Only)

These events are tracked but don't issue PAT tokens:

- **Login**: User login tracking
- **Content View**: Premium content views
- **Token Share**: Sharing tokens
- **Token Creation**: Creating new tokens

## API Endpoints

### Frontend Service (`photonService.ts`)

- `registerPhotonUser(jwtToken, clientUserId)`: Register user with Photon
- `triggerRewardedEvent(...)`: Trigger rewarded event (earn PAT tokens)
- `triggerUnrewardedEvent(...)`: Track unrewarded event
- `generatePhotonJWT(...)`: Generate JWT (calls backend)

### Backend Endpoints

- `POST /api/photon/generate-jwt`: Generate secure JWT for Photon registration

## Usage Examples

### In Components

```typescript
import { usePhoton } from '../contexts/PhotonContext'

const MyComponent = () => {
  const { 
    rewardTokenPurchase, 
    rewardTokenSell, 
    trackContentView,
    isPhotonRegistered 
  } = usePhoton()
  
  // Reward user for purchase
  await rewardTokenPurchase('TOKEN', 100, 0.5)
  
  // Track content view
  await trackContentView('content-123')
}
```

## Campaign Configuration

Campaign IDs are defined in `photonService.ts`:

```typescript
export const PHOTON_CAMPAIGNS = {
  TOKEN_PURCHASE: 'token_purchase_campaign',
  TOKEN_SELL: 'token_sell_campaign',
  // ... more campaigns
}
```

**Note**: You need to create these campaigns in the Photon dashboard first!

## Benefits

1. **Higher Engagement**: Users earn rewards for trading
2. **Better Retention**: Gamification through PAT token rewards
3. **User Analytics**: Track user behavior and engagement
4. **Embedded Wallets**: Seamless onboarding without wallet setup
5. **Unified Identity**: Single identity across all Photon-powered apps

## Next Steps

1. Get your Photon API key from the dashboard
2. Create campaigns in Photon dashboard for:
   - Token purchase rewards
   - Token sell rewards
   - First trade bonus
   - Daily trading rewards
3. Configure reward amounts in Photon dashboard
4. Test the integration with test events

## Testing

For testing JWT generation locally, you can use:
- http://jwtbuilder.jamiekurtz.com/
- Or use the backend endpoint (recommended)

## Support

- Photon API Docs: https://stage-api.getstan.app/identity-service/api/v1
- Photon Dashboard: (Get your API key here)

