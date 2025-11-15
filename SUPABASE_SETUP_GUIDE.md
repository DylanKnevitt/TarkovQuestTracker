# Supabase Setup Guide

**Date**: 2025-11-15  
**Status**: Ready to execute

## Prerequisites ✅

- [x] Supabase organization created
- [x] Vercel project linked to GitHub
- [ ] Supabase project created (follow steps below)

## Step-by-Step Instructions

### Step 1: Create Supabase Project

1. **Go to Supabase Dashboard**: https://app.supabase.com
2. **Click "New Project"**
3. **Fill in project details**:
   - **Name**: `tarkov-quest-tracker` (or your preferred name)
   - **Database Password**: Create a strong password and **SAVE IT SECURELY**
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
   - **Pricing Plan**: Free tier (500 MB database, 50k MAU)
4. **Click "Create new project"**
5. **Wait 2-3 minutes** for project provisioning

### Step 2: Copy API Credentials

Once your project is ready:

1. **Go to Project Settings** (⚙️ icon in sidebar)
2. **Click "API"** in the left menu
3. **Copy these values**:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`

**Save these values** - you'll need them for Step 4.

### Step 3: Run Database Migration

1. **In Supabase Dashboard**, click **"SQL Editor"** in the sidebar (</> icon)
2. **Click "New query"**
3. **Copy the entire contents** of `supabase/migrations/001_initial_schema.sql`
4. **Paste into the SQL Editor**
5. **Click "Run"** (or press Ctrl+Enter)
6. **Verify success**: You should see "Success. No rows returned"

### Step 4: Verify Database Structure

**Check Tables:**
1. Click **"Database"** → **"Tables"** in sidebar
2. You should see table: `quest_progress`
3. Click on `quest_progress` to view schema:
   - `user_id` (uuid)
   - `quest_id` (text)
   - `completed` (bool)
   - `completed_at` (timestamptz)
   - `updated_at` (timestamptz)

**Check Policies:**
1. In the table view, click the **"Policies"** tab
2. You should see 4 RLS policies:
   - ✅ Users can view own quest progress (SELECT)
   - ✅ Users can insert own quest progress (INSERT)
   - ✅ Users can update own quest progress (UPDATE)
   - ✅ Users can delete own quest progress (DELETE)

### Step 5: Configure Email Authentication

1. **Go to Authentication** → **"Providers"** in sidebar
2. **Verify Email provider is enabled** (should be enabled by default)
3. **Optional**: Configure email templates
   - Click **"Email Templates"** in sidebar
   - Customize signup confirmation, password reset emails

### Step 6: Add Environment Variables to Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your TarkovQuest project**
3. **Click "Settings"** → **"Environment Variables"**
4. **Add variable 1**:
   - **Key**: `VITE_SUPABASE_URL`
   - **Value**: Your Project URL from Step 2
   - **Environment**: Production, Preview, Development (select all)
   - Click "Save"
5. **Add variable 2**:
   - **Key**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: Your anon public key from Step 2
   - **Environment**: Production, Preview, Development (select all)
   - Click "Save"

### Step 7: Update Local Environment

1. **Open `.env.local`** in your local project
2. **Update with your Supabase credentials**:
   ```env
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. **Save the file**

### Step 8: Redeploy Vercel (to load new env vars)

1. **Go to Vercel Dashboard** → Your project
2. **Click "Deployments"** tab
3. **Find the latest deployment**
4. **Click "⋯" menu** → **"Redeploy"**
5. **Click "Redeploy"** to confirm
6. **Wait for deployment** to complete

### Step 9: Test Supabase Connection

**Test Locally:**
1. Start your dev server: `npm run dev`
2. Open browser console (F12)
3. Look for: `"Supabase client initialized successfully"`
4. Should NOT see: `"Supabase environment variables not configured"`

**Test on Vercel:**
1. Visit your Vercel URL
2. Open browser console (F12)
3. Verify same success message appears

### Step 10: Create Test User

1. **In Supabase Dashboard**, go to **"Authentication"** → **"Users"**
2. **Click "Add user"** → **"Create new user"**
3. **Fill in**:
   - **Email**: `test@example.com`
   - **Password**: `TestPassword123!`
   - **Auto Confirm User**: ✅ (check this box)
4. **Click "Create user"**
5. **User should appear** in the users list

### Step 11: Test RLS Policies

Run this test in Supabase SQL Editor:

```sql
-- 1. Create a test quest progress entry
-- (Replace 'USER_ID_HERE' with the UUID from Authentication > Users)
INSERT INTO public.quest_progress (user_id, quest_id, completed)
VALUES ('USER_ID_HERE', 'test-quest-001', true);

-- 2. Verify you can query your own data
SELECT * FROM public.quest_progress 
WHERE user_id = 'USER_ID_HERE';

-- 3. Try to query another user's data (should return empty)
-- Create a second test user first, then try to query as User A:
-- This should return 0 rows due to RLS
SELECT * FROM public.quest_progress 
WHERE user_id = 'OTHER_USER_ID';

-- 4. Clean up test data
DELETE FROM public.quest_progress WHERE quest_id = 'test-quest-001';
```

## Success Checklist ✅

- [ ] Supabase project created and provisioned
- [ ] Database migration ran successfully
- [ ] `quest_progress` table exists with 5 columns
- [ ] 4 RLS policies created and enabled
- [ ] Email authentication provider enabled
- [ ] Environment variables added to Vercel (2 variables)
- [ ] Local `.env.local` updated with credentials
- [ ] Vercel redeployed with new environment variables
- [ ] Local app shows "Supabase client initialized successfully"
- [ ] Deployed app shows "Supabase client initialized successfully"
- [ ] Test user created in Supabase Auth
- [ ] RLS policies tested and working (users isolated)

## Troubleshooting

### Issue: "Migration failed" or SQL errors

**Solution**: 
- Make sure you copied the ENTIRE migration file
- Check for any copy/paste formatting issues
- Try running the migration in sections if needed

### Issue: "RLS policies not found"

**Solution**:
- Verify RLS is enabled: `ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;`
- Re-run the policy creation SQL
- Refresh the Supabase dashboard

### Issue: "Supabase client not initialized" in browser console

**Solution**:
- Verify environment variables are set in Vercel dashboard
- Redeploy Vercel to load new env vars
- Check `.env.local` has correct values locally
- Restart dev server: `npm run dev`

### Issue: "Invalid API key" errors

**Solution**:
- Double-check you copied the **anon public key**, not the service role key
- Verify no extra spaces/newlines in environment variables
- Re-copy from Supabase dashboard Project Settings → API

## Next Steps

After completing this setup:

1. **Commit the migration file**:
   ```bash
   git add supabase/migrations/001_initial_schema.sql
   git commit -m "feat: Add Supabase database migration for quest_progress table"
   git push origin main
   ```

2. **Update tasks.md** - Mark T024-T032 as complete

3. **Move to Phase 6: Authentication** - Implement login/signup UI

4. **Test end-to-end flow**:
   - User signs up
   - Quest progress saves to Supabase
   - Data syncs across devices

## Resources

- **Supabase Dashboard**: https://app.supabase.com
- **Supabase Docs**: https://supabase.com/docs
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **Migration File**: `supabase/migrations/001_initial_schema.sql`
- **Data Model Spec**: `specs/001-vercel-supabase-deployment/data-model.md`
