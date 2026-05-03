# Deployment Guide - Vercel

This guide walks you through deploying the AI Financial Fraud Detection project to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com (free tier available)
2. **GitHub Account**: Already have repository pushed (✓ done)
3. **Google Gemini API Key**: Get from https://ai.google.dev/
4. **Git**: Installed and configured

## Deployment Steps

### Step 1: Prepare Environment Variables

1. Get your **Gemini API Key**:
   - Go to https://ai.google.dev/
   - Click "Get API Key"
   - Create a new API key
   - Copy the key

### Step 2: Deploy to Vercel

#### Option A: Deploy via Vercel CLI (Recommended)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to project directory
cd "c:\Users\aksha\Documents\Projects\AI FINANCIAL FRAUD DETECTION PROJECT"

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No (first time)
# - Which scope? Select your account
# - Project name? ai-fraud-detection (or your choice)
# - Framework preset? Other
# - Root directory? ./
# - Build command? npm run build
# - Output directory? build
# - Install Command? npm install
```

#### Option B: Deploy via GitHub Integration (Easiest)

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Click "Add New..." → "Project"**
3. **Select your GitHub repository**: `AI-FRAUD-DETECTION`
4. **Configure Project**:
   - Framework Preset: Other
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Install Command: `npm install`
   - Root Directory: `./`
5. **Click "Deploy"** (this builds and deploys automatically)

### Step 3: Add Environment Variables

**In Vercel Dashboard:**

1. Go to your project → **Settings** → **Environment Variables**
2. Add the following variables:

```
GEMINI_API_KEY=<your-api-key-here>
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODELS=gemini-2.0-flash,gemini-2.0-flash-lite-001
PORT=3000
```

3. Click "Save"
4. **Important**: You need to redeploy for new environment variables to take effect:
   - Go to **Deployments** tab
   - Click on latest deployment
   - Click **"Redeploy"**

### Step 4: Verify Deployment

1. Wait for the build to complete (usually 2-5 minutes)
2. Click the deployment preview link
3. Test the application:
   - ✓ Dashboard loads
   - ✓ Try uploading a test CSV file
   - ✓ Check if analysis appears
   - ✓ Test AI chat

## Troubleshooting

### Build Fails

**Problem**: TypeScript errors during build
- **Solution**: Run `npm run build` locally first to verify. Push any fixes to GitHub. Vercel will auto-rebuild.

**Problem**: Module not found
- **Solution**: Verify `.gitignore` isn't excluding necessary files. Check `node_modules` installation.

### API Not Working

**Problem**: 502 Bad Gateway or API calls fail
- **Solution**:
  1. Check environment variables are set (GEMINI_API_KEY)
  2. Verify API key is valid at https://ai.google.dev/
  3. Check server logs: Vercel Dashboard → Function Logs

**Problem**: CORS errors
- **Solution**: Update vite.config.ts proxy if backend is separate URL

### Upload File Fails

**Problem**: "Parsing failed" error
- **Solution**:
  1. Ensure file format is CSV, XLSX, or PDF
  2. Check Vercel function timeout (set to 300s in vercel.json)
  3. Verify Gemini API rate limits not exceeded

## Current Deployment Limits (In-Memory Backend)

⚠️ **Important Limitations:**

1. **No Data Persistence**: Analysis data resets every deployment/restart
2. **Stateless**: Each request is independent
3. **File Upload Size**: Max 50MB per file (Vercel limit)
4. **Timeout**: API calls must complete within 300 seconds
5. **Concurrent Users**: Single instance (add concurrency later with database)

### To Fix These Limitations Later:

- Add MongoDB/PostgreSQL for persistent storage
- Use Vercel with multiple instances
- Implement request queuing for large files

## Production Checklist

- ✅ Code pushed to GitHub
- ✅ vercel.json configured
- ✅ .env.example created
- ✅ Environment variables added in Vercel dashboard
- ✅ Build passes locally: `npm run build`
- ✅ Application loads at production URL
- ✅ File upload works
- ✅ AI analysis runs successfully

## Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Project Settings**: https://vercel.com/dashboard/[project-name]/settings
- **Function Logs**: https://vercel.com/dashboard/[project-name]/logs/functions
- **Deployments**: https://vercel.com/dashboard/[project-name]/deployments

## Next Steps

1. **Monitor Logs**: Watch function logs for any errors
2. **Set Up Alerts**: Enable email alerts for failed deployments
3. **Plan Persistence**: Add MongoDB if you need to save analysis results
4. **Custom Domain**: Add your own domain in Settings → Domains

## Support

If deployment fails:
1. Check Vercel build logs (Dashboard → Deployments)
2. Verify environment variables match `.env.example`
3. Run `npm run build` locally and fix any errors
4. Push fixes to GitHub - Vercel will auto-redeploy

---

**Once deployed, your app URL will be**: `https://[project-name].vercel.app`
