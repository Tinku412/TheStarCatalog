// ============================================
// Write a Review — standalone page
// ============================================

const SUPABASE_URL = 'https://uapjfrxjjpotmvpuidsq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcGpmcnhqanBvdG12cHVpZHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjcxMzAsImV4cCI6MjA3NTcwMzEzMH0.NAFy5Iqs6xm39R42yxBHpjxdBmT66cB7l9LcpULUGoI';

/** UID allowed to post under a custom display name (matches RLS) */
const PRIVILEGED_REVIEW_UID = 'a6316b86-f6dd-4fee-9449-b125eafd97e8';

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

let supabaseClient;
let wrSubRatings = { communication: 0, accuracy: 0, value: 0 };
const WR_STAR_IDS = {
    communication: 'wrStarCommunication',
    accuracy: 'wrStarAccuracy',
    value: 'wrStarValue',
};

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${type === 'success' ? '✓' : '✗'}</span>
            <span class="notification-message">${message}</span>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function accountDisplayName(user) {
    if (!user) return '';
    return user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous';
}

function isPrivilegedReviewer(user) {
    return !!(user && user.id === PRIVILEGED_REVIEW_UID);
}

function updateAuthBanner(user) {
    const banner = document.getElementById('reviewPageAuthBanner');
    if (!banner) return;

    banner.style.display = 'block';
    if (!user) {
        banner.className = 'seed-auth-banner warn';
        banner.innerHTML = 'Sign in to write a review. <button type="button" class="seed-signin-btn" id="wrSignInBtn">Sign In</button>';
        document.getElementById('wrSignInBtn')?.addEventListener('click', () => {
            if (typeof scAuth !== 'undefined') scAuth.openSignInModal('Sign in to write a review.');
        });
        syncDisplayNameSection(null);
        return;
    }

    banner.className = 'seed-auth-banner ok';
    if (isPrivilegedReviewer(user)) {
        banner.textContent = 'Signed in as ' + accountDisplayName(user) + '. You can choose the public name shown on this review.';
    } else {
        banner.textContent = 'Signed in as ' + accountDisplayName(user) + '. Your review will appear under your name.';
    }
    syncDisplayNameSection(user);
}

function syncDisplayNameSection(user) {
    const section = document.getElementById('wrDisplayNameSection');
    const input = document.getElementById('wrDisplayName');
    const rateNum = document.getElementById('wrSectionRateNum');
    const detailsNum = document.getElementById('wrSectionDetailsNum');
    const privileged = isPrivilegedReviewer(user);

    if (section) section.style.display = privileged ? '' : 'none';
    if (rateNum) rateNum.textContent = privileged ? '03' : '02';
    if (detailsNum) detailsNum.textContent = privileged ? '04' : '03';

    if (input && privileged && user) {
        if (!input.value.trim()) input.value = accountDisplayName(user);
    }
}

function updateSubStarDisplay(groupId, n) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.star-btn').forEach((btn, i) => {
        btn.classList.toggle('lit', i < n);
    });
}

function recalcOverallDisplay() {
    const vals = Object.values(wrSubRatings).filter(v => v > 0);
    const overall = document.getElementById('wrOverallDisplay');
    const overallVal = document.getElementById('wrOverallValue');
    const hint = document.getElementById('wrStarHint');
    if (!vals.length) {
        if (overall) overall.style.display = 'none';
        if (hint) hint.textContent = '';
        return;
    }
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const rounded = Math.round(avg * 10) / 10;
    if (overallVal) overallVal.textContent = rounded.toFixed(1);
    if (overall) overall.style.display = 'flex';
    if (hint) hint.textContent = STAR_LABELS[Math.round(avg)] || '';
}

function initStarInputs() {
    Object.entries(WR_STAR_IDS).forEach(([key, groupId]) => {
        const group = document.getElementById(groupId);
        if (!group) return;
        group.querySelectorAll('.star-btn').forEach(btn => {
            const val = parseInt(btn.dataset.value, 10);
            btn.addEventListener('click', () => {
                wrSubRatings[key] = val;
                updateSubStarDisplay(groupId, val);
                recalcOverallDisplay();
            });
            btn.addEventListener('mouseenter', () => updateSubStarDisplay(groupId, val));
            btn.addEventListener('mouseleave', () => updateSubStarDisplay(groupId, wrSubRatings[key]));
        });
    });
}

async function loadApprovedProfiles() {
    const select = document.getElementById('wrProfileSelect');
    if (!select) return;

    const { data, error } = await supabaseClient
        .from('sc_profiles')
        .select('id, professional_name, slug, professional_identity')
        .eq('status', 'approved')
        .eq('is_active', true)
        .order('professional_name', { ascending: true });

    if (error || !data) {
        select.innerHTML = '<option value="">Could not load spellcasters</option>';
        console.error('Profile list error:', error);
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const preId = params.get('id') || '';
    const preSlug = params.get('slug') || '';

    select.innerHTML = '<option value="">Select a spellcaster…</option>' +
        data.map(p => {
            const label = (p.professional_name || 'Untitled') +
                (p.professional_identity ? ' — ' + p.professional_identity : '');
            const selected = (preId && p.id === preId) || (preSlug && p.slug === preSlug);
            return `<option value="${p.id}"${selected ? ' selected' : ''}>${escapeHtml(label)}</option>`;
        }).join('');
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

async function refreshProfileReviewStats(profileId) {
    const { data: reviews, error } = await supabaseClient
        .from('sc_reviews')
        .select('rating')
        .eq('profile_id', profileId);

    if (error) {
        console.warn('Could not load reviews for stats refresh:', error.message);
        return;
    }

    const list = reviews || [];
    const newCount = list.length;
    const newAvg = newCount
        ? Math.round((list.reduce((s, r) => s + r.rating, 0) / newCount) * 100) / 100
        : null;

    const { error: upErr } = await supabaseClient
        .from('sc_profiles')
        .update({ average_rating: newAvg, review_count: newCount })
        .eq('id', profileId);

    if (upErr) {
        console.warn('Client stats update skipped/failed (DB trigger may still apply):', upErr.message);
    }
}

function resetReviewFormUI() {
    wrSubRatings = { communication: 0, accuracy: 0, value: 0 };
    Object.values(WR_STAR_IDS).forEach(id => updateSubStarDisplay(id, 0));
    const overall = document.getElementById('wrOverallDisplay');
    const hint = document.getElementById('wrStarHint');
    if (overall) overall.style.display = 'none';
    if (hint) hint.textContent = '';
    document.querySelectorAll('input[name="wrHireAgain"], input[name="wrResultTime"], input[name="wrPurchaseDate"]').forEach(r => {
        r.checked = false;
    });
    const previews = document.getElementById('wrImagePreviews');
    if (previews) previews.innerHTML = '';
    const fileInput = document.getElementById('wrReviewImages');
    if (fileInput) fileInput.value = '';

    const user = (typeof scAuth !== 'undefined' && scAuth.currentUser) ? scAuth.currentUser : null;
    syncDisplayNameSection(user);
    if (isPrivilegedReviewer(user)) {
        const input = document.getElementById('wrDisplayName');
        if (input) input.value = accountDisplayName(user);
    }
}

async function handleWriteReviewPageSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('wrSubmitBtn');
    const originalText = submitBtn?.textContent || 'Submit Review';
    if (submitBtn) {
        submitBtn.textContent = 'Submitting…';
        submitBtn.disabled = true;
    }

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            if (typeof scAuth !== 'undefined') scAuth.openSignInModal('Sign in to write a review.');
            throw new Error('Sign in required to submit a review');
        }

        const profileId = (document.getElementById('wrProfileSelect')?.value || '').trim();
        if (!profileId) throw new Error('Please select a spellcaster');

        if (Object.values(wrSubRatings).some(v => v === 0)) {
            throw new Error('Please rate all categories before submitting');
        }

        const reviewText = (document.getElementById('wrReviewText')?.value || '').trim();
        if (!reviewText) throw new Error('Please write your review before submitting');

        const rating = Math.round(
            (wrSubRatings.communication + wrSubRatings.accuracy + wrSubRatings.value) / 3
        );

        const servicesPurchased = (document.getElementById('wrServicesPurchased')?.value || '').trim() || null;
        const hireAgain = document.querySelector('input[name="wrHireAgain"]:checked')?.value || null;
        const resultTime = document.querySelector('input[name="wrResultTime"]:checked')?.value || null;
        const purchaseDate = document.querySelector('input[name="wrPurchaseDate"]:checked')?.value || null;

        // Images (max 2)
        const imageUrls = [];
        const fileInput = document.getElementById('wrReviewImages');
        if (fileInput?.files?.length) {
            if (typeof r2Upload !== 'function') throw new Error('Image upload is unavailable');
            const files = Array.from(fileInput.files).slice(0, 2);
            for (let i = 0; i < files.length; i++) {
                try {
                    const url = await r2Upload(files[i], `review-images/${profileId}`);
                    imageUrls.push(url);
                } catch (uploadErr) {
                    console.warn('Review image upload failed:', uploadErr);
                }
            }
        }

        const privileged = isPrivilegedReviewer(user);
        let payload;

        if (privileged) {
            const customName = (document.getElementById('wrDisplayName')?.value || '').trim()
                || accountDisplayName(user);
            payload = {
                profile_id: profileId,
                reviewer_id: null,
                reviewer_name: customName,
                reviewer_email: null,
                reviewer_avatar: null,
                rating,
                rating_communication: wrSubRatings.communication,
                rating_accuracy: wrSubRatings.accuracy,
                rating_value: wrSubRatings.value,
                review_text: reviewText,
                services_purchased: servicesPurchased,
                hire_again: hireAgain,
                result_time: resultTime,
                purchase_date: purchaseDate,
                image_urls: JSON.stringify(imageUrls),
                is_admin_seeded: true,
            };
        } else {
            payload = {
                profile_id: profileId,
                reviewer_id: user.id,
                reviewer_name: accountDisplayName(user),
                reviewer_email: user.email || null,
                reviewer_avatar: user.user_metadata?.avatar_url || null,
                rating,
                rating_communication: wrSubRatings.communication,
                rating_accuracy: wrSubRatings.accuracy,
                rating_value: wrSubRatings.value,
                review_text: reviewText,
                services_purchased: servicesPurchased,
                hire_again: hireAgain,
                result_time: resultTime,
                purchase_date: purchaseDate,
                image_urls: JSON.stringify(imageUrls),
                is_admin_seeded: false,
            };
        }

        const { error } = await supabaseClient.from('sc_reviews').insert(payload);
        if (error) throw error;

        await refreshProfileReviewStats(profileId);

        showNotification('Review submitted — thank you!', 'success');
        e.target.reset();
        resetReviewFormUI();
        await loadApprovedProfiles();
    } catch (err) {
        console.error('Write review error:', err);
        showNotification(err.message || 'Failed to submit review.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    const { createClient } = supabase;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    if (typeof scAuth !== 'undefined') {
        await scAuth.init(supabaseClient, {
            onSignIn: updateAuthBanner,
            onSignOut: () => updateAuthBanner(null),
        });
        updateAuthBanner(scAuth.currentUser);
    } else {
        const { data: { user } } = await supabaseClient.auth.getUser();
        updateAuthBanner(user);
    }

    initStarInputs();
    await loadApprovedProfiles();

    document.getElementById('wrReviewImages')?.addEventListener('change', function () {
        const previews = document.getElementById('wrImagePreviews');
        if (!previews) return;
        previews.innerHTML = '';
        Array.from(this.files).slice(0, 2).forEach(file => {
            const reader = new FileReader();
            reader.onload = ev => {
                const img = document.createElement('img');
                img.src = ev.target.result;
                img.className = 'image-preview-item';
                previews.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
        if (this.files.length > 2) {
            showNotification('Max 2 images allowed. Only the first 2 will be uploaded.', 'info');
        }
    });

    document.getElementById('writeReviewPageForm')?.addEventListener('submit', handleWriteReviewPageSubmit);
    document.getElementById('wrResetBtn')?.addEventListener('click', () => {
        setTimeout(resetReviewFormUI, 0);
    });
});
