# Spells Directory - Setup Guide

## Overview
This guide will help you set up the Spells Directory website with Supabase for database storage and image hosting.

## Prerequisites
- A Supabase account (free tier available at https://supabase.com)

## Step 1: Supabase Setup

### 1.1 Create a Supabase Project
1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in your project details:
   - Name: `spells-directory`
   - Database Password: (choose a secure password)
   - Region: (select closest to your users)
4. Click "Create new project"

### 1.2 Create the Database Table
1. In your Supabase dashboard, go to "Table Editor"
2. Click "Create a new table"
3. Use the following SQL query in the SQL Editor instead:

```sql
CREATE TABLE spellcasters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    about TEXT,
    description TEXT,
    image_url TEXT,
    categories TEXT[],
    specialities TEXT[],
    contact_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE spellcasters ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow anyone to insert (for public form submission)
CREATE POLICY "Allow public insert" ON spellcasters
    FOR INSERT
    WITH CHECK (true);

-- Create a policy to allow anyone to read (for public viewing)
CREATE POLICY "Allow public read" ON spellcasters
    FOR SELECT
    USING (true);
```

**If you already have an existing table, use this migration query to remove the price fields:**

```sql
-- Remove price_lower and price_upper columns from existing table
ALTER TABLE spellcasters 
DROP COLUMN IF EXISTS price_lower,
DROP COLUMN IF EXISTS price_upper;
```

4. Go to "SQL Editor" and paste the above query
5. Click "Run"

### 1.3 Create Storage Bucket for Images

⚠️ **CRITICAL**: Make sure to follow ALL steps below, especially setting up the policies in step 1.4. Without proper policies, image uploads will fail with "row-level security policy" error.

1. In your Supabase dashboard, go to "Storage"
2. Click "Create a new bucket"
3. Enter bucket name: `spellcasters`
4. **IMPORTANT**: Toggle "Public bucket" to **ON/enabled** (this allows images to be accessed publicly)
5. Click "Create bucket"

### 1.4 Set Storage Policies
After creating the bucket, set up policies to allow uploads and public access:

**Option 1: Using Supabase UI (Easiest)**
1. Go to Storage → `spellcasters` bucket
2. Click on "Policies" tab
3. Click "New Policy" 
4. Select "For full customization" or use templates
5. Create two policies:
   - **Policy 1**: Click "Get started quickly" → Select "Allow public INSERTS" → Click "Use this template"
   - **Policy 2**: Click "New Policy" again → Select "Allow public SELECT" → Click "Use this template"

**Option 2: Using SQL Editor**
Go to SQL Editor and run these commands:

```sql
-- Policy 1: Allow anyone to upload files
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'spellcasters');

-- Policy 2: Allow anyone to view files
CREATE POLICY "Allow public access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'spellcasters');

-- Policy 3: Allow updates (optional, for replacing images)
CREATE POLICY "Allow public updates"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'spellcasters')
WITH CHECK (bucket_id = 'spellcasters');

-- Policy 4: Allow deletes (optional, for removing images)
CREATE POLICY "Allow public deletes"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'spellcasters');
```

**Important**: Make sure the bucket is set to **Public** when you create it, otherwise these policies won't work properly.

### 1.5 Get Your Supabase Credentials
1. Go to "Settings" → "API"
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (a long string starting with `eyJ...`)

## Step 2: Configure the Website

### 2.1 Update JavaScript Configuration
Open `add-spellcaster.js` and replace the placeholder values:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace with your Supabase Project URL
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your anon/public key
```

Example:
```javascript
const SUPABASE_URL = 'https://abcdefghijk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### 2.2 Important Security Notes

⚠️ **IMPORTANT**: The current setup exposes API credentials in client-side JavaScript. This is acceptable for:
- Development and testing
- Public forms where you want to allow anonymous submissions
- Supabase Row Level Security (RLS) protects your data

For production, consider:
1. Setting up proper Row Level Security policies in Supabase
2. Adding rate limiting to prevent abuse
3. Implementing proper authentication for admin features
4. Setting up CORS policies in Supabase
5. Adding file size and type validation

## Step 3: Testing

1. Open `index.html` (home) or `spellcasters.html` (directory) in a web browser
2. Click "Add a Spell Caster" button
3. Fill out the form (all fields are optional)
4. Upload an image (optional)
5. Click "Submit"
6. Check your Supabase dashboard:
   - Go to "Table Editor" → `spellcasters` table to verify the data was saved
   - Go to "Storage" → `spellcasters` bucket to verify the image was uploaded

## Step 4: Deployment

### Option 1: Deploy to GitHub Pages
1. Create a GitHub repository
2. Push your code to the repository
3. Go to Settings → Pages
4. Select your branch and save
5. Your site will be live at `https://yourusername.github.io/repository-name`

### Option 2: Deploy to Netlify
1. Create a free Netlify account
2. Drag and drop your project folder to Netlify
3. Your site will be live instantly

### Option 3: Deploy to Vercel
1. Create a free Vercel account
2. Import your GitHub repository or upload your project
3. Deploy with one click

## Database Schema Reference

### spellcasters Table

| Column | Type | Description | Nullable |
|--------|------|-------------|----------|
| id | UUID | Unique identifier (auto-generated) | No |
| name | TEXT | Spell caster's name | Yes |
| about | TEXT | One-line description | Yes |
| description | TEXT | Detailed description | Yes |
| image_url | TEXT | URL to Supabase Storage image | Yes |
| categories | TEXT[] | Array of categories (spells, readings, etc.) | Yes |
| specialities | TEXT[] | Array of specialities (love, money, etc.) | Yes |
| contact_url | TEXT | URL for contacting the spell caster | Yes |
| created_at | TIMESTAMP | Submission timestamp | No |

## Troubleshooting

### Form submission not working
- Check browser console for errors (F12 → Console)
- Verify your Supabase credentials are correct in `add-spellcaster.js`
- Check that the Supabase table exists and has correct permissions
- Ensure Row Level Security policies are set up correctly

### Image upload failing
- **Error: "new row violates row-level security policy"**
  - This means storage policies are not set up correctly
  - Go to Storage → `spellcasters` bucket → Policies tab
  - Make sure you have policies for INSERT and SELECT
  - Run the SQL commands from Step 1.4 above
  - Ensure the bucket is set to **Public** (you can check this in bucket settings)
- Verify the `spellcasters` storage bucket exists in Supabase
- Check that the bucket is set to **public**
- Ensure storage policies allow public insert and select
- Verify the image file is under 50MB (Supabase free tier limit)
- Check browser console for specific error messages

### Data not appearing in Supabase
- Go to Supabase → Table Editor → `spellcasters` table
- Check if the data is there
- Verify RLS policies allow read access
- Check Supabase → Storage → `spellcasters` bucket for uploaded images

## Support

For issues or questions:
1. Check browser console for error messages (F12 → Console)
2. Review Supabase logs in your dashboard
3. Check Supabase Storage documentation: https://supabase.com/docs/guides/storage
4. Verify your Row Level Security policies

## Next Steps

After basic setup, consider:
1. Adding an admin dashboard to view/manage submissions
2. Implementing email notifications for new submissions
3. Adding image optimization and validation
4. Creating a search/filter system for the directory
5. Adding user authentication for premium features

---

**Note**: Keep your API keys secure and never commit them to public repositories. Use environment variables in production.

