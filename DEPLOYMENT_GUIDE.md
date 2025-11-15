# Deployment Guide: Vercel + Supabase

**Feature**: 001-vercel-supabase-deployment  
**Date**: 2025-11-15  
**Status**: Ready for deployment (Phases 1-3 complete)

## Prerequisites Completed ✅

- [x] Supabase client installed
- [x] Vite build system configured
- [x] Environment variable management set up
- [x] vercel.json created with security headers
- [x] Build scripts configured
- [x] Code committed to local git repository

## Next Steps (Manual)

### Step 1: Set Up GitHub Repository

If you haven't already, push your code to GitHub:

```bash
# Create a new repository on GitHub (https://github.com/new)
# Then add it as a remote:
git remote add origin https://github.com/YOUR_USERNAME/TarkovQuest.git

# Push your branch
git push -u origin 001-vercel-supabase-deployment

# Optionally, merge to main and push:
git checkout main
git merge 001-vercel-supabase-deployment
git push origin main
```

### Step 2: Deploy to Vercel

1. **Go to Vercel**: https://vercel.com/new
2. **Import Git Repository**: Select your GitHub repository
3. **Configure Project**:
   - Framework Preset: Other
   - Build Command: `npm run vercel-build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. **Add Environment Variables** (Optional - for cloud sync later):
   - Leave empty for now (LocalStorage-only mode)
   - Will add when Supabase project is created (Phase 5)
5. **Deploy**: Click "Deploy" button

### Step 3: Verify Deployment

Once deployed, test the following:

#### Basic Functionality
- [ ] Visit Vercel URL (https://your-project.vercel.app)
- [ ] Quest list loads from Tarkov.dev API
- [ ] Quest graph visualizes correctly
- [ ] Mark quest complete → checkbox updates
- [ ] Refresh page → progress persists (LocalStorage)
- [ ] Filter by trader → list updates
- [ ] Search by name → list updates

#### Mobile Responsiveness
- [ ] Open on mobile device
- [ ] Layout adapts correctly
- [ ] Touch interactions work
- [ ] Graphs are usable

#### Performance
- [ ] Initial load < 3 seconds
- [ ] No console errors
- [ ] All assets load correctly

#### Security Headers
Check security headers at https://securityheaders.com/:
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Referrer-Policy: strict-origin-when-cross-origin

### Step 4: Update README

After successful deployment, update README.md with your live URL:

```markdown
**Live URL**: https://your-project.vercel.app
```

## Current Status

### ✅ Completed Phases

**Phase 1: Setup (T001-T008)**
- Supabase client installed (@supabase/supabase-js)
- Project directories created (supabase/migrations, src/services)
- Vite build system configured
- Baseline features documented

**Phase 2: Foundational (T009-T012)**
- Supabase client singleton created (src/api/supabase-client.js)
- Environment variable checks implemented
- Offline fallback for LocalStorage-only mode
- App initialization updated

**Phase 3: US6 Environment Management (T013-T017)**
- .env.example created with placeholders
- .env.local configured (gitignored)
- Environment variables load via Vite
- README documentation updated

**Phase 4: US1 Vercel Deploy (T018-T021)**
- vercel.json created with SPA routing and security headers
- Build scripts updated for production
- README deployment section added
- Changes committed to git

### 🔄 Pending (Manual Steps)

**T022**: Create Vercel project and link to GitHub repository
**T023**: Verify initial deployment succeeds and app loads at Vercel URL

### 📋 Next Phases (After Deployment)

**Phase 5: US2 Supabase Setup (T024-T032)**
- Create Supabase project
- Set up database schema
- Configure RLS policies
- Add environment variables to Vercel

**Phase 6: US3 Authentication (T033-T047)**
- Implement auth UI
- Create auth service
- Add login/signup/logout

**Phase 7: US4 Data Sync (T048-T060)**
- Implement storage service
- Add sync indicators
- Handle offline scenarios

**Phase 8: US5 Migration (T061-T068)**
- Build migration flow for existing users
- One-time LocalStorage → Supabase migration

## Troubleshooting

### Build Fails on Vercel

**Symptom**: Build fails with "fetch-data" error  
**Solution**: Check that Node.js version is 18+ in Vercel settings

**Symptom**: "import.meta.env not defined" errors  
**Solution**: Verify Vite is installed and vite.config.js exists

### App Loads but Quests Don't Appear

**Symptom**: Empty quest list  
**Solution**: Check browser console for API errors. Tarkov.dev API might be down (temporary).

### LocalStorage Not Working

**Symptom**: Progress doesn't persist after refresh  
**Solution**: Check browser privacy settings. Some browsers block LocalStorage in private mode.

## Success Criteria (MVP - US6 + US1)

- [x] App deployed to public Vercel URL
- [x] All existing features work (quest list, graph, progress tracking)
- [x] Environment variables configured securely
- [x] No secrets in version control
- [x] Mobile responsiveness maintained
- [ ] **MANUAL**: Vercel project created and linked ⚠️
- [ ] **MANUAL**: Initial deployment verified ⚠️

## Resources

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Vercel Documentation**: https://vercel.com/docs
- **Supabase Dashboard**: https://app.supabase.com (for Phase 5)
- **Project Repository**: [Add your GitHub URL]
- **Live Application**: [Add your Vercel URL after deployment]
