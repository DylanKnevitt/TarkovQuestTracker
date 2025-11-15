# Quickstart Guide: Vercel + Supabase Deployment

**Feature**: 001-vercel-supabase-deployment  
**Date**: 2025-11-15  
**Audience**: Developers setting up local environment or deploying to production

## Overview

This guide walks you through setting up the Tarkov Quest Tracker with Vercel deployment and Supabase backend integration. Follow these steps to get the application running locally or deployed to production.

---

## Prerequisites

### Required Accounts
- [x] GitHub account (for version control and CI/CD)
- [x] Vercel account (free tier) - https://vercel.com/signup
- [x] Supabase account (free tier) - https://supabase.com/dashboard/sign-up

### Required Software
- [x] Node.js 18+ and npm 9+
- [x] Git 2.30+
- [x] Code editor (VS Code recommended)

### Knowledge Requirements
- Basic understanding of JavaScript ES6+
- Familiarity with Git and GitHub
- Basic SQL knowledge (helpful but not required)

---

## Part 1: Local Development Setup

### Step 1: Clone Repository

```powershell
# Clone the repository
git clone https://github.com/your-username/TarkovQuest.git
cd TarkovQuest

# Switch to deployment branch
git checkout 001-vercel-supabase-deployment

# Install dependencies
npm install
```

**Expected Output**:
```
added 123 packages, and audited 124 packages in 5s
```

### Step 2: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details:
   - **Name**: `tarkov-quest-tracker` (or your preference)
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free
4. Click "Create new project"
5. Wait 2-3 minutes for provisioning

**Note**: Save your database password - you won't see it again!

### Step 3: Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the migration SQL:

```sql
-- Create quest_progress table
CREATE TABLE public.quest_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quest_id)
);

-- Create indexes for performance
CREATE INDEX idx_quest_progress_user_id ON public.quest_progress(user_id);
CREATE INDEX idx_quest_progress_updated_at ON public.quest_progress(updated_at);

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quest_progress_updated_at
  BEFORE UPDATE ON public.quest_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security
ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view own progress
CREATE POLICY "Users can view own quest progress"
  ON public.quest_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert own progress
CREATE POLICY "Users can insert own quest progress"
  ON public.quest_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update own progress
CREATE POLICY "Users can update own quest progress"
  ON public.quest_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete own progress
CREATE POLICY "Users can delete own quest progress"
  ON public.quest_progress
  FOR DELETE
  USING (auth.uid() = user_id);
```

4. Click "Run" (or press F5)
5. Verify success: "Success. No rows returned"

### Step 4: Get Supabase Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:

   - **Project URL**: `https://xyzcompany.supabase.co`
   - **Anon/Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **DO NOT COPY** the `service_role` key (it's secret!)

### Step 5: Configure Environment Variables

1. Create `.env.local` file in project root:

```powershell
# In project root (TarkovQuest/)
New-Item -ItemType File -Path .env.local
```

2. Open `.env.local` and add:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Replace placeholders with values from Step 4
4. Verify `.env.local` is in `.gitignore`:

```powershell
Get-Content .gitignore | Select-String ".env.local"
```

**Expected Output**: `.env.local` should be listed

### Step 6: Start Development Server

```powershell
npm run dev
```

**Expected Output**:
```
VITE v4.5.0  ready in 324 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Step 7: Test Local Application

1. Open browser to http://localhost:5173/
2. You should see the Tarkov Quest Tracker interface
3. Click "Sign Up" and create a test account:
   - Email: `test@example.com`
   - Password: `testpassword123`
4. Verify account created:
   - Go to Supabase dashboard → **Authentication** → **Users**
   - You should see your test user listed

5. Mark a quest as complete
6. Refresh the page - progress should persist

**Troubleshooting**:
- If Supabase connection fails, check `.env.local` values
- If auth doesn't work, verify RLS policies are created
- Check browser console for errors

---

## Part 2: Deploying to Vercel

### Step 1: Push to GitHub

1. Create GitHub repository (if not already done):
   - Go to https://github.com/new
   - Name: `TarkovQuest`
   - Visibility: Public or Private
   - Don't initialize with README (already exists)

2. Push code to GitHub:

```powershell
# Add remote (if not already added)
git remote add origin https://github.com/your-username/TarkovQuest.git

# Push code
git add .
git commit -m "Add Supabase deployment configuration"
git push -u origin 001-vercel-supabase-deployment
```

### Step 2: Create Vercel Project

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your GitHub repository:
   - Click "Import" next to TarkovQuest
   - If not visible, click "Adjust GitHub App Permissions"
4. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)

### Step 3: Add Environment Variables in Vercel

1. In Vercel project settings, scroll to **Environment Variables**
2. Add both variables:

   **Variable 1**:
   - Name: `VITE_SUPABASE_URL`
   - Value: `https://your-project.supabase.co`
   - Environments: Production, Preview, Development (check all)

   **Variable 2**:
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: `your-anon-key-here`
   - Environments: Production, Preview, Development (check all)

3. Click "Save"

### Step 4: Create vercel.json Configuration

1. Create `vercel.json` in project root:

```powershell
New-Item -ItemType File -Path vercel.json
```

2. Add configuration:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

3. Commit and push:

```powershell
git add vercel.json
git commit -m "Add Vercel configuration"
git push
```

### Step 5: Deploy

1. Vercel will automatically detect the push and start deployment
2. Monitor progress in Vercel dashboard
3. Wait for "Deployment Ready" (typically 1-2 minutes)
4. Click "Visit" to see your deployed app

**Deployment URL Format**: `https://tarkov-quest-tracker-xyz.vercel.app`

### Step 6: Verify Production Deployment

1. Visit your Vercel deployment URL
2. Test authentication:
   - Sign up with a new account
   - Mark quests as complete
   - Log out and log back in
   - Verify progress persists

3. Test from different device:
   - Log in with same account
   - Verify progress synced

**Troubleshooting**:
- If env variables missing, redeploy after adding them
- Check Vercel deployment logs for errors
- Verify Supabase RLS policies are enabled

---

## Part 3: Supabase Production Configuration

### Step 1: Configure Email Settings (Optional)

1. In Supabase dashboard, go to **Authentication** → **Email Templates**
2. Customize email templates:
   - **Confirm signup**: Welcome email
   - **Reset password**: Password reset instructions
   - **Magic Link**: Login link (if using magic links later)

3. Configure SMTP (optional, for custom email domain):
   - Go to **Settings** → **Auth** → **SMTP Settings**
   - Add your SMTP credentials (Gmail, SendGrid, etc.)

**Note**: By default, Supabase uses their email service (free tier: 3 emails/hour)

### Step 2: Configure Auth Settings

1. Go to **Authentication** → **Settings**
2. Recommended settings:
   - **Enable Email Confirmations**: Off (for easier testing)
   - **Disable Signups**: Off (allow new users)
   - **JWT Expiry**: 3600 seconds (1 hour)
   - **Refresh Token Expiry**: 2592000 seconds (30 days)
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: `https://your-app.vercel.app/**`

3. Click "Save"

### Step 3: Monitor Usage

1. Go to **Settings** → **Billing & Usage**
2. Monitor free tier limits:
   - **Database Size**: 500 MB
   - **Bandwidth**: 2 GB
   - **Monthly Active Users**: 50,000
   - **Database Connections**: 60

3. Set up alerts (optional):
   - Click "Set up alerts"
   - Enter email for notifications
   - Set threshold (e.g., 80% of quota)

---

## Part 4: Testing Checklist

### Local Development Tests

- [ ] App loads at http://localhost:5173/
- [ ] Sign up creates new user in Supabase
- [ ] Sign in works with correct credentials
- [ ] Sign in fails with wrong credentials
- [ ] Quest completion saves to Supabase
- [ ] Quest completion persists after refresh
- [ ] Offline mode works (LocalStorage fallback)
- [ ] Sync status indicator shows correctly

### Production Deployment Tests

- [ ] App loads at Vercel URL
- [ ] HTTPS is enforced
- [ ] Sign up works in production
- [ ] Sign in works in production
- [ ] Quest progress syncs to Supabase
- [ ] Progress accessible from different device
- [ ] Existing LocalStorage progress migrates correctly
- [ ] App works offline (airplane mode test)

### Security Tests

- [ ] Environment variables not exposed in client
- [ ] User can only access own data (test with 2 accounts)
- [ ] RLS policies prevent cross-user access
- [ ] Service role key not in code or client

---

## Part 5: Common Issues & Solutions

### Issue: "Failed to fetch" errors in development

**Cause**: Supabase credentials not configured  
**Solution**:
1. Verify `.env.local` exists and has correct values
2. Restart dev server: `npm run dev`
3. Hard refresh browser (Ctrl+F5)

### Issue: "Row Level Security policy violation"

**Cause**: RLS policies not created or incorrect  
**Solution**:
1. Re-run migration SQL in Supabase SQL Editor
2. Verify policies exist: Go to **Database** → **Policies**
3. Check `quest_progress` table has 4 policies

### Issue: Vercel build fails with "Module not found"

**Cause**: Missing dependencies in package.json  
**Solution**:
```powershell
npm install @supabase/supabase-js
git add package.json package-lock.json
git commit -m "Add Supabase dependency"
git push
```

### Issue: Authentication doesn't persist after refresh

**Cause**: Session storage disabled  
**Solution**:
- Verify Supabase client initialization has `persistSession: true`
- Check browser allows localStorage
- Clear browser cache and try again

### Issue: Migration prompt shows repeatedly

**Cause**: Migration flag not saved  
**Solution**:
- Check user metadata update succeeds
- Verify `migration_completed` flag in Supabase Auth users table

### Issue: Deployment quota exceeded

**Cause**: Free tier limits reached  
**Solution**:
- Check Supabase usage dashboard
- Optimize queries to reduce bandwidth
- Consider upgrading to paid tier (if needed)

---

## Part 6: Development Workflow

### Making Changes

```powershell
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes
# (edit code)

# 3. Test locally
npm run dev

# 4. Commit and push
git add .
git commit -m "Add my feature"
git push origin feature/my-feature

# 5. Create pull request on GitHub

# 6. Vercel creates preview deployment automatically

# 7. Test preview deployment

# 8. Merge PR → Deploys to production
```

### Preview Deployments

- Every pull request gets a unique preview URL
- Test changes before merging to main
- Shares production environment variables
- Automatically deleted when PR closed

### Rolling Back Deployments

1. Go to Vercel dashboard → **Deployments**
2. Find previous working deployment
3. Click "..." → "Promote to Production"
4. Confirm rollback

---

## Part 7: Monitoring & Maintenance

### Supabase Monitoring

**Daily**:
- Check error logs: **Logs** → **Postgres Logs**
- Monitor API usage: **Settings** → **API**

**Weekly**:
- Review database size: **Database** → **Database**
- Check authentication users: **Authentication** → **Users**

**Monthly**:
- Review usage vs. free tier limits
- Optimize queries if nearing limits

### Vercel Monitoring

**Daily**:
- Check deployment status: **Deployments**
- Review function logs: **Functions** (if using)

**Weekly**:
- Monitor bandwidth usage: **Settings** → **Usage**
- Check build time trends

**Monthly**:
- Review analytics: **Analytics** (if enabled)
- Optimize bundle size if needed

---

## Part 8: Next Steps

### Optional Enhancements

1. **Custom Domain** (Vercel Pro feature):
   - Add your own domain (e.g., `quests.mytarkov.com`)
   - Configure DNS settings
   - Automatic HTTPS

2. **OAuth Providers** (future enhancement):
   - Add Google/Discord login
   - Configure in Supabase Auth → Providers

3. **Database Backups**:
   - Supabase free tier: Daily backups (7-day retention)
   - Pro tier: Point-in-time recovery

4. **Monitoring Tools**:
   - Sentry for error tracking
   - Google Analytics for usage stats
   - Uptime monitoring (e.g., UptimeRobot)

### Learning Resources

**Supabase**:
- Docs: https://supabase.com/docs
- Guides: https://supabase.com/docs/guides
- Community: https://github.com/supabase/supabase/discussions

**Vercel**:
- Docs: https://vercel.com/docs
- Guides: https://vercel.com/guides
- Community: https://github.com/vercel/vercel/discussions

**Vite**:
- Docs: https://vitejs.dev/guide/
- Config: https://vitejs.dev/config/

---

## Summary

**Setup Time**: ~30 minutes  
**Cost**: $0/month (free tier)  
**Deployment**: Automatic via GitHub push  
**Maintenance**: Minimal (check logs weekly)

**You Now Have**:
- ✅ Local development environment
- ✅ Production deployment on Vercel
- ✅ Multi-user backend with Supabase
- ✅ Automatic CI/CD pipeline
- ✅ Secure authentication
- ✅ Cloud-synced quest progress
- ✅ Offline support via LocalStorage

**Next Action**: Start using the app, invite users, monitor usage!

---

**Generated**: 2025-11-15  
**Author**: GitHub Copilot (via speckit.plan workflow)
