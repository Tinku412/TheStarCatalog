# Supabase Setup Guide for The Star Catalog

This guide will help you set up Supabase for storing spell caster profiles.

## 📋 Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Your project files ready

## 🚀 Step-by-Step Setup

### Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: TheStarCatalog (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait 2-3 minutes for project to be ready

### Step 2: Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click "New query"
3. Copy the entire contents of `supabase-schema.sql`
4. Paste into the SQL Editor
5. Click "Run" or press Ctrl+Enter
6. You should see "Success. No rows returned"

This creates:
- `SC_profiles` table (main profiles table)
- `SC_profile_views` table (optional analytics)
- `SC_upvotes` table (optional upvote tracking)
- Indexes for performance
- Row Level Security policies

### Step 3: Create Storage Bucket for Images

1. In Supabase dashboard, go to **Storage** (left sidebar)
2. Click "Create a new bucket"
3. Enter bucket details:
   - **Name**: `profile-pictures`
   - **Public bucket**: Toggle ON (so images can be displayed)
4. Click "Create bucket"

#### Set Storage Policies

1. Click on the `profile-pictures` bucket
2. Go to "Policies" tab
3. Click "New Policy"
4. Create these policies:

**For Upload (INSERT):**
- Policy name: "Anyone can upload profile pictures"
- Policy: `true` (or restrict based on your auth)

**For Read (SELECT):**
- Policy name: "Anyone can view profile pictures"
- Policy: `true`

### Step 4: Get Your API Credentials

1. In Supabase dashboard, go to **Settings** > **API**
2. Copy these values:
   - **Project URL** (looks like: https://xxxxx.supabase.co)
   - **anon public** key (under "Project API keys")

### Step 5: Configure Your Frontend

1. Open `admin.js` in your project
2. Replace the placeholder values:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Paste your Project URL here
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Paste your anon key here
```

**Example:**
```javascript
const SUPABASE_URL = 'https://abcdefghijk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

3. Save the file

### Step 6: Test Your Setup

1. Open `admin.html` in your browser
2. Fill out the form with test data
3. Upload a test image (max 5MB)
4. Click "Submit Profile"
5. You should see a success notification

### Step 7: Verify Data in Supabase

1. Go to **Table Editor** in Supabase dashboard
2. Select `SC_profiles` table
3. You should see your test profile entry
4. Go to **Storage** > `profile-pictures`
5. You should see your uploaded image

## 📊 Database Schema Overview

### SC_profiles Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| personal_name | VARCHAR | Caster's personal name |
| professional_name | VARCHAR | Business/professional name |
| profile_picture_url | TEXT | URL to uploaded image |
| one_liner | TEXT | Short tagline |
| description | TEXT | Full description |
| specialties | TEXT | Comma-separated specialties |
| professional_identity | VARCHAR | Type (Witch, Voodoo Priest, etc.) |
| experience | VARCHAR | Years of experience |
| provides_proof | BOOLEAN | Whether they provide proof |
| refund_policy | BOOLEAN | Whether they offer refunds |
| delivery_time | VARCHAR | Delivery time range |
| minimum_price | VARCHAR | Price range |
| email | VARCHAR | Contact email (unique) |
| website | TEXT | Website URL |
| store_link | TEXT | Store/booking link |
| upvotes | INTEGER | Number of upvotes (default: 0) |
| views | INTEGER | Profile views (default: 0) |
| is_verified | BOOLEAN | Verified status |
| is_active | BOOLEAN | Active status |
| status | VARCHAR | pending/approved/rejected |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

## 🔒 Security (Row Level Security)

The schema includes RLS policies:

- **Public Read**: Anyone can view approved, active profiles
- **Authenticated Insert**: Only authenticated users can create profiles
- **Authenticated Update**: Authenticated users can update profiles

### To Customize Security:

1. Go to **Authentication** > **Policies** in Supabase
2. Find the `SC_profiles` table policies
3. Edit or add new policies based on your needs

## 🎨 Customization Options

### Add Authentication (Optional)

If you want to add user authentication:

1. Enable authentication provider in Supabase:
   - Go to **Authentication** > **Providers**
   - Enable Email, Google, or other providers

2. Update `admin.js` to require login:
```javascript
// Check if user is authenticated
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
    window.location.href = 'login.html';
    return;
}
```

### Add Email Notifications (Optional)

To get notified when profiles are submitted:

1. Set up Supabase Edge Functions or use a service like Zapier
2. Trigger on INSERT to `SC_profiles`
3. Send email to admin

### Enable Full-Text Search

To search profiles by keywords:

```sql
-- Add to your SQL
ALTER TABLE SC_profiles ADD COLUMN search_vector tsvector;

CREATE INDEX idx_search_vector ON SC_profiles USING gin(search_vector);

CREATE TRIGGER tsvector_update 
BEFORE INSERT OR UPDATE ON SC_profiles
FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(search_vector, 'pg_catalog.english', 
    personal_name, professional_name, description, specialties);
```

## 🐛 Troubleshooting

### Issue: "Invalid API Key"
- Double-check you copied the **anon public** key (not the service_role key)
- Ensure no extra spaces in the key

### Issue: "Storage bucket not found"
- Verify bucket name is exactly `profile-pictures`
- Check bucket is set to public
- Verify storage policies are enabled

### Issue: "Permission denied"
- Check Row Level Security policies
- For testing, you can temporarily disable RLS on the table
- Go to Table Editor > SC_profiles > RLS > Disable (re-enable for production!)

### Issue: "Image upload fails"
- Check file size (must be < 5MB)
- Verify storage bucket exists and is public
- Check browser console for detailed error

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## 🎉 You're All Set!

Your Supabase backend is now ready to:
- ✅ Accept profile submissions from admin.html
- ✅ Store profile pictures
- ✅ Manage spell caster profiles
- ✅ Track views and upvotes
- ✅ Handle secure data access

Need help? Check the Supabase documentation or open an issue in your project repository.

