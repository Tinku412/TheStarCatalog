// ============================================================
// THE STAR CATALOG — Shared Auth Module  (auth.js)
// ============================================================
//
// Supabase SQL — run once to enable upvotes & saves:
// ──────────────────────────────────────────────────
//  CREATE TABLE IF NOT EXISTS sc_upvotes (
//    id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
//    profile_id UUID NOT NULL,
//    user_id    UUID NOT NULL,
//    created_at TIMESTAMPTZ DEFAULT NOW(),
//    UNIQUE(profile_id, user_id)
//  );
//  ALTER TABLE sc_upvotes ENABLE ROW LEVEL SECURITY;
//  CREATE POLICY "uv_pub_read"   ON sc_upvotes FOR SELECT USING (true);
//  CREATE POLICY "uv_auth_ins"   ON sc_upvotes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
//  CREATE POLICY "uv_auth_del"   ON sc_upvotes FOR DELETE USING (auth.uid() = user_id);
//
//  CREATE TABLE IF NOT EXISTS sc_saves (
//    id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
//    profile_id UUID NOT NULL,
//    user_id    UUID NOT NULL,
//    created_at TIMESTAMPTZ DEFAULT NOW(),
//    UNIQUE(profile_id, user_id)
//  );
//  ALTER TABLE sc_saves ENABLE ROW LEVEL SECURITY;
//  CREATE POLICY "sv_auth_sel"   ON sc_saves FOR SELECT USING (auth.uid() = user_id);
//  CREATE POLICY "sv_auth_ins"   ON sc_saves FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
//  CREATE POLICY "sv_auth_del"   ON sc_saves FOR DELETE USING (auth.uid() = user_id);
//
//  Also enable Google OAuth:
//  Supabase Dashboard → Authentication → Providers → Google → Enable
// ============================================================

const scAuth = {
    currentUser: null,
    userUpvotes: new Set(),
    userSaves:   new Set(),
    _supabase:   null,
    _callbacks:  {},

    // ── Init (call once per page after creating supabaseClient) ──
    async init(supabaseClient, callbacks = {}) {
        this._supabase  = supabaseClient;
        this._callbacks = callbacks;

        // Listen for auth state changes (sign-in via OAuth redirect, sign-out)
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            try {
                const prevUser   = this.currentUser;
                this.currentUser = session?.user || null;
                this.updateNavAuthState(this.currentUser);

                if (this.currentUser && !prevUser) {
                    await this.loadUserData();
                    this._callbacks.onSignIn?.(this.currentUser);
                } else if (!this.currentUser && prevUser) {
                    this.userUpvotes = new Set();
                    this.userSaves   = new Set();
                    this._callbacks.onSignOut?.();
                }
            } catch (e) {
                console.warn('scAuth onAuthStateChange error:', e.message);
            }
        });

        // Check existing session — getSession() reads from localStorage for valid tokens (no network call)
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            this.currentUser = session?.user || null;
            this.updateNavAuthState(this.currentUser);
            if (this.currentUser) await this.loadUserData();
        } catch (e) {
            console.warn('scAuth getSession error:', e.message);
            this.updateNavAuthState(null);
        }

        return this.currentUser;
    },

    // ── Load this user's upvoted and saved profile IDs ──
    async loadUserData() {
        if (!this.currentUser || !this._supabase) return;
        try {
            const uid = this.currentUser.id;
            const [{ data: ups }, { data: saves }] = await Promise.all([
                this._supabase.from('sc_upvotes').select('profile_id').eq('user_id', uid),
                this._supabase.from('sc_saves').select('profile_id').eq('user_id', uid)
            ]);
            this.userUpvotes = new Set((ups   || []).map(r => r.profile_id));
            this.userSaves   = new Set((saves || []).map(r => r.profile_id));
        } catch (e) {
            console.warn('scAuth: could not load user data —', e.message);
        }
    },

    // ── Update nav to show user badge or Sign In button ──
    updateNavAuthState(user) {
        const authArea = document.getElementById('navAuthArea');
        if (!authArea) return;

        if (user) {
            const firstName = (user.user_metadata?.full_name || '').split(' ')[0] || 'Account';
            const avatar    = user.user_metadata?.avatar_url || '';
            const initial   = firstName[0].toUpperCase();

            authArea.innerHTML = `
                <div class="nav-user-badge" id="navUserBadge">
                    ${avatar
                        ? `<img src="${avatar}" alt="${firstName}" class="nav-avatar">`
                        : `<div class="nav-avatar-placeholder">${initial}</div>`}
                    <span class="nav-user-name">${firstName}</span>
                    <svg class="nav-chevron" width="8" height="5" viewBox="0 0 10 6" fill="none">
                        <polyline points="1,1 5,5 9,1" stroke="currentColor" stroke-width="1.5" fill="none"/>
                    </svg>
                    <div class="nav-user-dropdown" id="navUserDropdown">
                        <a href="saved.html" class="nav-dropdown-item">
                            <svg width="11" height="11" viewBox="0 0 12 14" fill="none">
                                <path d="M1 1h10v12l-5-3.5L1 13V1z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                            </svg>
                            Saved Profiles
                        </a>
                        <button class="nav-dropdown-item" id="navSignOutBtn">
                            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                                <path d="M5 7h7M9 4l3 3-3 3" stroke="currentColor" stroke-width="1.3"/>
                                <path d="M8 2H2v10h6" stroke="currentColor" stroke-width="1.3" fill="none"/>
                            </svg>
                            Sign Out
                        </button>
                    </div>
                </div>
            `;

            document.getElementById('navSignOutBtn')?.addEventListener('click', () => {
                this._supabase.auth.signOut();
            });
            document.getElementById('navUserBadge')?.addEventListener('click', e => {
                e.stopPropagation();
                document.getElementById('navUserDropdown')?.classList.toggle('visible');
            });
            document.addEventListener('click', () => {
                document.getElementById('navUserDropdown')?.classList.remove('visible');
            });

        } else {
            authArea.innerHTML = `
                <button class="nav-sign-in-btn" id="navSignInBtn">
                    <svg width="9" height="9" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="5" r="3" stroke="currentColor" stroke-width="1.3" fill="none"/>
                        <path d="M1 13c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.3" fill="none"/>
                    </svg>
                    Sign In
                </button>
            `;
            document.getElementById('navSignInBtn')?.addEventListener('click', () => this.openSignInModal());
        }
    },

    // ── Auth sign-in modal ──
    openSignInModal(message) {
        let modal = document.getElementById('authSignInModal');
        if (!modal) {
            modal = this._buildSignInModal();
            document.body.appendChild(modal);
        }
        if (message) {
            const p = modal.querySelector('.auth-modal-msg');
            if (p) p.textContent = message;
        }
        requestAnimationFrame(() => modal.classList.add('active'));
        document.body.style.overflow = 'hidden';
    },

    closeSignInModal() {
        document.getElementById('authSignInModal')?.classList.remove('active');
        document.body.style.overflow = '';
    },

    _buildSignInModal() {
        const div = document.createElement('div');
        div.className = 'modal-overlay';
        div.id = 'authSignInModal';
        div.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">Sign In</div>
                    <div class="modal-subtitle">One account for the whole community.</div>
                    <button class="modal-close" id="authModalClose">×</button>
                </div>
                <div class="modal-body">
                    <p class="auth-modal-msg" style="font-size:13.5px;color:var(--muted);line-height:1.7;margin-bottom:1.4rem;">Sign in to recommend, save, and review practitioners in the directory.</p>
                    <button class="google-signin-btn" id="authGoogleBtn">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                            <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                        </svg>
                        Continue with Google
                    </button>
                </div>
            </div>
        `;
        div.addEventListener('click', e => { if (e.target === div) this.closeSignInModal(); });
        div.querySelector('#authModalClose').addEventListener('click', () => this.closeSignInModal());
        div.querySelector('#authGoogleBtn').addEventListener('click', async () => {
            await this._supabase.auth.signInWithOAuth({
                provider: 'google',
                options:  { redirectTo: window.location.href }
            });
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') this.closeSignInModal();
        });
        return div;
    },

    // ── Toggle upvote (one per user per profile) ──
    async toggleUpvote(profileId, currentDisplayCount) {
        if (!this.currentUser) {
            this.openSignInModal('Sign in to recommend practitioners.');
            return null;
        }

        const isUpvoted = this.userUpvotes.has(profileId);
        const newCount  = isUpvoted
            ? Math.max(0, (currentDisplayCount || 0) - 1)
            : (currentDisplayCount || 0) + 1;

        if (isUpvoted) {
            this.userUpvotes.delete(profileId);
            await this._supabase.from('sc_upvotes').delete()
                .eq('profile_id', profileId).eq('user_id', this.currentUser.id);
        } else {
            this.userUpvotes.add(profileId);
            await this._supabase.from('sc_upvotes').insert({
                profile_id: profileId,
                user_id:    this.currentUser.id
            });
        }

        // Keep the display count on sc_profiles in sync
        await this._supabase.from('sc_profiles')
            .update({ upvotes: newCount })
            .eq('id', profileId);

        return { upvoted: !isUpvoted, count: newCount };
    },

    // ── Toggle save ──
    async toggleSave(profileId) {
        if (!this.currentUser) {
            this.openSignInModal('Sign in to save practitioners.');
            return null;
        }

        const isSaved = this.userSaves.has(profileId);

        if (isSaved) {
            this.userSaves.delete(profileId);
            await this._supabase.from('sc_saves').delete()
                .eq('profile_id', profileId).eq('user_id', this.currentUser.id);
        } else {
            this.userSaves.add(profileId);
            await this._supabase.from('sc_saves').insert({
                profile_id: profileId,
                user_id:    this.currentUser.id
            });
        }

        return { saved: !isSaved };
    }
};
