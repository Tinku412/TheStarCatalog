// ============================================
// SUPABASE CONFIGURATION
// ============================================
const SUPABASE_URL      = 'https://uapjfrxjjpotmvpuidsq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcGpmcnhqanBvdG12cHVpZHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjcxMzAsImV4cCI6MjA3NTcwMzEzMH0.NAFy5Iqs6xm39R42yxBHpjxdBmT66cB7l9LcpULUGoI';

let supabaseClient;
let currentUser = null;
let savedProfilesLoaded = false;
let isLoadingSaved = false;

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async function () {
    const { createClient } = supabase;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    initializeMobileMenu();

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        currentUser = session?.user || null;
    } catch (e) {
        console.warn('getSession error:', e);
        currentUser = null;
    }

    if (currentUser) {
        await loadSavedProfiles();
    } else {
        showSignInPrompt();
    }

    try {
        if (typeof scAuth !== 'undefined') {
            scAuth._supabase   = supabaseClient;
            scAuth.currentUser = currentUser;
            scAuth.updateNavAuthState(currentUser);
            if (currentUser) {
                scAuth.loadUserData().then(() => applyUserStateToCards()).catch(() => {});
            }
        }
    } catch (_) {}

    // Only react to real sign-in / sign-out — not token refresh or tab focus
    supabaseClient.auth.onAuthStateChange(handleAuthStateChange);
});

async function handleAuthStateChange(event, session) {
    if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;

    if (event === 'SIGNED_IN' && session?.user) {
        if (currentUser?.id === session.user.id && savedProfilesLoaded) return;

        currentUser = session.user;
        if (typeof scAuth !== 'undefined') {
            scAuth.currentUser = currentUser;
            scAuth.updateNavAuthState(currentUser);
            scAuth.loadUserData().then(() => applyUserStateToCards()).catch(() => {});
        }
        await loadSavedProfiles();
        return;
    }

    if (event === 'SIGNED_OUT') {
        currentUser = null;
        savedProfilesLoaded = false;
        if (typeof scAuth !== 'undefined') {
            scAuth.currentUser = null;
            scAuth.updateNavAuthState(null);
            scAuth.userUpvotes = new Set();
            scAuth.userSaves   = new Set();
        }
        showSignInPrompt();
    }
}

// ============================================
// LOAD SAVED PROFILES
// ============================================
async function loadSavedProfiles({ silent = false } = {}) {
    const container = document.getElementById('savedContainer');
    const heading   = document.getElementById('savedHeading');
    if (!container) return;

    const userId = currentUser?.id;
    if (!userId) {
        savedProfilesLoaded = false;
        showSignInPrompt();
        return;
    }

    if (isLoadingSaved) return;
    isLoadingSaved = true;

    if (!silent && !savedProfilesLoaded) {
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;font-family:'Source Code Pro',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);">Loading your saved practitioners…</div>`;
    }

    try {
        const { data: saves, error } = await supabaseClient
            .from('sc_saves')
            .select('profile_id, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!saves?.length) {
            savedProfilesLoaded = true;
            showEmptyState(container, heading);
            return;
        }

        if (heading) heading.textContent = `${saves.length} Saved`;

        const profileIds = saves.map(s => s.profile_id);
        const { data: profiles, error: profilesError } = await supabaseClient
            .from('sc_profiles')
            .select('*')
            .in('id', profileIds);

        if (profilesError) throw profilesError;

        const profileMap = {};
        (profiles || []).forEach(p => { profileMap[p.id] = p; });
        const ordered = profileIds.map(id => profileMap[id]).filter(Boolean);

        container.innerHTML = '';
        ordered.forEach(profile => container.appendChild(createSavedCard(profile)));
        initializeCardInteractions();
        applyUserStateToCards();
        savedProfilesLoaded = true;
    } catch (err) {
        console.error('Error loading saves:', err);
        if (!silent) {
            container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#e14b22;">Could not load saved profiles. Please refresh.</div>';
        }
        savedProfilesLoaded = false;
    } finally {
        isLoadingSaved = false;
    }
}

// ============================================
// CREATE SAVED CARD (matches spellcasters.html)
// ============================================
function createSavedCard(profile) {
    const card = document.createElement('article');
    card.className         = 'profile-card featured-card';
    card.dataset.profileId = profile.id;
    card.dataset.upvotes   = profile.upvotes || 0;
    card.setAttribute('role', 'listitem');

    const desc = profile.one_liner && profile.one_liner.length > 90
        ? profile.one_liner.substring(0, 90) + '…'
        : (profile.one_liner || '');

    const upvoteIcon = `<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polygon points="6,1 11,11 1,11" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`;
    const saveIcon   = `<svg width="10" height="10" viewBox="0 0 12 14" fill="none"><path d="M1 1h10v12l-5-3.5L1 13V1z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`;
    const starIcon   = `<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polygon points="6,1 7.5,4.5 11,5 8.5,7.5 9.5,11 6,9 2.5,11 3.5,7.5 1,5 4.5,4.5" fill="currentColor"/></svg>`;

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

    const isUpvoted = (typeof scAuth !== 'undefined') && scAuth.userUpvotes.has(profile.id);
    const isSaved   = true;

    const priceLabel = profile.minimum_price
        ? (String(profile.minimum_price).toUpperCase().startsWith('FROM') ? profile.minimum_price : `FROM ${profile.minimum_price}`)
        : '';

    const altText = profile.professional_identity
        ? `${profile.professional_name} — ${profile.professional_identity} spell caster profile`
        : `${profile.professional_name} spell caster profile`;

    card.innerHTML = `
        <div class="card-image-wrap">
            <img class="featured-card-img" src="${profile.profile_picture_url || 'placeholder.jpg'}" alt="${altText}" loading="lazy" width="300" height="225">
            <div class="card-profession">${profile.professional_identity || ''}</div>
        </div>
        <div class="featured-card-body">
            <div class="featured-card-top-row">
                <div class="featured-card-name">${profile.professional_name}</div>
                <div class="card-actions">
                    <button class="action-btn upvote-btn${isUpvoted ? ' active' : ''}" title="Recommend">${upvoteIcon}</button>
                    <button class="action-btn bookmark-btn${isSaved ? ' active' : ''}" title="Remove from saved">${saveIcon}</button>
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

function getCardProfileName(card) {
    const el = card.querySelector('.featured-card-name') || card.querySelector('.card-name');
    return el ? el.textContent.trim() : 'this practitioner';
}

function applyUserStateToCards() {
    if (typeof scAuth === 'undefined') return;
    document.querySelectorAll('#savedContainer .profile-card').forEach(card => {
        const pid = card.dataset.profileId;
        card.querySelector('.upvote-btn')?.classList.toggle('active', scAuth.userUpvotes.has(pid));
        card.querySelector('.bookmark-btn')?.classList.toggle('active', scAuth.userSaves.has(pid));
    });
}

// ============================================
// CARD INTERACTIONS (recommend + unsave)
// ============================================
function initializeCardInteractions() {
    document.querySelectorAll('#savedContainer .upvote-btn').forEach(btn => {
        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            e.stopPropagation();

            const card         = this.closest('.profile-card');
            const profileId    = card.dataset.profileId;
            const profileName  = getCardProfileName(card);
            const currentCount = parseInt(card.dataset.upvotes || '0');

            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                if (typeof scAuth !== 'undefined') {
                    scAuth.openSignInModal('Sign in to recommend practitioners.');
                } else {
                    showNotification('Sign in to recommend practitioners.', 'info');
                }
                return;
            }

            const alreadyUpvoted = (typeof scAuth !== 'undefined') && scAuth.userUpvotes.has(profileId);
            const willUpvote     = !alreadyUpvoted;
            const newCount       = willUpvote ? currentCount + 1 : Math.max(0, currentCount - 1);

            this.classList.toggle('active', willUpvote);
            card.dataset.upvotes = newCount;

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
                showNotification(willUpvote ? `▲ Recommended ${profileName}` : 'Recommendation removed', willUpvote ? 'success' : 'info');
            } catch (err) {
                this.classList.toggle('active', !willUpvote);
                card.dataset.upvotes = currentCount;
                console.error('Upvote error:', err);
            }
        });
    });

    document.querySelectorAll('#savedContainer .bookmark-btn').forEach(btn => {
        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            e.stopPropagation();

            const card        = this.closest('.profile-card');
            const profileId   = card.dataset.profileId;
            const profileName = getCardProfileName(card);

            try {
                await supabaseClient.from('sc_saves').delete()
                    .eq('profile_id', profileId)
                    .eq('user_id', currentUser.id);

                if (typeof scAuth !== 'undefined') {
                    scAuth.userSaves.delete(profileId);
                }

                card.style.cssText = 'opacity:0;transform:scale(0.95);transition:opacity 0.2s,transform 0.2s;pointer-events:none;';
                setTimeout(() => {
                    card.remove();
                    const remaining = document.querySelectorAll('#savedContainer .profile-card').length;
                    const heading   = document.getElementById('savedHeading');
                    if (heading) heading.textContent = `${remaining} Saved`;
                    if (remaining === 0) {
                        const container = document.getElementById('savedContainer');
                        if (container) showEmptyState(container, heading);
                    }
                }, 220);

                showNotification(`${profileName} removed from saved`, 'info');
            } catch (err) {
                console.error('Unsave error:', err);
                showNotification('Could not remove — please try again.', 'error');
            }
        });
    });
}

// ============================================
// EMPTY STATE
// ============================================
function showEmptyState(container, heading) {
    if (heading) heading.textContent = '0 Saved';
    container.innerHTML = `
        <div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;padding:80px 20px;text-align:center;max-width:100%;box-sizing:border-box;">
            <svg width="48" height="56" viewBox="0 0 12 14" fill="none" style="opacity:0.2;margin-bottom:20px;" aria-hidden="true">
                <path d="M1 1h10v12l-5-3.5L1 13V1z" stroke="var(--navy)" stroke-width="0.8" fill="none"/>
            </svg>
            <p style="font-family:'Cinzel',serif;font-size:15px;color:var(--navy);margin:0 0 8px;">No saved practitioners yet</p>
            <p style="font-family:'Source Code Pro',monospace;font-size:12px;color:var(--muted);max-width:340px;line-height:1.7;margin:0 0 24px;">Browse the directory and click the bookmark icon on any practitioner to save them here.</p>
            <a href="spellcasters.html" style="display:inline-block;padding:10px 22px;background:var(--navy);color:var(--cream);font-family:'Source Code Pro',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;border-radius:3px;">Browse Directory</a>
        </div>
    `;
}

// ============================================
// SIGN-IN PROMPT (unauthenticated)
// ============================================
function showSignInPrompt() {
    const container = document.getElementById('savedContainer');
    const heading   = document.getElementById('savedHeading');
    if (heading) heading.textContent = 'Saved';
    if (!container) return;
    container.innerHTML = `
        <div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;padding:80px 20px;text-align:center;max-width:100%;box-sizing:border-box;">
            <svg width="48" height="56" viewBox="0 0 12 14" fill="none" style="opacity:0.2;margin-bottom:20px;" aria-hidden="true">
                <path d="M1 1h10v12l-5-3.5L1 13V1z" stroke="var(--accent)" stroke-width="0.9" fill="none"/>
            </svg>
            <h3 style="font-family:'Cinzel',serif;font-size:17px;color:var(--navy);margin:0 0 10px;font-weight:600;">Sign In to View Your Saved Profiles</h3>
            <p style="font-family:'Source Code Pro',monospace;font-size:12px;color:var(--muted);max-width:380px;line-height:1.7;margin:0 0 28px;">Save practitioners you want to come back to. Sign in with Google to access your saved list across devices.</p>
            <button class="google-signin-btn" id="savedSignInBtn">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
            </button>
        </div>
    `;
    document.getElementById('savedSignInBtn')?.addEventListener('click', () => {
        if (typeof scAuth !== 'undefined') {
            scAuth._supabase = supabaseClient;
            scAuth.openSignInModal();
        } else {
            supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
        }
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
    document.addEventListener('click', e => {
        if (nav.classList.contains('active') &&
            !nav.contains(e.target) && !btn.contains(e.target)) {
            nav.classList.remove('active');
            btn.classList.remove('active');
        }
    });
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
