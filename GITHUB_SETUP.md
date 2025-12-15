# Setting Up GitHub Repository

Follow these steps to upload your project to GitHub and connect it to Vercel.

## Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in:
   - **Repository name**: `fast-break` (or any name you prefer)
   - **Description**: "NBA team assignment app on Flow blockchain"
   - **Visibility**: Choose **Public** or **Private**
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

## Step 2: Connect Local Repository to GitHub

After creating the repo, GitHub will show you commands. Use these (replace `YOUR_USERNAME` with your GitHub username):

```bash
cd /Users/joshbrodie/flow-nba-assignment

# Add the remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 3: Verify on GitHub

1. Go to your repository on GitHub
2. You should see all your project files
3. Make sure `.env.local` and `YOUR_KEYS.txt` are **NOT** visible (they're in .gitignore)

## Step 4: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Click **"Import Git Repository"**
4. Select your GitHub repository
5. Configure:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: `npm run build` (should be auto-filled)
   - **Output Directory**: `.next` (should be auto-filled)
6. **Add Environment Variable**:
   - Click "Environment Variables"
   - Name: `NEXT_PUBLIC_CONTRACT_ADDRESS`
   - Value: `0x66cf7fef7cdfe96a` (your contract address)
   - Make sure it's checked for: Production, Preview, and Development
7. Click **"Deploy"**

## Step 5: Wait for Deployment

- Vercel will build and deploy your app
- This usually takes 1-2 minutes
- You'll get a URL like: `https://your-project-name.vercel.app`

## Important Notes

✅ **Safe to commit:**
- All code files
- `package.json`, `tsconfig.json`, etc.
- `data/` folder (usernames and teams)
- `.env.example` (template file)

❌ **NOT committed (protected by .gitignore):**
- `.env.local` (your actual contract address)
- `YOUR_KEYS.txt` (private keys)
- `flow.json` (contains private keys)
- `node_modules/` (dependencies)

## Troubleshooting

**"Repository not found" error:**
- Make sure you've pushed to GitHub first
- Check that the repository name matches

**Build fails on Vercel:**
- Check the build logs in Vercel dashboard
- Make sure all dependencies are in `package.json`
- Verify environment variable is set correctly

**Environment variable not working:**
- Make sure it's prefixed with `NEXT_PUBLIC_`
- Redeploy after adding environment variables

