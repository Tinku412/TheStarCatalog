// ============================================
// SUPABASE CONFIGURATION
// ============================================
const SUPABASE_URL = 'https://uapjfrxjjpotmvpuidsq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcGpmcnhqanBvdG12cHVpZHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjcxMzAsImV4cCI6MjA3NTcwMzEzMH0.NAFy5Iqs6xm39R42yxBHpjxdBmT66cB7l9LcpULUGoI';

let supabaseClient;
let currentUserId = null; // set after auth resolves; used to show update links on own reviews

// ============================================
// URL ROUTING — id, ?slug=, or /spellcasters/{slug}
// ============================================
function resolveProfileFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const id     = params.get('id');
    const slugQ  = params.get('slug') || params.get('s');

    if (id) return { id, slug: null };
    if (slugQ) return { id: null, slug: slugQ.trim().toLowerCase() };

    // Pretty URL: /spellcasters/la-bruja-next-door (with or without Apache/Netlify rewrite)
    const parts = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    const idx   = parts.findIndex(p => p.toLowerCase() === 'spellcasters');
    if (idx >= 0 && parts[idx + 1]) {
        const segment = decodeURIComponent(parts[idx + 1]).toLowerCase();
        if (segment && segment !== 'spellcasters.html') {
            return { id: null, slug: segment };
        }
    }

    return { id: null, slug: null };
}

// ============================================
// LOAD PROFILE DATA FROM SUPABASE
// ============================================
window.addEventListener('DOMContentLoaded', async function() {
    // Initialize Supabase
    const { createClient } = supabase;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const route = resolveProfileFromUrl();

    if (!route.id && !route.slug) {
        console.error('No profile ID or slug in URL:', window.location.href);
        showError('Profile not found. Please return to the directory.');
        return;
    }

    // ── Step 1: Load profile immediately (zero auth dependency) ──
    await initializeAuth();                              // handle OAuth review-pending redirect
    const loaded = await loadProfile(route.id || route.slug, Boolean(route.slug && !route.id));
    if (!loaded) return;

    await loadReviews(document.body.dataset.profileId);  // load reviews (uses real DB id)

    initializeProfileInteractions();
    initializeReviewInteractions();

    // ── Step 2: Init auth in background AFTER profile is visible ──
    try {
        if (typeof scAuth !== 'undefined') {
            scAuth.init(supabaseClient, {
                onSignIn:  () => { applyUserStateToBtns(); resolveCurrentUser(); },
                onSignOut: () => { applyUserStateToBtns(); currentUserId = null; }
            }).catch(() => {});
        }
    } catch (_) { /* auth is optional */ }

    // Resolve current user for update-link injection (non-blocking)
    resolveCurrentUser();
});

// ============================================
// FETCH AND DISPLAY PROFILE
// ============================================
async function fetchProfileRow(column, value) {
    const { data, error } = await supabaseClient
        .from('sc_profiles')
        .select('*')
        .eq(column, value)
        .limit(1);

    if (error) {
        console.error(`Profile fetch error (${column}):`, error);
        return null;
    }
    return data?.[0] || null;
}

async function loadProfile(identifier, bySlug = false) {
    const container = document.querySelector('.profile-container');
    if (container) container.style.opacity = '0';

    try {
        const lookupValue = bySlug ? String(identifier).trim().toLowerCase() : identifier;
        let profile = await fetchProfileRow(bySlug ? 'slug' : 'id', lookupValue);

        if (!profile) {
            const msg = bySlug
                ? 'Profile not found. It may still be pending approval, or the link may be incorrect.'
                : 'Profile not found.';
            showError(msg);
            return false;
        }

        populateProfile(profile);

        if (profile.slug) {
            try {
                history.replaceState(null, '', '/spellcasters/' + profile.slug);
            } catch (_) { /* safe to ignore on local file:// */ }
        }

        // Show Edit button if the logged-in user owns this profile
        if (profile.owner_user_id) {
            supabaseClient.auth.getUser().then(({ data: { user } }) => {
                if (user && user.id === profile.owner_user_id) {
                    const editBtn = document.getElementById('editProfileBtn');
                    if (editBtn) {
                        editBtn.style.display = 'inline-flex';
                        editBtn.addEventListener('click', () => {
                            window.location.href = '/submit-practitioner.html?edit=' + encodeURIComponent(profile.id);
                        });
                    }
                }
            }).catch(() => {});
        }

        await incrementViews(profile.id, profile.views || 0);

        if (container) container.style.opacity = '1';
        return true;

    } catch (error) {
        console.error('Error:', error);
        showError('Error loading profile. Please try again.');
        return false;
    }
}

// ============================================
// POPULATE PROFILE ELEMENTS
// ============================================
// Converts plain-text description (may contain \n) into readable HTML paragraphs
function formatDescription(text) {
    if (!text || !text.trim()) {
        return '<p style="color:var(--muted);font-style:italic;">No description provided.</p>';
    }
    // Safely escape HTML special chars first
    const safe = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    // Split on 2+ newlines → separate paragraphs; single newlines → <br>
    const paras = safe.split(/\n{2,}/);
    return paras
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
}

function socialIconSvg(kind) {
    const icons = {
        instagram: '<rect x="2" y="2" width="16" height="16" rx="5" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="10" cy="10" r="3.2" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="14.6" cy="5.4" r="1" fill="currentColor"/>',
        reddit: '<circle cx="10" cy="11" r="4.6" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="8.4" cy="10.6" r="0.7" fill="currentColor"/><circle cx="11.6" cy="10.6" r="0.7" fill="currentColor"/><path d="M8 12.5c1.1.8 2.9.8 4 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M11 5.8l3-1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="14.8" cy="4.6" r="1.1" stroke="currentColor" stroke-width="1.2" fill="none"/>',
        website: '<circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M3.5 10h13M10 3c1.9 2.1 1.9 11.9 0 14M10 3c-1.9 2.1-1.9 11.9 0 14" stroke="currentColor" stroke-width="1.3"/>',
        store: '<path d="M3 7h14l-1 10H4L3 7z" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M6.5 7V5.8a3.5 3.5 0 0 1 7 0V7" stroke="currentColor" stroke-width="1.6"/>'
    };
    return icons[kind] || icons.website;
}

function formatUsdPrice(priceText) {
    const raw = String(priceText || '').trim();
    if (!raw) return 'Price on request';
    const cleaned = raw.replace(/usd/ig, '').trim();
    if (cleaned.includes('$')) return cleaned;
    return `$${cleaned}`;
}

function parseOfferingsText(offerings) {
    if (!offerings) return [];
    return String(offerings)
        .split(/\n+/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            const parts = line.split(/\s[-–—]\s/);
            if (parts.length >= 2) {
                const name = parts.shift().trim();
                const price = parts.join(' - ').trim();
                return { name, price };
            }
            return { name: line, price: '' };
        });
}

// ============================================
function populateProfile(profile) {
    // Update page title
    document.title = `${profile.professional_name} - THE STAR CATALOG`;
    
    // Basic info
    document.getElementById('profileImage').src = profile.profile_picture_url || 'placeholder.jpg';
    document.getElementById('profileImage').alt = profile.professional_name;
    document.getElementById('profileName').textContent = profile.professional_name;
    document.getElementById('profileTagline').textContent = profile.one_liner || '';
    document.getElementById('profileUpvoteCount').textContent = profile.upvotes || 0;
    
    
    // Quick details
    document.getElementById('detailIdentity').textContent  = profile.professional_identity || '—';
    document.getElementById('detailExperience').textContent = profile.experience || '—';
    document.getElementById('detailProof').textContent     = profile.provides_proof ? 'Yes' : 'No';
    document.getElementById('detailRefund').textContent    = profile.refund_policy ? 'Yes' : 'No';
    document.getElementById('detailDelivery').textContent  = profile.delivery_time || '—';

    const emergencyEl = document.getElementById('detailEmergency');
    if (emergencyEl) emergencyEl.textContent = profile.accepts_emergency || '—';
    document.getElementById('detailPriceRange').textContent = profile.minimum_price || '—';

    // New optional fields (with fallbacks for existing records)
    const locEl = document.getElementById('detailLocation');
    if (locEl) locEl.textContent = profile.location || '—';

    const asEl = document.getElementById('detailActiveSince');
    if (asEl) asEl.textContent = profile.active_since || '—';

    const rtEl = document.getElementById('detailResponseTime');
    if (rtEl) rtEl.textContent = profile.response_time || 'Within 48 hrs';

    const langEl = document.getElementById('detailLanguages');
    if (langEl) langEl.textContent = profile.languages || 'English';

    const woEl = document.getElementById('detailWorksOnline');
    if (woEl) woEl.textContent = profile.works_online === false ? 'No' : 'Yes';

    // Sync sidebar profession bar
    const sidebarProf = document.getElementById('sidebarProfession');
    if (sidebarProf) sidebarProf.textContent = profile.professional_identity || '—';

    // Show breadcrumb name
    const breadcrumbName = document.getElementById('breadcrumbName');
    if (breadcrumbName) breadcrumbName.textContent = profile.professional_name || '—';

    
    // Description — formatted for readability
    document.getElementById('profileDescription').innerHTML = formatDescription(profile.description);

    // Services Offered — populate store-like listing cards
    const servicesListingsEl = document.getElementById('servicesListings');
    const noSvcMsg  = document.getElementById('noServicesMsg');
    if (servicesListingsEl) {
        const offeringsFromText = parseOfferingsText(profile.offerings);
        const fallbackServices = String(profile.services_offered || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(name => ({ name, price: '' }));
        const offerings = offeringsFromText.length ? offeringsFromText : fallbackServices;

        if (offerings.length) {
            servicesListingsEl.innerHTML = offerings.map((item, idx) => `
                <article class="service-listing-card">
                    <div class="service-listing-top">
                        <span class="service-listing-badge">Service ${idx + 1}</span>
                        <span class="service-listing-price">${escHtml(formatUsdPrice(item.price))}</span>
                    </div>
                    <h4 class="service-listing-name">${escHtml(item.name)}</h4>
                </article>
            `).join('');
            if (noSvcMsg) noSvcMsg.style.display = 'none';
        } else if (noSvcMsg) {
            noSvcMsg.style.display = '';
        }
    }

    // Social Links — icon buttons
    const socialEl = document.getElementById('socialLinksContent');
    if (socialEl) {
        const links = [];
        if (profile.website) {
            links.push({ label: 'Website', url: profile.website, kind: 'website' });
        }
        if (profile.store_link) {
            links.push({ label: 'Store', url: profile.store_link, kind: 'store' });
        }
        if (profile.instagram_link) {
            links.push({ label: 'Instagram', url: profile.instagram_link, kind: 'instagram' });
        }
        if (profile.reddit_link) {
            links.push({ label: 'Reddit', url: profile.reddit_link, kind: 'reddit' });
        }
        if (links.length) {
            socialEl.innerHTML = links.map(l => `
                <a href="${escHtml(l.url)}" target="_blank" rel="noopener noreferrer" class="social-link-btn" title="${l.label}">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        ${socialIconSvg(l.kind)}
                    </svg>
                    <span>${l.label} ↗</span>
                </a>
            `).join('');
        } else {
            socialEl.innerHTML = '<p class="no-tab-content">No social links added yet.</p>';
        }
    }

    // Specialties - convert comma-separated string to tags
    const specialtiesContainer = document.getElementById('specialtiesTags');
    if (specialtiesContainer && profile.specialties) {
        specialtiesContainer.innerHTML = '';
        const specialties = profile.specialties.split(',').map(s => s.trim());
        specialties.forEach(specialty => {
            const tag = document.createElement('span');
            tag.className = 'specialty-tag';
            tag.textContent = specialty;
            specialtiesContainer.appendChild(tag);
        });
    }
    
    // Store profile ID for interactions (contact modal + upvote/save/reviews)
    document.body.dataset.profileId = profile.id;
}

// ============================================
// INCREMENT VIEW COUNT
// ============================================
async function incrementViews(profileId, currentViews) {
    try {
        const { error } = await supabaseClient
            .from('sc_profiles')
            .update({ views: (currentViews || 0) + 1 })
            .eq('id', profileId);
        
        if (error) {
            console.error('Error updating views:', error);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================
// APPLY AUTH STATE TO PROFILE BUTTONS
// ============================================
function applyUserStateToBtns() {
    const profileId = document.body.dataset.profileId;
    if (!profileId) return;

    const upvoteBtn   = document.getElementById('profileUpvote');
    const bookmarkBtn = document.getElementById('profileBookmark');

    if (upvoteBtn)   upvoteBtn.classList.toggle('upvoted',    scAuth.userUpvotes.has(profileId));
    if (bookmarkBtn) bookmarkBtn.classList.toggle('bookmarked', scAuth.userSaves.has(profileId));
}

// ============================================
// PROFILE INTERACTIONS (auth-aware via scAuth)
// ============================================
function initializeProfileInteractions() {
    const upvoteBtn     = document.getElementById('profileUpvote');
    const upvoteSection = document.getElementById('profileUpvoteSection');
    const upvoteCount   = document.getElementById('profileUpvoteCount');

    if (upvoteBtn) {
        upvoteBtn.addEventListener('click', async function () {
            const profileId   = document.body.dataset.profileId;
            const profileName = document.getElementById('profileName').textContent;
            const currentCount = parseInt(upvoteCount?.textContent || '0');

            // Auth check on demand — no pre-loaded auth state required
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                if (typeof scAuth !== 'undefined') {
                    scAuth.openSignInModal('Sign in to upvote practitioners.');
                } else {
                    showNotification('Sign in to upvote.', 'info');
                }
                return;
            }

            // Optimistic UI
            const alreadyUpvoted = (typeof scAuth !== 'undefined') && scAuth.userUpvotes.has(profileId);
            const willUpvote     = !alreadyUpvoted;
            const newCount       = willUpvote ? currentCount + 1 : Math.max(0, currentCount - 1);
            this.classList.toggle('upvoted', willUpvote);
            upvoteSection?.classList.toggle('upvoted', willUpvote);
            if (upvoteCount) upvoteCount.textContent = newCount;

            try {
                if (typeof scAuth !== 'undefined' && scAuth._supabase) {
                    await scAuth.toggleUpvote(profileId, currentCount);
                } else {
                    if (alreadyUpvoted) {
                        await supabaseClient.from('sc_upvotes').delete().eq('profile_id', profileId).eq('user_id', user.id);
                    } else {
                        await supabaseClient.from('sc_upvotes').insert({ profile_id: profileId, user_id: user.id });
                    }
                    await supabaseClient.from('sc_profiles').update({ upvotes: newCount }).eq('id', profileId);
                }
                showNotification(
                    willUpvote ? `▲ Recommended ${profileName}` : `Recommendation removed`,
                    willUpvote ? 'success' : 'info'
                );
            } catch (err) {
                // Revert on error
                this.classList.toggle('upvoted', !willUpvote);
                upvoteSection?.classList.toggle('upvoted', !willUpvote);
                if (upvoteCount) upvoteCount.textContent = currentCount;
                console.error('Upvote error:', err);
            }
        });
    }

    const bookmarkBtn = document.getElementById('profileBookmark');
    if (bookmarkBtn) {
        bookmarkBtn.addEventListener('click', async function () {
            const profileId   = document.body.dataset.profileId;
            const profileName = document.getElementById('profileName').textContent;

            // Auth check on demand
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                if (typeof scAuth !== 'undefined') {
                    scAuth.openSignInModal('Sign in to save practitioners.');
                } else {
                    showNotification('Sign in to save.', 'info');
                }
                return;
            }

            const alreadySaved = (typeof scAuth !== 'undefined') && scAuth.userSaves.has(profileId);
            const willSave     = !alreadySaved;
            this.classList.toggle('bookmarked', willSave);

            try {
                if (typeof scAuth !== 'undefined' && scAuth._supabase) {
                    await scAuth.toggleSave(profileId);
                } else {
                    if (alreadySaved) {
                        await supabaseClient.from('sc_saves').delete().eq('profile_id', profileId).eq('user_id', user.id);
                    } else {
                        await supabaseClient.from('sc_saves').insert({ profile_id: profileId, user_id: user.id });
                    }
                }
                showNotification(
                    willSave ? `${profileName} saved` : `${profileName} removed from saved`,
                    willSave ? 'success' : 'info'
                );
            } catch (err) {
                this.classList.toggle('bookmarked', !willSave); // revert
                console.error('Save error:', err);
            }
        });
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
            <span class="notification-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// ============================================
// ERROR HANDLING
// ============================================
function showError(message) {
    const container = document.querySelector('.profile-container');
    if (container) {
        container.style.opacity = '1';
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <h2 style="font-size: 24px; margin-bottom: 20px; color: #e14b22;">${message}</h2>
                <a href="/spellcasters.html" class="back-button">← Back to Directory</a>
            </div>
        `;
    }
}

// ============================================
// AUTH — Google Sign-In via Supabase OAuth
// ============================================
/*  Supabase SQL setup required before reviews work:
    ─────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS sc_reviews (
      id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      profile_id   UUID NOT NULL,
      reviewer_id  UUID,
      reviewer_name TEXT NOT NULL,
      reviewer_email TEXT,
      reviewer_avatar TEXT,
      rating       INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      review_text  TEXT NOT NULL,
      image_urls   TEXT DEFAULT '[]',
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE sc_reviews ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "public_read"  ON sc_reviews FOR SELECT USING (true);
    CREATE POLICY "auth_insert"  ON sc_reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

    -- Storage bucket (create via Supabase Dashboard → Storage → New Bucket → "review-images", set Public)
    -- Enable Google OAuth via Dashboard → Authentication → Providers → Google
*/

// ============================================
// RESOLVE CURRENT USER — adds update links to own review cards
// ============================================
async function resolveCurrentUser() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        currentUserId = user?.id || null;
        if (currentUserId) addUpdateLinksForCurrentUser();
    } catch (_) { /* auth unavailable — no update links shown */ }
}

function addUpdateLinksForCurrentUser() {
    document.querySelectorAll(`.review-card[data-reviewer-id="${currentUserId}"]`).forEach(card => {
        if (!card.querySelector('.review-update-link')) {
            card.appendChild(createUpdateLinkBtn(card.dataset.reviewId, card));
        }
    });
}

function createUpdateLinkBtn(reviewId, cardEl) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'review-update-link';
    btn.textContent = 'Want to share an update?';
    btn.addEventListener('click', () => openUpdateModal(reviewId, cardEl));
    return btn;
}

async function initializeAuth() {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && localStorage.getItem('reviewPending') === 'true') {
            localStorage.removeItem('reviewPending');
            setTimeout(openReviewModal, 400);
        }
    });
}

// ============================================
// REVIEWS — Load + Render
// ============================================
let allReviews = []; // kept in sync so the rating summary can always be recomputed

async function loadReviews(profileId) {
    try {
        const { data: reviews, error } = await supabaseClient
            .from('sc_reviews')
            .select('*')
            .eq('profile_id', profileId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        renderReviews(reviews || []);
    } catch (e) {
        console.warn('Reviews not available:', e.message);
        renderReviews([]);
    }
}

const REVIEWS_PER_PAGE = 20;
let reviewCurrentPage  = 1;

function renderReviews(reviews) {
    allReviews = reviews;
    updateRatingSummary();
    reviewCurrentPage = 1;
    renderReviewPage();
}

function renderReviewPage() {
    const list    = document.getElementById('reviewsList');
    const pagDiv  = document.getElementById('reviewPagination');
    if (!list) return;

    if (!allReviews.length) {
        list.innerHTML = '<p class="no-reviews">No reviews yet. Be the first to share your experience.</p>';
        if (pagDiv) pagDiv.innerHTML = '';
        return;
    }

    const total      = allReviews.length;
    const totalPages = Math.ceil(total / REVIEWS_PER_PAGE);
    const start      = (reviewCurrentPage - 1) * REVIEWS_PER_PAGE;
    const pageItems  = allReviews.slice(start, start + REVIEWS_PER_PAGE);

    list.innerHTML = '';
    pageItems.forEach(r => list.appendChild(buildReviewCard(r)));

    if (pagDiv) {
        pagDiv.innerHTML = '';
        if (totalPages > 1) pagDiv.appendChild(buildReviewPagination(reviewCurrentPage, totalPages));
    }
}

function buildReviewPagination(current, total) {
    const nav = document.createElement('div');
    nav.className = 'review-pagination';

    const prev = document.createElement('button');
    prev.className = 'review-page-btn review-page-arrow';
    prev.innerHTML = '&#8592;';
    prev.disabled  = current === 1;
    prev.setAttribute('aria-label', 'Previous page');
    prev.addEventListener('click', () => { reviewCurrentPage--; renderReviewPage(); nav.closest('.profile-section-block')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });

    nav.appendChild(prev);

    const maxVisible = 5;
    let startPage = Math.max(1, current - Math.floor(maxVisible / 2));
    let endPage   = Math.min(total, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

    if (startPage > 1) {
        nav.appendChild(makePageBtn(1, current));
        if (startPage > 2) { const el = document.createElement('span'); el.className = 'review-page-ellipsis'; el.textContent = '…'; nav.appendChild(el); }
    }
    for (let i = startPage; i <= endPage; i++) nav.appendChild(makePageBtn(i, current));
    if (endPage < total) {
        if (endPage < total - 1) { const el = document.createElement('span'); el.className = 'review-page-ellipsis'; el.textContent = '…'; nav.appendChild(el); }
        nav.appendChild(makePageBtn(total, current));
    }

    const next = document.createElement('button');
    next.className = 'review-page-btn review-page-arrow';
    next.innerHTML = '&#8594;';
    next.disabled  = current === total;
    next.setAttribute('aria-label', 'Next page');
    next.addEventListener('click', () => { reviewCurrentPage++; renderReviewPage(); nav.closest('.profile-section-block')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });

    nav.appendChild(next);

    const info = document.createElement('span');
    info.className = 'review-page-info';
    info.textContent = `Page ${current} of ${total}`;
    nav.appendChild(info);

    return nav;
}

function makePageBtn(n, current) {
    const btn = document.createElement('button');
    btn.className = 'review-page-btn' + (n === current ? ' active' : '');
    btn.textContent = n;
    btn.addEventListener('click', () => {
        reviewCurrentPage = n;
        renderReviewPage();
        document.getElementById('reviewsSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return btn;
}

function updateRatingSummary() {
    const el       = document.getElementById('reviewRatingSummary');
    const headerEl = document.getElementById('headerRating');
    if (!allReviews.length) {
        if (el) el.style.display = 'none';
        if (headerEl) headerEl.style.display = 'none';
        return;
    }

    const avg     = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    const rounded = Math.round(avg * 10) / 10;
    const count   = allReviews.length;

    const starsHtml = renderStaticStars(rounded);

    if (el) {
        el.style.display    = 'flex';
        el.style.alignItems = 'center';
        el.style.gap        = '5px';
        el.innerHTML = `
            <span style="color:#c9b97a;font-size:14px;line-height:1;">★</span>
            <strong style="font-family:'Cinzel',serif;font-size:13px;color:var(--navy);">${rounded.toFixed(1)}</strong>
            <span style="font-family:'Source Code Pro',monospace;font-size:11px;color:var(--muted);letter-spacing:0.02em;">(${count} review${count !== 1 ? 's' : ''})</span>
        `;
    }

    if (headerEl) {
        headerEl.style.display = 'flex';
        headerEl.innerHTML = `
            <div class="header-rating-stars">${starsHtml}</div>
            <span class="header-rating-score">${rounded.toFixed(1)}</span>
            <span class="header-rating-count">${count} review${count !== 1 ? 's' : ''}</span>
        `;
    }
}

function renderStaticStars(avg) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (avg >= i) {
            html += '<span style="color:#c9b97a;">★</span>';
        } else if (avg >= i - 0.5) {
            html += '<span style="color:#c9b97a;opacity:0.6;">★</span>';
        } else {
            html += '<span style="opacity:0.3;">★</span>';
        }
    }
    return html;
}

// ============================================
// ANALYTICS TRACKING
// ============================================
async function trackEvent(profileId, eventType) {
    if (!profileId) return;
    try {
        await supabaseClient.from('sc_analytics').insert({ profile_id: profileId, event_type: eventType });
    } catch (_) { /* non-critical — fail silently */ }
}

function buildReviewCard(r) {
    const div = document.createElement('div');
    div.className = 'review-card';
    div.dataset.reviewId    = r.id;
    div.dataset.reviewerId  = r.reviewer_id || '';

    const filledStars = '★'.repeat(r.rating);
    const emptyStars  = '☆'.repeat(5 - r.rating);
    const date = new Date(r.created_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
    const initial = (r.reviewer_name || 'A')[0].toUpperCase();

    const avatarHtml = r.reviewer_avatar
        ? `<img src="${r.reviewer_avatar}" alt="${escHtml(r.reviewer_name)}" class="reviewer-avatar" loading="lazy">`
        : `<div class="reviewer-avatar-placeholder">${initial}</div>`;

    let imageUrls = [];
    try {
        imageUrls = typeof r.image_urls === 'string'
            ? JSON.parse(r.image_urls || '[]')
            : (Array.isArray(r.image_urls) ? r.image_urls : []);
    } catch (_) { imageUrls = []; }

    const imagesHtml = imageUrls.length
        ? `<div class="review-images">${imageUrls.map(u =>
            `<img src="${u}" alt="Review proof" class="review-img" onclick="openLightbox('${u}')" loading="lazy">`
          ).join('')}</div>`
        : '';

    const subRatingLabels = [
        { key: 'rating_communication', label: 'Communication' },
        { key: 'rating_accuracy',      label: 'Accuracy' },
        { key: 'rating_value',         label: 'Value' },
    ];
    const hasSubRatings = subRatingLabels.some(s => r[s.key] != null);
    const subRatingsHtml = hasSubRatings ? `
        <div class="review-sub-ratings">
            ${subRatingLabels.filter(s => r[s.key] != null).map(s => `
                <div class="sub-rating-display">
                    <span class="sub-rating-display-label">${s.label}</span>
                    <span class="sub-rating-display-stars">${'★'.repeat(r[s.key])}<span style="opacity:0.3;">${'★'.repeat(5 - r[s.key])}</span></span>
                    <span class="sub-rating-display-num">${r[s.key]}/5</span>
                </div>
            `).join('')}
        </div>
    ` : '';

    const metaPills = [
        r.purchase_date ? `<span class="review-meta-pill">Purchased: <strong>${escHtml(r.purchase_date)}</strong></span>` : '',
        r.hire_again    ? `<span class="review-meta-pill">Hire again: <strong>${escHtml(r.hire_again)}</strong></span>` : '',
        r.result_time   ? `<span class="review-meta-pill">Results: <strong>${escHtml(r.result_time)}</strong></span>` : '',
    ].filter(Boolean).join('');

    div.innerHTML = `
        <div class="review-card-header">
            ${avatarHtml}
            <div class="reviewer-meta">
                <span class="reviewer-name">${escHtml(r.reviewer_name)}</span>
                <span class="review-date">Reviewed on ${date}</span>
            </div>
            <div class="review-overall-rating">
                <div class="review-stars" title="${r.rating} out of 5">${filledStars}<span style="opacity:0.35;">${emptyStars}</span></div>
                <span class="review-overall-label">Overall</span>
            </div>
        </div>
        <p class="review-text">${escHtml(r.review_text)}</p>
        ${subRatingsHtml}
        ${r.services_purchased ? `<div class="review-services-purchased"><span class="review-services-label">Services Purchased:</span> <span class="review-services-tags">${escHtml(r.services_purchased).split(',').map(s => `<span class="review-service-tag">${s.trim()}</span>`).join('')}</span></div>` : ''}
        ${metaPills ? `<div class="review-meta-pills">${metaPills}</div>` : ''}
        ${imagesHtml}
    `;

    // Append review update block if one exists
    if (r.review_update) {
        div.appendChild(buildUpdateBlock(r.review_update, r.review_updated_at));
    }

    // Append "Want to share an update?" link for the current signed-in reviewer
    if (currentUserId && r.reviewer_id === currentUserId) {
        div.appendChild(createUpdateLinkBtn(r.id, div));
    }


    return div;
}

function buildUpdateBlock(text, updatedAt) {
    const block = document.createElement('div');
    block.className = 'review-update-block';
    const updDate = updatedAt
        ? new Date(updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
    block.innerHTML = `
        <div class="review-update-label">
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 10l1-3L10 1l2 2-7 7-3 1z" stroke="currentColor" stroke-width="1.3" fill="none"/>
                <line x1="8" y1="3" x2="11" y2="6" stroke="currentColor" stroke-width="1.3"/>
            </svg>
            Reviewer's Update
        </div>
        <p class="review-update-text">${escHtml(text)}</p>
        ${updDate ? `<span class="review-update-date">Updated on ${updDate}</span>` : ''}
    `;
    return block;
}

function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================
// REVIEWS — Modals
// ============================================
function openReviewModal() {
    document.getElementById('reviewModal')?.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeReviewModalFn() {
    document.getElementById('reviewModal')?.classList.remove('active');
    document.body.style.overflow = '';
}
function openSignInModal() {
    document.getElementById('signInModal')?.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeSignInModalFn() {
    document.getElementById('signInModal')?.classList.remove('active');
    document.body.style.overflow = '';
}

async function handleWriteReview() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        openSignInModal();
    } else {
        openReviewModal();
    }
}

// ============================================
// REVIEW UPDATE MODAL
// ============================================
let _updateReviewId  = null;
let _updateCardEl    = null;

function openUpdateModal(reviewId, cardEl) {
    _updateReviewId = reviewId;
    _updateCardEl   = cardEl;
    const ta = document.getElementById('updateText');
    if (ta) ta.value = '';
    document.getElementById('updateModal')?.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => ta?.focus(), 80);
}
function closeUpdateModal() {
    document.getElementById('updateModal')?.classList.remove('active');
    document.body.style.overflow = '';
    _updateReviewId = null;
    _updateCardEl   = null;
}

async function handleUpdateSubmit(e) {
    e.preventDefault();
    const text = (document.getElementById('updateText')?.value || '').trim();
    if (!text) { showNotification('Please write your update before submitting.', 'error'); return; }

    const submitBtn = document.getElementById('updateSubmitBtn');
    if (submitBtn) { submitBtn.textContent = 'Submitting…'; submitBtn.disabled = true; }

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) { closeUpdateModal(); openSignInModal(); return; }

        const { data, error } = await supabaseClient
            .from('sc_reviews')
            .update({ review_update: text, review_updated_at: new Date().toISOString() })
            .eq('id', _updateReviewId)
            .eq('reviewer_id', user.id)
            .select()
            .single();

        if (error) throw error;

        // Sync local cache
        const idx = allReviews.findIndex(r => r.id === _updateReviewId);
        if (idx >= 0) {
            allReviews[idx].review_update     = text;
            allReviews[idx].review_updated_at = data.review_updated_at;
        }

        // Update card DOM in-place
        if (_updateCardEl) {
            _updateCardEl.querySelector('.review-update-block')?.remove();
            _updateCardEl.querySelector('.review-update-link')?.remove();
            _updateCardEl.appendChild(buildUpdateBlock(text, data.review_updated_at));
            _updateCardEl.appendChild(createUpdateLinkBtn(data.id, _updateCardEl));
        }

        closeUpdateModal();
        showNotification('Update submitted — thank you!', 'success');
    } catch (err) {
        console.error('Update submission error:', err);
        showNotification('Failed to submit update. Please try again.', 'error');
    } finally {
        if (submitBtn) { submitBtn.textContent = 'Submit Update'; submitBtn.disabled = false; }
    }
}

async function handleGoogleSignIn() {
    localStorage.setItem('reviewPending', 'true');
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href }
    });
    if (error) {
        localStorage.removeItem('reviewPending');
        showNotification('Sign-in failed. Please try again.', 'error');
    }
}

// ============================================
// REVIEWS — Submit
// ============================================
let reviewRating = 0;
const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

// Sub-rating state keyed by field name
const subRatings = {
    communication: 0,
    accuracy:      0,
    value:         0,
};
const SUB_RATING_IDS = {
    communication: 'subStarCommunication',
    accuracy:      'subStarAccuracy',
    value:         'subStarValue',
};

async function handleReviewSubmit(e) {
    e.preventDefault();

    // Require all 3 sub-ratings
    const missingRating = Object.values(subRatings).some(v => v === 0);
    if (missingRating) {
        showNotification('Please rate all categories before submitting.', 'error');
        return;
    }
    // Auto-compute overall from sub-ratings
    const subVals = Object.values(subRatings);
    reviewRating  = Math.round(subVals.reduce((a, b) => a + b, 0) / subVals.length);

    const reviewText        = (document.getElementById('reviewText')?.value || '').trim();
    const servicesPurchased = (document.getElementById('reviewServicesPurchased')?.value || '').trim();
    const hireAgain         = document.querySelector('input[name="hireAgain"]:checked')?.value || null;
    const resultTime        = document.querySelector('input[name="resultTime"]:checked')?.value || null;
    const purchaseDate      = document.querySelector('input[name="purchaseDate"]:checked')?.value || null;
    if (!reviewText) {
        showNotification('Please write your review before submitting.', 'error');
        return;
    }

    const submitBtn = document.getElementById('reviewSubmitBtn');
    if (submitBtn) { submitBtn.textContent = 'Submitting…'; submitBtn.disabled = true; }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        closeReviewModalFn();
        openSignInModal();
        if (submitBtn) { submitBtn.textContent = 'Submit Review'; submitBtn.disabled = false; }
        return;
    }

    // Upload proof images to Cloudflare R2 (up to 2)
    const imageUrls = [];
    const fileInput = document.getElementById('reviewImages');
    if (fileInput?.files?.length) {
        const profileId = document.body.dataset.profileId;
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

    // Insert review row with sub-ratings
    const { data: review, error } = await supabaseClient
        .from('sc_reviews')
        .insert({
            profile_id:            document.body.dataset.profileId,
            reviewer_id:           user.id,
            reviewer_name:         user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
            reviewer_email:        user.email,
            reviewer_avatar:       user.user_metadata?.avatar_url || null,
            rating:                reviewRating,
            rating_communication:  subRatings.communication || null,
            rating_accuracy:       subRatings.accuracy || null,
            rating_value:          subRatings.value || null,
            review_text:           reviewText,
            services_purchased:    servicesPurchased || null,
            hire_again:            hireAgain,
            result_time:           resultTime,
            purchase_date:         purchaseDate,
            image_urls:            JSON.stringify(imageUrls)
        })
        .select()
        .single();

    if (error) {
        console.error('Review submission error:', error);
        showNotification('Failed to submit review. Please try again.', 'error');
        if (submitBtn) { submitBtn.textContent = 'Submit Review'; submitBtn.disabled = false; }
        return;
    }

    closeReviewModalFn();
    showNotification('Review submitted — thank you!', 'success');

    // Prepend new review immediately, re-render page 1 with pagination
    allReviews.unshift(review);
    updateRatingSummary();
    reviewCurrentPage = 1;
    renderReviewPage();

    // Update aggregate stats on the profile row (in case DB trigger isn't set up)
    const profileId = document.body.dataset.profileId;
    if (profileId) {
        const newAvg   = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
        const newCount = allReviews.length;
        supabaseClient.from('sc_profiles')
            .update({ average_rating: Math.round(newAvg * 100) / 100, review_count: newCount })
            .eq('id', profileId)
            .then(() => {});
    }

    // Reset form
    reviewRating = 0;
    updateStarDisplay(0);
    Object.keys(subRatings).forEach(k => { subRatings[k] = 0; });
    Object.values(SUB_RATING_IDS).forEach(id => updateSubStarDisplay(id, 0));
    document.querySelectorAll('input[name="hireAgain"], input[name="resultTime"], input[name="purchaseDate"]').forEach(r => r.checked = false);
    document.getElementById('reviewForm')?.reset();
    document.getElementById('imagePreviews').innerHTML = '';
    const ord = document.getElementById('overallRatingDisplay');
    if (ord) ord.style.display = 'none';
    if (submitBtn) { submitBtn.textContent = 'Submit Review'; submitBtn.disabled = false; }
}

// ============================================
// REVIEWS — Star Rating UI
// ============================================
function updateStarDisplay(n) {
    document.querySelectorAll('#starInput .star-btn').forEach((btn, i) => {
        btn.classList.toggle('lit', i < n);
    });
    const hint = document.getElementById('starHint');
    if (hint) hint.textContent = n ? STAR_LABELS[n] : '';
}

function updateSubStarDisplay(groupId, n) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.star-btn').forEach((btn, i) => {
        btn.classList.toggle('lit', i < n);
    });
}

function recalcOverallDisplay() {
    const vals = Object.values(subRatings).filter(v => v > 0);
    const overall = document.getElementById('overallRatingDisplay');
    const overallVal = document.getElementById('overallRatingValue');
    if (!vals.length) {
        if (overall) overall.style.display = 'none';
        return;
    }
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const rounded = Math.round(avg * 10) / 10;
    if (overallVal) overallVal.textContent = rounded.toFixed(1);
    if (overall) {
        overall.style.display = 'flex';
        updateStarDisplay(Math.round(avg));
    }
    const hint = document.getElementById('starHint');
    if (hint) hint.textContent = STAR_LABELS[Math.round(avg)] || '';
}

// ============================================
// REVIEWS — Interactions + Event Listeners
// ============================================
function initializeReviewInteractions() {
    // Write review buttons (in reviews section and in header)
    document.getElementById('writeReviewBtn')?.addEventListener('click', handleWriteReview);
    document.getElementById('headerReviewBtn')?.addEventListener('click', handleWriteReview);

    // Sign-in modal
    document.getElementById('closeSignIn')?.addEventListener('click', closeSignInModalFn);
    document.getElementById('googleSignInBtn')?.addEventListener('click', handleGoogleSignIn);
    document.getElementById('signInModal')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeSignInModalFn();
    });

    // Review modal
    document.getElementById('closeReview')?.addEventListener('click', closeReviewModalFn);
    document.getElementById('reviewModal')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeReviewModalFn();
    });

    // Sub-star rating interactions
    Object.entries(SUB_RATING_IDS).forEach(([key, groupId]) => {
        const group = document.getElementById(groupId);
        if (!group) return;
        group.querySelectorAll('.star-btn').forEach(btn => {
            const val = parseInt(btn.dataset.value);
            btn.addEventListener('click', () => {
                subRatings[key] = val;
                updateSubStarDisplay(groupId, val);
                recalcOverallDisplay();
            });
            btn.addEventListener('mouseenter', () => updateSubStarDisplay(groupId, val));
            btn.addEventListener('mouseleave', () => updateSubStarDisplay(groupId, subRatings[key]));
        });
    });

    // Overall star override (inside overallRatingDisplay)
    const starInput = document.getElementById('starInput');
    starInput?.querySelectorAll('.star-btn').forEach(btn => {
        const val = parseInt(btn.dataset.value);
        btn.addEventListener('click', () => {
            reviewRating = val;
            updateStarDisplay(val);
        });
        btn.addEventListener('mouseenter', () => updateStarDisplay(val));
        btn.addEventListener('mouseleave', () => updateStarDisplay(reviewRating));
    });

    // Review form submit
    document.getElementById('reviewForm')?.addEventListener('submit', handleReviewSubmit);

    // Image upload preview
    document.getElementById('reviewImages')?.addEventListener('change', function () {
        const previews = document.getElementById('imagePreviews');
        previews.innerHTML = '';
        Array.from(this.files).slice(0, 2).forEach(file => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'image-preview-item';
                previews.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
        if (this.files.length > 2) {
            showNotification('Max 2 images allowed. Only the first 2 will be uploaded.', 'info');
        }
    });

    // Update modal
    document.getElementById('closeUpdate')?.addEventListener('click', closeUpdateModal);
    document.getElementById('updateModal')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeUpdateModal();
    });
    document.getElementById('updateForm')?.addEventListener('submit', handleUpdateSubmit);

    // Close modals on Escape key
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeReviewModalFn();
            closeSignInModalFn();
            closeUpdateModal();
            document.getElementById('contactModal')?.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Contact / Inquiry modal — with analytics tracking
    function openContact() {
        document.getElementById('contactModal')?.classList.add('active');
        document.body.style.overflow = 'hidden';
        const profileId = document.body.dataset.profileId;
        trackEvent(profileId, 'contact_click');
    }
    document.getElementById('contactBtn')?.addEventListener('click', openContact);
    document.getElementById('headerContactBtn')?.addEventListener('click', openContact);
    document.getElementById('closeContact')?.addEventListener('click', () => {
        document.getElementById('contactModal')?.classList.remove('active');
        document.body.style.overflow = '';
    });
    document.getElementById('contactModal')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) {
            e.currentTarget.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    document.getElementById('inquiryForm')?.addEventListener('submit', handleContactSubmit);

    // Share button (desktop CTA bar + mobile icon in action cluster)
    document.getElementById('headerShareBtn')?.addEventListener('click', handleShareProfile);
    document.getElementById('headerShareBtnMobile')?.addEventListener('click', handleShareProfile);

    // Profile section tabs
    document.querySelectorAll('.profile-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabKey = btn.dataset.tab;
            // Update active button
            document.querySelectorAll('.profile-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Show matching panel
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            const panel = document.getElementById(`tab${tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}`);
            if (panel) panel.classList.add('active');
        });
    });
}

// ============================================
// SHARE PROFILE
// ============================================
async function handleShareProfile() {
    const profileId   = document.body.dataset.profileId;
    const profileName = document.getElementById('profileName')?.textContent || 'this practitioner';
    const url         = window.location.href;

    trackEvent(profileId, 'share_click');

    if (navigator.share) {
        try {
            await navigator.share({
                title: `${profileName} — The Star Catalog`,
                text:  `Check out ${profileName} on The Star Catalog`,
                url,
            });
        } catch (_) { /* user cancelled */ }
    } else {
        // Fallback: copy to clipboard
        try {
            await navigator.clipboard.writeText(url);
            showNotification('Profile link copied to clipboard!', 'success');
        } catch (_) {
            showNotification('Copy this link: ' + url, 'info');
        }
    }
}

// ============================================
// LIGHTBOX for review images
// ============================================
function openLightbox(url) {
    const overlay = document.getElementById('lightboxOverlay');
    const img     = document.getElementById('lightboxImg');
    if (overlay && img) {
        img.src = url;
        overlay.classList.add('active');
    }
}

// ============================================
// CONTACT / INQUIRY MODAL
// ============================================
/*  Supabase SQL — run once to enable contact inquiries:
    ─────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS sc_inquiries (
      id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      profile_id   UUID NOT NULL,
      full_name    TEXT NOT NULL,
      date_of_birth DATE,
      email        TEXT NOT NULL,
      budget       TEXT,
      description  TEXT NOT NULL,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE sc_inquiries ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "inq_insert" ON sc_inquiries FOR INSERT WITH CHECK (true);
*/

async function handleContactSubmit(e) {
    e.preventDefault();

    const profileId    = document.body.dataset.profileId;
    const fullName     = (document.getElementById('inquiryFullName')?.value || '').trim();
    const dob          = document.getElementById('inquiryDob')?.value || null;
    const email        = (document.getElementById('inquiryEmail')?.value || '').trim();
    const budget       = (document.getElementById('inquiryBudget')?.value || '').trim() || null;
    const description  = (document.getElementById('inquiryDescription')?.value || '').trim();

    const submitBtn = document.getElementById('contactSubmitBtn');
    if (submitBtn) { submitBtn.textContent = 'Sending…'; submitBtn.disabled = true; }

    try {
        const { error } = await supabaseClient
            .from('sc_inquiries')
            .insert({
                profile_id:    profileId,
                full_name:     fullName,
                date_of_birth: dob,
                email:         email,
                budget:        budget,
                description:   description
            });

        if (error) throw error;

        trackEvent(profileId, 'inquiry_submit');
        document.getElementById('contactModal')?.classList.remove('active');
        document.body.style.overflow = '';
        showNotification('Your inquiry has been sent successfully!', 'success');
        document.getElementById('inquiryForm')?.reset();

    } catch (err) {
        console.error('Inquiry submission error:', err);
        showNotification('Failed to send inquiry. Please try again.', 'error');
    } finally {
        if (submitBtn) { submitBtn.textContent = 'Send Inquiry'; submitBtn.disabled = false; }
    }
}
