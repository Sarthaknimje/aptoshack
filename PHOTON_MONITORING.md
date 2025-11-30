# Photon Integration Monitoring Guide

## How to Monitor Photon Integration

### 1. **Visual Status Widget** (Bottom Right Corner)

A Photon status widget appears in the bottom-right corner of the app when Photon is active. It shows:

- **Status**: Active/Inactive indicator
- **Total Rewards**: Cumulative PAT tokens earned
- **Event Counts**: Success/error statistics
- **User Info**: Photon user ID
- **Wallet Address**: Embedded wallet address
- **Event Logs**: Real-time event tracking

**To view:**
- Click the widget to expand and see detailed information
- Click "Event Logs" to see all tracked events
- Events are color-coded:
  - 🟢 Green = Successful
  - 🔴 Red = Error
  - 🟡 Yellow = Rewarded (shows PAT amount)

### 2. **Browser Console**

Open your browser's Developer Console (F12 or Cmd+Option+I) to see detailed logs:

#### Registration Logs
```
✅ Photon user registered: {...}
📊 Photon Registration Details:
  - userId: 4cc9df20-8e0b-4f32-8945-b67eea40b6cf
  - walletAddress: 0xb1fd4af46745078d3712431eaa95029016960ae0220d64fe369a7cb55b56b2d7
  - hasAccessToken: true
```

#### Event Logs
```
✅ Rewarded event triggered: token_purchase - 0.05 PAT tokens
📊 Photon Event Details:
  - eventId: token_purchase_1234567890_abc123
  - eventType: token_purchase
  - tokenAmount: 0.05
  - campaignId: ea3bcaca-9ce4-4b54-b803-8b9be1f142ba
  - success: true
```

#### Error Logs
```
❌ Error triggering rewarded event: 400 Bad Request
⚠️ Photon reward failed (non-critical): ...
```

### 3. **Network Tab (Browser DevTools)**

Monitor API calls in the Network tab:

1. Open DevTools (F12)
2. Go to "Network" tab
3. Filter by "getstan" or "photon"
4. Look for:
   - `POST /identity/register` - User registration
   - `POST /attribution/events/campaign` - Event tracking

**Check Request Headers:**
- `X-Api-Key`: Should be your API key
- `Authorization`: Should have `Bearer <access_token>` for events

**Check Response:**
- Status: 200 = Success
- Response body should contain `"success": true`
- For rewarded events, check `token_amount` in response

### 4. **What to Look For**

#### ✅ Success Indicators:
- Status widget shows "Photon Active"
- Console shows "✅ Photon user registered"
- Events show "✅ Rewarded event triggered" with PAT amount
- Network requests return 200 status
- Event logs show green checkmarks

#### ❌ Error Indicators:
- Status widget shows "Photon Inactive"
- Console shows "❌ Error" messages
- Network requests return 400/401/500 status
- Event logs show red X marks
- Missing access token in registration response

### 5. **Common Issues & Solutions**

#### Issue: "Photon not registered"
**Solution:** 
- Check if wallet is connected
- Check console for registration errors
- Verify API key is correct

#### Issue: "Authorization failed" (401)
**Solution:**
- Access token may have expired
- Re-register user to get new token
- Check if token is being stored correctly

#### Issue: "Event not triggering"
**Solution:**
- Check if user is registered (status widget)
- Verify access token exists
- Check network tab for failed requests
- Verify campaign ID is correct

#### Issue: "0 PAT tokens" for rewarded events
**Solution:**
- Check campaign configuration in Photon dashboard
- Verify event type matches campaign rules
- Check if campaign is set to reward (not just track)

### 6. **Testing Checklist**

- [ ] Wallet connects → Photon auto-registers
- [ ] Status widget appears and shows "Active"
- [ ] Console shows registration success
- [ ] Buy tokens → Rewarded event triggers
- [ ] Sell tokens → Rewarded event triggers
- [ ] View premium content → Unrewarded event tracks
- [ ] Create token → Unrewarded event tracks
- [ ] Event logs show in status widget
- [ ] PAT tokens accumulate in total rewards

### 7. **Photon Dashboard** (If Available)

If Photon provides a dashboard:
- Log in to Photon dashboard
- View user registrations
- Check event analytics
- Monitor PAT token distributions
- View campaign performance

### 8. **Debug Mode**

To enable more verbose logging, add to console:
```javascript
localStorage.setItem('photon_debug', 'true')
```

Then check console for detailed logs of:
- All API requests/responses
- Token storage/retrieval
- Event processing steps

### 9. **Quick Health Check**

Run this in browser console:
```javascript
// Check Photon status
const photonUser = localStorage.getItem('photon_user')
const photonTokens = localStorage.getItem('photon_tokens')
const photonWallet = localStorage.getItem('photon_wallet')

console.log('Photon Status:', {
  registered: !!photonUser,
  hasTokens: !!photonTokens,
  hasWallet: !!photonWallet,
  user: photonUser ? JSON.parse(photonUser) : null,
  tokens: photonTokens ? JSON.parse(photonTokens) : null
})
```

This will show you the current Photon state stored in your browser.

