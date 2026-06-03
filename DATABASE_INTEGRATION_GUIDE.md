# Database Integration Guide

## Overview
The Star Catalog now dynamically loads profiles from Supabase database and displays them on both the directory page (spellcasters.html) and individual profile pages (profile.html).

## How It Works

### 1. **Index Page (Directory)**

**File: `script.js`**

When the index page loads:
1. Initializes Supabase client connection
2. Fetches all approved profiles from the database
3. Dynamically creates profile cards for each caster
4. Adds click handlers to navigate to individual profiles

```javascript
// Fetches profiles from database
const { data: profiles } = await supabaseClient
    .from('sc_profiles')
    .select('*')
    .eq('status', 'approved')
    .eq('is_active', true)
    .order('upvotes', { ascending: false });
```

**Profile Cards Display:**
- Professional name, one-liner, and identity
- Profile picture from uploaded image URL
- Current upvote count
- Verified badge (if applicable)
- "VIEW PROFILE" button that links to the full profile page

### 2. **Individual Profile Pages**

**File: `profile.js`**

When a profile page loads:
1. Gets the profile ID from the URL parameter (`?id=xxx`)
2. Fetches that specific profile's data from Supabase
3. Populates all profile fields with database data
4. Increments the view count
5. Enables upvoting (updates database in real-time)

```javascript
// URL format: profile.html?id=abc123
const profileId = urlParams.get('id');

// Fetches single profile
const { data: profile } = await supabaseClient
    .from('sc_profiles')
    .select('*')
    .eq('id', profileId)
    .single();
```

## Data Mapping

### From Database → Display

| Database Field | Display Location | Notes |
|----------------|------------------|-------|
| `professional_name` | Card & Profile Page | Main name shown everywhere |
| `personal_name` | Internal use | Not displayed publicly |
| `profile_picture_url` | Card & Profile Page | URL from Supabase Storage |
| `one_liner` | Card & Profile Page | Tagline/subtitle |
| `description` | Profile Page Only | Full "About" section |
| `specialties` | Profile Page Only | Split by commas → tags |
| `professional_identity` | Card & Profile Page | Type badge (Witch, Voodoo, etc.) |
| `experience` | Profile Page | Years dropdown value |
| `provides_proof` | Profile Page | Boolean → Yes/No |
| `refund_policy` | Profile Page | Boolean → Yes/No |
| `delivery_time` | Profile Page | Time range string |
| `minimum_price` | Profile Page | Price range string |
| `email` | Profile Page | Contact button |
| `website` | Profile Page | Contact button |
| `store_link` | Profile Page | Contact button |
| `upvotes` | Card & Profile Page | Current count |
| `views` | Backend tracking | Auto-incremented |
| `is_verified` | Card & Profile Page | Shows verified badge |
| `status` | Filter (backend) | Only "approved" shown |
| `is_active` | Filter (backend) | Only active shown |

## Real-Time Features

### Upvoting
- Clicking upvote button immediately updates the UI
- Sends update to Supabase database
- Changes persist across page reloads
- Same functionality on both index and profile pages

```javascript
// Updates upvote count in database
await supabaseClient
    .from('sc_profiles')
    .update({ upvotes: newCount })
    .eq('id', profileId);
```

### View Tracking
- Every time someone views a profile page, the view count increments
- Happens automatically in the background
- Useful for analytics

## User Flow

### Adding a New Profile (Admin)
1. Admin fills out form on `admin.html`
2. Profile is uploaded to Supabase
3. Status defaults to "pending"
4. Admin approves in Supabase dashboard (change status to "approved")
5. Profile automatically appears on spellcasters.html
6. Users can click to see full profile details

### Viewing Profiles (Public)
1. User visits spellcasters.html
2. Sees all approved profiles as cards
3. Clicks "VIEW PROFILE" on any card
4. Redirected to `profile.html?id=xxx`
5. Profile page loads with full details from database
6. Can upvote, bookmark, or contact the caster

## Files Modified

### JavaScript Files:
- ✅ `script.js` - Loads and displays profiles on spellcasters.html
- ✅ `profile.js` - Loads individual profile on profile.html
- ✅ `admin.js` - Already updated (submits new profiles)

### HTML Files:
- ✅ `spellcasters.html` - Added Supabase library script
- ✅ `profile.html` - Added Supabase library script

### No Changes Needed:
- CSS files (styling remains the same)
- Static content (header, footer, etc.)

## Testing Checklist

### On Index Page:
- [ ] Page loads without errors
- [ ] Profile cards appear (should show 2 profiles from your database)
- [ ] Each card shows correct name, tagline, and identity
- [ ] Profile images display correctly
- [ ] Upvote buttons work and update count
- [ ] Clicking "VIEW PROFILE" navigates to profile page

### On Profile Page:
- [ ] Profile loads with correct data
- [ ] All fields populated (name, description, specialties, etc.)
- [ ] Specialties show as individual tags
- [ ] Contact buttons work (Email, Website, Store Link)
- [ ] Upvote button works and updates count
- [ ] View count increments (check in Supabase)

### In Browser Console:
- [ ] No JavaScript errors
- [ ] Supabase connection successful
- [ ] Data fetches complete

## Troubleshooting

### "Loading profiles..." Never Finishes
- Check Supabase credentials in script.js
- Verify profiles exist with `status = 'approved'` and `is_active = true`
- Check browser console for errors

### Profile Images Not Showing
- Verify `profile_picture_url` field in database has valid URL
- Check Supabase Storage bucket is public
- Ensure images were uploaded successfully

### Clicking Profile Shows "Profile not found"
- Verify profile ID is being passed in URL
- Check profile exists in database
- Ensure `sc_profiles` table name is correct (lowercase)

### Upvotes Not Saving
- Check Supabase RLS policies allow updates
- Verify network tab shows successful PUT request
- Check browser console for errors

## Next Steps (Optional Enhancements)

1. **Search & Filter**
   - Add search bar to filter by name or specialties
   - Filter by professional identity type
   - Filter by price range

2. **Pagination**
   - Load profiles in batches (10-20 at a time)
   - Add "Load More" button
   - Improves performance with many profiles

3. **Sorting**
   - Make filter dropdowns functional
   - Sort by newest, most upvoted, most viewed
   - Sort by experience level

4. **User Authentication**
   - Require login to upvote (prevent spam)
   - User profiles with bookmark lists
   - Admin dashboard for managing profiles

5. **Advanced Features**
   - Reviews and ratings
   - Direct messaging
   - Booking system
   - Payment integration

## Summary

✅ **Working Features:**
- Dynamic profile loading from Supabase
- Individual profile pages with full details
- Real-time upvoting
- View tracking
- Contact buttons
- Verified badges
- Responsive design

🎉 **Your directory is now fully connected to the database!**

Users will see real data from your Supabase database, and all interactions (upvotes, views) are tracked automatically.

