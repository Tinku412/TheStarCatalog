// ============================================
// SUPABASE CONFIGURATION
// ============================================
const SUPABASE_URL      = 'https://uapjfrxjjpotmvpuidsq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcGpmcnhqanBvdG12cHVpZHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjcxMzAsImV4cCI6MjA3NTcwMzEzMH0.NAFy5Iqs6xm39R42yxBHpjxdBmT66cB7l9LcpULUGoI';

let supabaseClient;
let allProfiles = [];

// ============================================
// INIT — profiles load first, auth is background
// ============================================
document.addEventListener('DOMContentLoaded', async function () {
    const { createClient } = supabase;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    initializeMobileMenu();
    initializeFilters();

    // ── Step 1: Load profiles immediately (zero auth dependency) ──
    await loadProfiles();

    // ── Step 2: Init auth in background AFTER content is visible ──
    // Auth is purely cosmetic here (nav badge, button states).
    // It NEVER blocks content loading.
    try {
        if (typeof scAuth !== 'undefined') {
            scAuth.init(supabaseClient, {
                onSignIn:  () => applyUserStateToCards(),
                onSignOut: () => applyUserStateToCards()
            }).catch(() => {}); // swallow async errors silently
        }
    } catch (_) { /* scAuth optional — site works fine without it */ }
});

// ============================================
// LOAD PROFILES FROM SUPABASE
// ============================================
async function loadProfiles() {
    const cardsContainer = document.querySelector('.cards-container');
    if (!cardsContainer) return;

    cardsContainer.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;font-family:\'Source Code Pro\',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);">Loading profiles…</div>';

    try {
        // Query all active profiles — no auth required, no status filter
        // (profiles submitted via admin are is_active=true; use Supabase dashboard
        //  to set is_active=false for any you want to hide)
        const { data: profiles, error } = await supabaseClient
            .from('sc_profiles')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            cardsContainer.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#e14b22;">Error loading profiles: ${error.message}</div>`;
            return;
        }

        if (!profiles?.length) {
            cardsContainer.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted);font-family:\'Source Code Pro\',monospace;font-size:13px;">No spellcasters found.</div>';
            return;
        }

        allProfiles = profiles;
        applyFiltersAndSort();

        const countEl = document.getElementById('profileCount');
        if (countEl) countEl.textContent = `${profiles.length} spellcasters`;

    } catch (err) {
        console.error('loadProfiles error:', err);
        cardsContainer.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#e14b22;">Could not load profiles — ${err.message}</div>`;
    }
}

// ============================================
// CREATE PROFILE CARD
// ============================================
function createProfileCard(profile) {
    const card = document.createElement('article');
    card.className         = 'profile-card featured-card';
    card.dataset.profileId = profile.id;
    card.dataset.upvotes   = profile.upvotes || 0;

    const desc = profile.one_liner && profile.one_liner.length > 90
        ? profile.one_liner.substring(0, 90) + '…'
        : (profile.one_liner || '');

    const upvoteIcon = `<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polygon points="6,1 11,11 1,11" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`;
    const saveIcon   = `<svg width="10" height="10" viewBox="0 0 12 14" fill="none"><path d="M1 1h10v12l-5-3.5L1 13V1z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`;
    const starIcon   = `<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polygon points="6,1 7.5,4.5 11,5 8.5,7.5 9.5,11 6,9 2.5,11 3.5,7.5 1,5 4.5,4.5" fill="currentColor"/></svg>`;

    const upvotes     = profile.upvotes || 0;
    const avgRating   = profile.average_rating ? parseFloat(profile.average_rating).toFixed(1) : null;
    const reviewCount = profile.review_count || 0;

    let ratingDisplay;
    if (reviewCount > 0 && avgRating) {
        ratingDisplay = `${avgRating} (${reviewCount} review${reviewCount === 1 ? '' : 's'})`;
    } else if (reviewCount > 0) {
        ratingDisplay = `${reviewCount} review${reviewCount === 1 ? '' : 's'}`;
    } else {
        ratingDisplay = 'Be the first to review';
    }

    // Reflect auth state if scAuth is already resolved (may be empty Sets if not yet resolved)
    const isUpvoted = (typeof scAuth !== 'undefined') && scAuth.userUpvotes.has(profile.id);
    const isSaved   = (typeof scAuth !== 'undefined') && scAuth.userSaves.has(profile.id);

    const priceLabel = profile.minimum_price
        ? (String(profile.minimum_price).toUpperCase().startsWith('FROM') ? profile.minimum_price : `FROM ${profile.minimum_price}`)
        : '';

    card.innerHTML = `
        <div class="card-image-wrap">
            <img class="featured-card-img" src="${profile.profile_picture_url || 'placeholder.jpg'}" alt="${profile.professional_name}" loading="lazy">
            <div class="card-profession">${profile.professional_identity || ''}</div>
        </div>
        <div class="featured-card-body">
            <div class="featured-card-top-row">
                <div class="featured-card-name">${profile.professional_name}</div>
                <div class="card-actions">
                    <button class="action-btn upvote-btn${isUpvoted ? ' active' : ''}" title="Recommend">${upvoteIcon}</button>
                    <button class="action-btn bookmark-btn${isSaved   ? ' active' : ''}" title="Save">${saveIcon}</button>
                </div>
            </div>
            ${desc ? `<div class="featured-card-tagline">${desc}</div>` : ''}
            <div class="featured-card-footer">
                <div class="featured-card-rating">
                    <span class="featured-card-stars">${starIcon}</span>
                    <span class="featured-card-rating-val${reviewCount === 0 ? ' rating-val-compact' : ''}">${ratingDisplay}</span>
                </div>
                <div class="featured-card-price">${priceLabel || '—'}</div>
            </div>
        </div>
    `;

    card.addEventListener('click', function (e) {
        if (!e.target.closest('.action-btn')) {
            // Track card click (fire-and-forget)
            try {
                supabaseClient.from('sc_analytics').insert({ profile_id: profile.id, event_type: 'profile_card_click' }).then(() => {});
            } catch (_) {}
            const href = profile.slug
                ? `/spellcasters/${encodeURIComponent(profile.slug)}`
                : `/profile.html?id=${encodeURIComponent(profile.id)}`;
            window.location.href = href;
        }
    });

    return card;
}

// ============================================
// APPLY USER STATE TO ALL VISIBLE CARDS
// (called after auth resolves via scAuth callbacks)
// ============================================
function applyUserStateToCards() {
    if (typeof scAuth === 'undefined') return;
    document.querySelectorAll('.profile-card').forEach(card => {
        const pid = card.dataset.profileId;
        card.querySelector('.upvote-btn')?.classList.toggle('active', scAuth.userUpvotes.has(pid));
        card.querySelector('.bookmark-btn')?.classList.toggle('active', scAuth.userSaves.has(pid));
    });
}

// ============================================
function getCardProfileName(card) {
    const el = card.querySelector('.featured-card-name') || card.querySelector('.card-name');
    return el ? el.textContent.trim() : 'this spellcaster';
}

// ============================================
// CARD INTERACTIONS — auth checked on demand
// No auth needed to browse; only needed to write
// ============================================
function initializeCardInteractions() {

    // ── Upvote ──────────────────────────────
    document.querySelectorAll('.upvote-btn').forEach(btn => {
        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            e.stopPropagation();

            const card         = this.closest('.profile-card');
            const profileId    = card.dataset.profileId;
            const profileName  = getCardProfileName(card);
            const currentCount = parseInt(card.dataset.upvotes || '0');

            // Auth check on demand — don't require scAuth to be pre-initialized
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                if (typeof scAuth !== 'undefined') {
                    scAuth.openSignInModal('Sign in to recommend spellcasters.');
                } else {
                    showNotification('Sign in to recommend spellcasters.', 'info');
                }
                return;
            }

            // Optimistic UI update
            const alreadyUpvoted = (typeof scAuth !== 'undefined') && scAuth.userUpvotes.has(profileId);
            const willUpvote     = !alreadyUpvoted;
            const newCount       = willUpvote ? currentCount + 1 : Math.max(0, currentCount - 1);

            this.classList.toggle('active', willUpvote);
            card.dataset.upvotes = newCount;

            // Persist — delegate to scAuth if available, else do it directly
            try {
                if (typeof scAuth !== 'undefined' && scAuth._supabase) {
                    await scAuth.toggleUpvote(profileId, currentCount);
                } else {
                    // Direct fallback (scAuth not loaded)
                    if (alreadyUpvoted) {
                        await supabaseClient.from('sc_upvotes').delete().eq('profile_id', profileId).eq('user_id', user.id);
                    } else {
                        await supabaseClient.from('sc_upvotes').insert({ profile_id: profileId, user_id: user.id });
                    }
                    await supabaseClient.from('sc_profiles').update({ upvotes: newCount }).eq('id', profileId);
                }
                const p = allProfiles.find(x => x.id === profileId);
                if (p) p.upvotes = newCount;
                showNotification(willUpvote ? `▲ Recommended ${profileName}` : `Recommendation removed`, willUpvote ? 'success' : 'info');
            } catch (err) {
                // Revert optimistic update on error
                this.classList.toggle('active', !willUpvote);
                card.dataset.upvotes = currentCount;
                console.error('Upvote error:', err);
            }
        });
    });

    // ── Bookmark / Save ─────────────────────
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            e.stopPropagation();

            const card        = this.closest('.profile-card');
            const profileId   = card.dataset.profileId;
            const profileName = getCardProfileName(card);

            // Auth check on demand
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                if (typeof scAuth !== 'undefined') {
                    scAuth.openSignInModal('Sign in to save spellcasters.');
                } else {
                    showNotification('Sign in to save spellcasters.', 'info');
                }
                return;
            }

            const alreadySaved = (typeof scAuth !== 'undefined') && scAuth.userSaves.has(profileId);
            const willSave     = !alreadySaved;

            this.classList.toggle('active', willSave);

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
                showNotification(willSave ? `${profileName} saved` : `${profileName} removed`, willSave ? 'success' : 'info');
            } catch (err) {
                this.classList.toggle('active', !willSave); // revert
                console.error('Save error:', err);
            }
        });
    });
}

// ============================================
// MOBILE MENU
// ============================================
function initializeMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const nav = document.getElementById('mobileNav');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
        this.classList.toggle('active');
        nav.classList.toggle('active');
    });
    document.addEventListener('click', function (e) {
        if (nav.classList.contains('active') &&
            !nav.contains(e.target) && !btn.contains(e.target)) {
            nav.classList.remove('active');
            btn.classList.remove('active');
        }
    });
    nav.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            nav.classList.remove('active');
            btn.classList.remove('active');
        });
    });
}

// ============================================
// FILTER + SORT
// ============================================
function parsePrice(priceStr) {
    if (!priceStr) return Infinity;
    const m = priceStr.match(/\d+/);
    return m ? parseInt(m[0], 10) : Infinity;
}

function parseExperience(expStr) {
    if (!expStr) return 0;
    const m = expStr.match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
}

function deliveryOrder(deliveryStr) {
    if (!deliveryStr) return 99;
    const d = deliveryStr.toLowerCase();
    if (d.includes('same')) return 0;
    if (d.match(/1.?3|1 to 3/)) return 1;
    if (d.match(/3.?7|3 to 7|week/)) return 2;
    if (d.match(/7.?14|two week/)) return 3;
    if (d.match(/14.?30|month/)) return 4;
    return 5;
}

function applyFiltersAndSort() {
    if (!allProfiles.length) return;

    const fpPractType  = document.getElementById('fpspellcasterType');
    const fpSpec       = document.getElementById('fpSpecialty');
    const fpSvcType    = document.getElementById('fpServiceType');
    const fpDel        = document.getElementById('fpDelivery');
    const fpSort       = document.getElementById('fpSort');
    const fpSearchEl   = document.getElementById('fpSearch');

    const practType  = fpPractType ? fpPractType.value.toLowerCase()  : '';
    const specialty  = fpSpec      ? fpSpec.value.toLowerCase()        : '';
    const svcType    = fpSvcType   ? fpSvcType.value.toLowerCase()     : '';
    const delivery   = fpDel       ? fpDel.value                       : '';
    const sort       = fpSort      ? fpSort.value                      : 'newest';
    const nameQuery  = fpSearchEl  ? fpSearchEl.value.trim().toLowerCase() : '';

    let filtered = [...allProfiles];

    // Name search filter
    if (nameQuery) {
        filtered = filtered.filter(p =>
            (p.professional_name || '').toLowerCase().includes(nameQuery) ||
            (p.personal_name    || '').toLowerCase().includes(nameQuery)
        );
    }

    if (practType) filtered = filtered.filter(p => p.professional_identity?.toLowerCase().includes(practType));
    if (specialty) filtered = filtered.filter(p => p.specialties?.toLowerCase().includes(specialty));
    if (svcType)   filtered = filtered.filter(p => p.service_type?.toLowerCase().includes(svcType));
    if (delivery) {
        const maxOrder = { fast: 1, week: 2, twoweeks: 3, month: 4 }[delivery] ?? 99;
        filtered = filtered.filter(p => deliveryOrder(p.delivery_time) <= maxOrder);
    }

    if (sort === 'newest')     filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    else if (sort === 'upvotes')    filtered.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    else if (sort === 'price_asc')  filtered.sort((a, b) => parsePrice(a.minimum_price) - parsePrice(b.minimum_price));
    else if (sort === 'price_desc') filtered.sort((a, b) => parsePrice(b.minimum_price) - parsePrice(a.minimum_price));

    const container = document.querySelector('.cards-container');
    if (!container) return;
    container.innerHTML = '';

    if (!filtered.length) {
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;font-family:\'Source Code Pro\',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);">No spellcasters match your filters.</div>';
    } else {
        filtered.forEach(p => container.appendChild(createProfileCard(p)));
        initializeCardInteractions();
        applyUserStateToCards();
    }

    const countEl = document.getElementById('profileCount');
    if (countEl) {
        countEl.textContent = filtered.length === allProfiles.length
            ? `${allProfiles.length} spellcasters`
            : `${filtered.length} of ${allProfiles.length} spellcasters`;
    }
}

function initializeFilters() {
    ['fpspellcasterType', 'fpSpecialty', 'fpServiceType', 'fpDelivery', 'fpSort'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', applyFiltersAndSort);
    });
    // Search input — filter on every keystroke with a tiny debounce
    let searchTimer;
    document.getElementById('fpSearch')?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(applyFiltersAndSort, 220);
    });
    document.getElementById('fpClear')?.addEventListener('click', () => {
        ['fpspellcasterType', 'fpSpecialty', 'fpServiceType', 'fpDelivery'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const sortEl = document.getElementById('fpSort');
        if (sortEl) sortEl.value = 'newest';
        const searchEl = document.getElementById('fpSearch');
        if (searchEl) searchEl.value = '';
        applyFiltersAndSort();
    });

    // Mobile: toggle filter/sort panel
    const fpToggle = document.getElementById('fpMobileToggle');
    const fpPanel  = document.getElementById('filterPanel');
    if (fpToggle && fpPanel) {
        fpToggle.addEventListener('click', () => {
            const open = fpPanel.classList.toggle('is-open');
            fpToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
    }
}

// ============================================
// NOTIFICATION
// ============================================
function showNotification(message, type = 'success') {
    const n = document.createElement('div');
    n.className = `notification notification-${type}`;
    n.innerHTML = `<div class="notification-content">
        <span class="notification-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
        <span class="notification-message">${message}</span>
    </div>`;
    document.body.appendChild(n);
    setTimeout(() => n.classList.add('show'), 50);
    setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, 3000);
}
