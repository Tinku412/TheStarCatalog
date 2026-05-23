// ============================================
// SUPABASE CONFIGURATION
// ============================================
// Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://uapjfrxjjpotmvpuidsq.supabase.co'; // e.g., https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcGpmcnhqanBvdG12cHVpZHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjcxMzAsImV4cCI6MjA3NTcwMzEzMH0.NAFy5Iqs6xm39R42yxBHpjxdBmT66cB7l9LcpULUGoI';

// Initialize Supabase client (include Supabase JS library in HTML first)
// Add this to your HTML: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
let supabaseClient;

// Initialize Supabase when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Supabase client
    const { createClient } = supabase;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Get form element
    const form = document.querySelector('.profile-form');
    
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
});

// ============================================
// FORM SUBMISSION HANDLER
// ============================================
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Show loading state
    const submitBtn = document.querySelector('.submit-btn');
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'SUBMITTING...';
    submitBtn.disabled = true;
    
    try {
        // Get form data
        const formData = new FormData(e.target);

        // Require at least one contact method
        const hasContact =
            formData.get('email')         ||
            formData.get('website')        ||
            formData.get('storeLink')      ||
            formData.get('instagramLink')  ||
            formData.get('redditLink');

        if (!hasContact) {
            showNotification('Please provide at least one contact method (email, website, store link, Instagram, or Reddit).', 'error');
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
            return;
        }
        
        // Handle image upload first
        let profilePictureUrl = null;
        const profilePicFile = formData.get('profilePic');
        
        if (profilePicFile && profilePicFile.size > 0) {
            profilePictureUrl = await uploadProfilePicture(profilePicFile);
        }
        
        // Prepare profile data for database
        const profileData = {
            personal_name: formData.get('personalName'),
            professional_name: formData.get('professionalName'),
            profile_picture_url: profilePictureUrl,
            one_liner: formData.get('oneLiner'),
            description: formData.get('description'),
            specialties: formData.get('specialties'),
            professional_identity: formData.get('professionalIdentity'),
            experience: formData.get('experience'),
            provides_proof: formData.get('providesProof') === 'Yes',
            refund_policy: formData.get('refund') === 'Yes',
            delivery_time: formData.get('deliveryTime'),
            minimum_price: formData.get('priceRange'),
            email:          formData.get('email') || null,
            website:        formData.get('website') || null,
            store_link:     formData.get('storeLink') || null,
            instagram_link: formData.get('instagramLink') || null,
            reddit_link:    formData.get('redditLink') || null,
            status:         'pending',
            is_active:      true,
            location:       formData.get('location') || null,
            active_since:   formData.get('activeSince') || null,
            response_time:  formData.get('responseTime') || null,
            languages:      formData.get('languages') || null,
            works_online:   formData.get('worksOnline') !== 'No'
        };
        
        // Insert into Supabase
        const { data, error } = await supabaseClient
            .from('sc_profiles')
            .insert([profileData])
            .select();
        
        if (error) {
            throw error;
        }
        
        // Success!
        showNotification('Profile submitted successfully! 🎉', 'success');
        
        // Reset form after 2 seconds
        setTimeout(() => {
            e.target.reset();
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('Error submitting profile:', error);
        showNotification('Error submitting profile: ' + error.message, 'error');
        
        // Re-enable button
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
    }
}

// ============================================
// IMAGE UPLOAD HANDLER
// ============================================
async function uploadProfilePicture(file) {
    try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `profile-pictures/${fileName}`;
        
        // Upload to Supabase Storage
        const { data, error } = await supabaseClient.storage
            .from('profile-pictures')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) {
            throw error;
        }
        
        // Get public URL
        const { data: urlData } = supabaseClient.storage
            .from('profile-pictures')
            .getPublicUrl(filePath);
        
        return urlData.publicUrl;
        
    } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error('Failed to upload profile picture');
    }
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${type === 'success' ? '✓' : '✗'}</span>
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// ============================================
// FORM VALIDATION (Optional Enhancement)
// ============================================
function validateForm(formData) {
    const errors = [];
    
    // Email validation
    const email = formData.get('email');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errors.push('Please enter a valid email address');
    }
    
    // URL validation for website
    const website = formData.get('website');
    try {
        new URL(website);
    } catch (e) {
        errors.push('Please enter a valid website URL');
    }
    
    // File size validation (max 5MB)
    const profilePic = formData.get('profilePic');
    if (profilePic && profilePic.size > 5 * 1024 * 1024) {
        errors.push('Profile picture must be less than 5MB');
    }
    
    return errors;
}

// ============================================
// PREVIEW IMAGE BEFORE UPLOAD (Optional)
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const profilePicInput = document.querySelector('input[name="profilePic"]');
    
    if (profilePicInput) {
        profilePicInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Show file name or preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    console.log('Image selected:', file.name);
                    // You can add image preview here if desired
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

