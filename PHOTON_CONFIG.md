# Photon Configuration

## Environment Variables

Create a `.env` file in the root directory (`algos2/contentvault/`) with the following:

```bash
# Photon Configuration (for rewards)
REACT_APP_PHOTON_API_KEY=7bc5d06eb53ad73716104742c7e8a5377da9fe8156378dcfebfb8253da4e8800
REACT_APP_PHOTON_CAMPAIGN_ID=ea3bcaca-9ce4-4b54-b803-8b9be1f142ba
REACT_APP_PHOTON_BASE_URL=https://stage-api.getstan.app/identity-service/api/v1
```

**Note:** In React/Vite, environment variables must be prefixed with `REACT_APP_` to be accessible in the frontend.

## Current Configuration

The code has these values set as **defaults**, so it will work even without a `.env` file:

- **API Key**: `7bc5d06eb53ad73716104742c7e8a5377da9fe8156378dcfebfb8253da4e8800`
- **Campaign ID**: `ea3bcaca-9ce4-4b54-b803-8b9be1f142ba`
- **Base URL**: `https://stage-api.getstan.app/identity-service/api/v1`

## Backend Configuration (Optional)

If you want to configure JWT secret for backend JWT generation, add to backend `.env`:

```bash
PHOTON_JWT_SECRET=your_secure_secret_key_here
```

## Verification

To verify the configuration is loaded:

1. **Check Browser Console**: Look for Photon logs
2. **Check Status Widget**: Should show "Photon Active" when wallet is connected
3. **Check Network Tab**: API calls should use correct base URL and API key

## Testing

After setting up `.env`:

1. Restart the dev server: `npm run dev`
2. Connect your wallet
3. Check the Photon status widget (bottom-right)
4. Try buying/selling tokens to trigger events
5. Monitor in browser console and status widget

## Security Note

- **Never commit `.env` files** to git (already in `.gitignore`)
- Use `.env.example` for documentation
- For production, use secure environment variable management
- Rotate API keys regularly

