# 🚀 Deployment Guide

## Frontend Deployment (Vercel)

### Prerequisites
- Vercel CLI installed: `npm i -g vercel`
- Vercel account connected: `vercel login`

### Deploy Steps

1. **Build the project:**
```bash
npm run build
```

2. **Deploy to Vercel:**
```bash
vercel --prod
```

3. **Set Environment Variables in Vercel Dashboard:**
   - Go to your project settings → Environment Variables
   - Add: `VITE_BACKEND_URL` = `https://your-backend-url.railway.app` (or your backend URL)

### Environment Variables Needed:
- `VITE_BACKEND_URL` - Backend API URL
- `VITE_PHOTON_API_KEY` - Photon API key (optional)
- `VITE_PHOTON_CAMPAIGN_ID` - Photon campaign ID (optional)
- `VITE_PHOTON_BASE_URL` - Photon API base URL (optional)

---

## Backend Deployment (Railway)

### Prerequisites
- Railway CLI: `npm i -g @railway/cli`
- Railway account: https://railway.app

### Deploy Steps

1. **Install Railway CLI:**
```bash
npm i -g @railway/cli
railway login
```

2. **Initialize Railway Project:**
```bash
cd backend
railway init
```

3. **Deploy:**
```bash
railway up
```

4. **Set Environment Variables in Railway Dashboard:**
   - Go to your project → Variables
   - Add all variables from `env.template`

### Required Environment Variables:
```env
FLASK_SECRET_KEY=your-secret-key
FLASK_ENV=production
CORS_ORIGINS=https://your-frontend-url.vercel.app

YOUTUBE_CLIENT_ID=your-client-id
YOUTUBE_CLIENT_SECRET=your-client-secret
YOUTUBE_REDIRECT_URI=https://your-frontend-url.vercel.app/auth/youtube/callback
YOUTUBE_API_KEY=your-api-key

PHOTON_API_KEY=your-photon-key
PHOTON_CAMPAIGN_ID=your-campaign-id

APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com
```

5. **Get Backend URL:**
   - Railway will provide a URL like: `https://your-project.railway.app`
   - Update frontend `VITE_BACKEND_URL` with this URL

---

## Alternative: Render Deployment

### Backend on Render

1. **Create New Web Service:**
   - Connect GitHub repository
   - Root Directory: `algos2/contentvault/backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT`

2. **Set Environment Variables:**
   - Same as Railway above

3. **Get Backend URL:**
   - Render provides: `https://your-app.onrender.com`

---

## Post-Deployment Checklist

- [ ] Frontend deployed and accessible
- [ ] Backend deployed and accessible
- [ ] Environment variables set correctly
- [ ] CORS configured for frontend URL
- [ ] YouTube OAuth redirect URI updated in Google Console
- [ ] Database initialized
- [ ] Shelby CLI configured on backend server
- [ ] Test API endpoints
- [ ] Test wallet connection
- [ ] Test token creation
- [ ] Test post creation
- [ ] Test trading functionality

---

## Quick Deploy Commands

### Frontend (Vercel)
```bash
cd algos2/contentvault
npm run build
vercel --prod
```

### Backend (Railway)
```bash
cd algos2/contentvault/backend
railway login
railway init
railway up
```

### Backend (Render)
```bash
# Connect via GitHub, Render will auto-deploy
```

---

## Troubleshooting

### Frontend Issues
- **Build fails**: Check for TypeScript errors
- **API calls fail**: Verify `VITE_BACKEND_URL` is set correctly
- **CORS errors**: Check backend CORS configuration

### Backend Issues
- **Port binding**: Ensure using `$PORT` environment variable
- **Database**: SQLite works, but consider PostgreSQL for production
- **Shelby CLI**: Must be installed on server or use API
- **Timeout**: Increase gunicorn timeout for large uploads

---

## Production Considerations

1. **Database**: Migrate from SQLite to PostgreSQL
2. **Storage**: Use cloud storage for file uploads
3. **Caching**: Add Redis for API caching
4. **Monitoring**: Set up error tracking (Sentry)
5. **CDN**: Use Cloudflare for static assets
6. **SSL**: Ensure HTTPS for all endpoints

