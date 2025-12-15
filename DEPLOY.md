# Deployment Guide for Fast-BREAK

This guide will help you deploy your Fast-BREAK app so your coworkers can access it.

## Option 1: Deploy to Vercel (Recommended - Easiest)

Vercel is the easiest way to deploy Next.js apps and it's free for personal projects.

### Steps:

1. **Install Vercel CLI** (if you haven't already):
```bash
npm install -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy from your project directory**:
```bash
cd /Users/joshbrodie/flow-nba-assignment
vercel
```

4. **Follow the prompts**:
   - Set up and deploy? **Yes**
   - Which scope? (Choose your account)
   - Link to existing project? **No**
   - Project name? (Use default or choose a name)
   - Directory? **./** (current directory)
   - Override settings? **No**

5. **Set Environment Variables**:
   After deployment, go to your Vercel dashboard:
   - Go to your project → Settings → Environment Variables
   - Add: `NEXT_PUBLIC_CONTRACT_ADDRESS` with your contract address value
   - Make sure it's set for "Production", "Preview", and "Development"

6. **Redeploy**:
```bash
vercel --prod
```

Your app will be live at: `https://your-project-name.vercel.app`

## Option 2: Deploy via Vercel Dashboard (No CLI)

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "Add New Project"
3. Import your Git repository (GitHub/GitLab/Bitbucket)
   - If not using Git, you can drag and drop your project folder
4. Configure:
   - Framework Preset: **Next.js**
   - Root Directory: **./**
5. Add Environment Variable:
   - Name: `NEXT_PUBLIC_CONTRACT_ADDRESS`
   - Value: Your contract address (e.g., `0x66cf7fef7cdfe96a`)
6. Click "Deploy"

## Option 3: Quick Share with ngrok (Temporary Testing)

For quick testing without permanent deployment:

1. **Install ngrok**:
```bash
brew install ngrok
# Or download from https://ngrok.com/download
```

2. **Start your local server**:
```bash
npm run dev
```

3. **In another terminal, start ngrok**:
```bash
ngrok http 3000
```

4. **Share the ngrok URL** (e.g., `https://abc123.ngrok.io`) with your coworkers

**Note:** The free ngrok URL changes each time you restart it. For a permanent URL, you need a paid plan.

## Option 4: Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add environment variable: `NEXT_PUBLIC_CONTRACT_ADDRESS`
5. Railway will automatically detect Next.js and deploy

## Option 5: Deploy to Netlify

1. Go to [netlify.com](https://netlify.com) and sign up
2. Drag and drop your project folder OR connect Git repository
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Add environment variable: `NEXT_PUBLIC_CONTRACT_ADDRESS`
5. Deploy

## Important Notes

### Environment Variables
Make sure `NEXT_PUBLIC_CONTRACT_ADDRESS` is set in your deployment platform:
- Value: `0x66cf7fef7cdfe96a` (your contract address)
- Must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser

### Before Deploying

1. **Make sure `.env.local` is NOT committed to Git** (it's in `.gitignore`)
2. **Update usernames** in `data/usernames.json` if needed
3. **Test locally** first: `npm run build && npm start`

### After Deployment

1. Share the deployment URL with your coworkers
2. They'll need to:
   - Connect their Flow wallet (Blocto, Ledger, etc.)
   - Make sure they're on **testnet** (not mainnet)
   - Have testnet FLOW tokens for gas fees

## Troubleshooting

- **"Contract not found" error**: Check that `NEXT_PUBLIC_CONTRACT_ADDRESS` is set correctly
- **Build fails**: Make sure all dependencies are in `package.json`
- **Wallet won't connect**: Ensure the app is using testnet endpoints (check `lib/flow.config.ts`)

## Recommended: Vercel

For Next.js apps, **Vercel is the easiest and fastest option**. It's free, handles builds automatically, and provides HTTPS out of the box.

