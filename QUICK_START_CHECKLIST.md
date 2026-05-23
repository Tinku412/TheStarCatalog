# 🚀 Quick Start Checklist

## Before You Begin
- [ ] Sign up for Supabase account at https://supabase.com

## Supabase Setup (15 minutes)

### 1. Create Project
- [ ] Create new Supabase project
- [ ] Note down your database password
- [ ] Wait for project to initialize

### 2. Setup Database
- [ ] Go to SQL Editor
- [ ] Open `supabase-schema.sql`
- [ ] Copy and paste entire contents
- [ ] Click Run
- [ ] Verify "Success" message

### 3. Create Storage Bucket
- [ ] Go to Storage section
- [ ] Click "Create bucket"
- [ ] Name: `profile-pictures`
- [ ] Toggle "Public bucket" ON
- [ ] Click Create

### 4. Setup Storage Policies
- [ ] Click on `profile-pictures` bucket
- [ ] Go to Policies tab
- [ ] Add INSERT policy (allow uploads)
- [ ] Add SELECT policy (allow viewing)

### 5. Get API Credentials
- [ ] Go to Settings > API
- [ ] Copy "Project URL"
- [ ] Copy "anon public" key

### 6. Configure Frontend
- [ ] Open `admin.js`
- [ ] Replace `YOUR_SUPABASE_URL` with your Project URL
- [ ] Replace `YOUR_SUPABASE_ANON_KEY` with your anon key
- [ ] Save file

## Testing (5 minutes)

### 7. Test Form Submission
- [ ] Open `admin.html` in browser
- [ ] Fill out all required fields
- [ ] Upload a test image (< 5MB)
- [ ] Click "Submit Profile"
- [ ] Look for success notification

### 8. Verify in Supabase
- [ ] Go to Table Editor
- [ ] Select `SC_profiles` table
- [ ] Verify your test entry appears
- [ ] Go to Storage > `profile-pictures`
- [ ] Verify image was uploaded

## Done! ✅

Your admin panel is now connected to Supabase and ready to accept submissions.

## Need Help?

- **Setup issues?** → Check `SUPABASE_SETUP_GUIDE.md`
- **Want details?** → Read `IMPLEMENTATION_SUMMARY.md`
- **Database questions?** → Review `supabase-schema.sql` comments

## Common Issues

**"Invalid API Key"**
- Double-check you copied the anon public key (not service_role)
- Remove any extra spaces

**"Bucket not found"**
- Verify bucket name is exactly `profile-pictures`
- Make sure bucket is set to public

**"Image won't upload"**
- Check file size (must be < 5MB)
- Verify storage policies are enabled
- Check browser console for errors

## What's Next?

Once everything is working:
1. Test with real data
2. Set up authentication (optional)
3. Build admin dashboard to manage submissions
4. Connect index.html to load profiles from Supabase
5. Add search and filter functionality

---

**Estimated Total Setup Time:** 20-30 minutes

Good luck! 🎉

