# Data Sync Testing Guide

## Phase 7 Complete - Ready for Testing! ✅

All sync infrastructure has been implemented. You now need to test the cross-device sync and offline functionality.

---

## Test 1: Cross-Device Sync (T059)

**Goal**: Verify quest progress syncs between different devices/browsers

### Prerequisites
- Supabase configured and running
- Dev server running (`npm run dev`)
- Same user account accessible from multiple browsers

### Test Steps

1. **Device A (Primary Browser - e.g., Chrome)**
   ```
   1. Open http://localhost:8080
   2. Click "Sign In"
   3. Log in with your test account (e.g., dylan.knevitt@gmail.com)
   4. Wait for "Synced" indicator in header (green checkmark)
   5. Mark quest "Debut" as complete (click the checkbox)
   6. Verify sync indicator shows "Syncing" → "Synced"
   ```

2. **Device B (Secondary Browser - e.g., Firefox or Chrome Incognito)**
   ```
   1. Open http://localhost:8080
   2. Click "Sign In"
   3. Log in with SAME account
   4. Wait for "Synced" indicator
   5. **VERIFY**: Quest "Debut" should show as complete
   6. Mark quest "Therapist" as complete
   7. Verify sync indicator shows "Syncing" → "Synced"
   ```

3. **Back to Device A**
   ```
   1. Refresh page (F5)
   2. **VERIFY**: Quest "Therapist" should now show as complete
   ```

### Expected Results
✅ Quest completion syncs from Device A → Supabase → Device B
✅ Quest completion syncs from Device B → Supabase → Device A
✅ Sync indicator shows correct states: "syncing" → "synced"
✅ No data loss or conflicts

### If Test Fails
- Check browser console for errors
- Verify Supabase dashboard shows data in `quest_progress` table
- Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in `.env.local`
- Verify RLS policies are enabled in Supabase

---

## Test 2: Offline Mode (T060)

**Goal**: Verify offline queue works and syncs when connection returns

### Prerequisites
- Logged in with a test account
- Dev server running

### Test Steps

1. **Go Offline**
   ```
   Method 1 (Browser DevTools):
   - Press F12 to open DevTools
   - Go to Network tab
   - Check "Offline" checkbox
   
   Method 2 (System):
   - Turn on Airplane Mode
   - Or disconnect from WiFi
   ```

2. **Mark Quests While Offline**
   ```
   1. Verify sync indicator shows "Offline" (orange warning)
   2. Mark quest "Shootout Picnic" as complete
   3. Mark quest "Fishing Gear" as complete
   4. **VERIFY**: Quests show as complete in UI
   5. **VERIFY**: Sync indicator remains "Offline"
   ```

3. **Check LocalStorage Queue**
   ```
   1. Press F12 → Application tab (Chrome) or Storage tab (Firefox)
   2. Expand Local Storage → http://localhost:8080
   3. Find key: tarkov_sync_queue
   4. **VERIFY**: Should contain 2 items (Shootout Picnic, Fishing Gear)
   ```

4. **Reconnect**
   ```
   1. Uncheck "Offline" in DevTools OR turn off Airplane Mode
   2. **VERIFY**: Sync indicator changes to "Syncing" (blue spinner)
   3. Wait 2-3 seconds
   4. **VERIFY**: Sync indicator changes to "Synced" (green checkmark)
   5. **VERIFY**: tarkov_sync_queue is now empty (or check console logs)
   ```

5. **Verify Sync Completed**
   ```
   1. Open Supabase dashboard
   2. Go to Table Editor → quest_progress
   3. **VERIFY**: Both quests appear with completed=true
   4. **VERIFY**: updated_at timestamps are recent
   ```

6. **Cross-Device Verification**
   ```
   1. Open app in different browser/incognito
   2. Log in with same account
   3. **VERIFY**: "Shootout Picnic" and "Fishing Gear" show as complete
   ```

### Expected Results
✅ Offline indicator appears when connection lost
✅ Quest changes save to LocalStorage immediately
✅ Changes queue for later sync
✅ Queue automatically processes when connection restored
✅ Sync indicator shows state progression: offline → syncing → synced
✅ All queued changes successfully sync to Supabase
✅ Changes visible on other devices after sync

### If Test Fails
- Check console for sync errors
- Verify `tarkov_sync_queue` exists in LocalStorage
- Check that `storageService` and `syncService` are initialized
- Verify online/offline event listeners are attached
- Check Supabase dashboard for synced data

---

## Common Issues & Solutions

### Issue: "Cloud sync unavailable (LocalStorage only)"
**Solution**: Missing environment variables
```bash
# Create .env.local with:
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Restart dev server:
npm run dev
```

### Issue: Sync indicator stuck on "Syncing"
**Solution**: Check browser console for errors
- Possible RLS policy issue (verify policies in Supabase)
- Possible network error (check Network tab in DevTools)

### Issue: Data not syncing between devices
**Solution**: Verify you're logged in with the SAME account on both devices
- Check user email in header
- Log out and log back in if needed

### Issue: "Invalid login credentials" even with correct password
**Solution**: This was a recent bug fix - make sure you have the latest code
```bash
git pull origin main
npm run dev
```

---

## Test Completion Checklist

- [ ] T059: Cross-device sync works (mark quest on device A, verify on device B)
- [ ] T060: Offline mode works (mark quests offline, reconnect, verify sync)
- [ ] Sync indicator shows all states correctly (idle, syncing, synced, offline, error)
- [ ] No data loss during offline usage
- [ ] LWW conflict resolution works (newest timestamp wins)
- [ ] Sync queue processes automatically on reconnect

---

## Next Steps After Testing

Once both tests pass:
1. Mark T059 and T060 as complete in tasks.md
2. Commit and push all changes
3. Deploy to Vercel for production testing
4. Optionally proceed to Phase 8 (Migration Flow) if you want to support migrating existing LocalStorage users

Phase 8 is **optional** (Priority P3) - new users don't need it, only existing users with LocalStorage data.

---

## Questions?

If tests fail or you encounter issues:
1. Check browser console for errors
2. Check Supabase dashboard for data
3. Verify environment variables are set
4. Share error messages for debugging
