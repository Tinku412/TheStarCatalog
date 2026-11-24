// Add public testimonials from Reddit, Instagram, X, LinkedIn, or Etsy.
// The button is shown only for the site admin. Writes are also blocked in the database.
(function () {
    var ADMIN_UID = 'a6316b86-f6dd-4fee-9449-b125eafd97e8';
    var ADMIN_EMAIL = 'rkbprashanth123@gmail.com';
    var PLATFORMS = [
        { id: 'reddit', label: 'Reddit' },
        { id: 'instagram', label: 'Instagram' },
        { id: 'x', label: 'X' },
        { id: 'linkedin', label: 'LinkedIn' },
        { id: 'etsy', label: 'Etsy' }
    ];

    function isAdmin(user) {
        if (!user) return false;
        var email = String(user.email || '').trim().toLowerCase();
        return user.id === ADMIN_UID || email === ADMIN_EMAIL;
    }

    function esc(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function safeUrl(raw) {
        try {
            var u = new URL(String(raw || '').trim());
            if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
            return u.href;
        } catch (_) {
            return '';
        }
    }

    function detectPlatform(url) {
        var h = String(url || '').toLowerCase();
        if (h.indexOf('reddit.com') !== -1) return 'reddit';
        if (h.indexOf('instagram.com') !== -1) return 'instagram';
        if (h.indexOf('linkedin.com') !== -1) return 'linkedin';
        if (h.indexOf('etsy.com') !== -1) return 'etsy';
        if (h.indexOf('x.com') !== -1 || h.indexOf('twitter.com') !== -1) return 'x';
        return '';
    }

    var iconSeq = 0;

    function icon(platform) {
        iconSeq += 1;
        var gid = 'ig' + iconSeq;
        if (platform === 'reddit') {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#FF4500"/><path fill="#fff" d="M19.1 12.05a1.35 1.35 0 0 0-2.28-.96 6.4 6.4 0 0 0-3.28-.92l.75-3.55 2.46.52a.95.95 0 1 0 .1-.46l-2.76-.58a.24.24 0 0 0-.28.17l-.85 3.88a6.4 6.4 0 0 0-3.34.94 1.35 1.35 0 1 0-1.45 2.18c-.02.15-.03.3-.03.46 0 2.38 2.76 4.31 6.16 4.31s6.16-1.93 6.16-4.31c0-.16-.01-.31-.03-.46a1.35 1.35 0 0 0 .59-1.22zM9.15 13.15a.88.88 0 1 1 1.76 0 .88.88 0 0 1-1.76 0zm5.4 2.62c-.83.58-1.93.62-2.66.05a.18.18 0 0 1 .26-.26c.58.43 1.5.4 2.15-.04a.18.18 0 0 1 .25.25zm.14-1.74a.88.88 0 1 1 0-1.76.88.88 0 0 1 0 1.76z"/></svg>';
        }
        if (platform === 'instagram') {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><radialGradient id="' + gid + '" cx="30%" cy="107%" r="125%"><stop offset="0%" stop-color="#fdf497"/><stop offset="35%" stop-color="#fd5949"/><stop offset="65%" stop-color="#d6249f"/><stop offset="100%" stop-color="#285AEB"/></radialGradient></defs><rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="url(#' + gid + ')"/><rect x="7" y="7" width="10" height="10" rx="5" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="17.15" cy="6.85" r="1.05" fill="#fff"/></svg>';
        }
        if (platform === 'linkedin') {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="3" fill="#0A66C2"/><path fill="#fff" d="M6.7 9.6h2.35V17.4H6.7V9.6zM7.87 6.35a1.37 1.37 0 1 1 0 2.74 1.37 1.37 0 0 1 0-2.74zM11.3 9.6h2.25v1.07h.03c.31-.59 1.08-1.22 2.22-1.22 2.38 0 2.82 1.57 2.82 3.6v4.35h-2.35v-3.86c0-1.04-.02-2.38-1.45-2.38-1.45 0-1.67 1.13-1.67 2.3v3.94H11.3V9.6z"/></svg>';
        }
        if (platform === 'etsy') {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#F1641E"/><path fill="#fff" d="M8.2 7.4h6.15v1.55H9.85v2.05h4.05v1.5H9.85v2.15h4.6V16.2H8.2V7.4z"/></svg>';
        }
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#111"/><path fill="#fff" d="M16.7 6.2h1.7l-3.72 4.25 4.38 5.75h-3.4l-2.43-3.2-2.78 3.2H8.55l3.98-4.55L8.3 6.2h3.48l2.2 2.9 2.72-2.9zm-.6 9.02h.94L9.05 7.12h-1.01l8.06 8.1z"/></svg>';
    }

    function platformLabel(id) {
        var found = PLATFORMS.filter(function (p) { return p.id === id; })[0];
        return found ? found.label : 'Post';
    }

    async function loadCounts(client) {
        var map = {};
        try {
            var res = await client.from('sc_testimonials').select('profile_id');
            if (res.error) return map;
            (res.data || []).forEach(function (row) {
                if (!row.profile_id) return;
                map[row.profile_id] = (map[row.profile_id] || 0) + 1;
            });
        } catch (_) {}
        return map;
    }

    var TESTIMONIAL_COLUMNS = 'id, profile_id, platform, username, comment_text, source_url, image_urls, created_at';

    async function fetchForProfile(client, profileId, limit) {
        try {
            var req = client.from('sc_testimonials').select(TESTIMONIAL_COLUMNS).eq('profile_id', profileId).order('created_at', { ascending: false });
            if (limit) req = req.limit(limit);
            var res = await req;
            if (res.error && /image_urls/i.test(res.error.message || '')) {
                req = client.from('sc_testimonials').select('id, profile_id, platform, username, comment_text, source_url, created_at').eq('profile_id', profileId).order('created_at', { ascending: false });
                if (limit) req = req.limit(limit);
                res = await req;
            }
            return res;
        } catch (err) {
            return { data: [], error: err };
        }
    }

    function imageList(raw) {
        var list = [];
        try {
            list = typeof raw === 'string' ? JSON.parse(raw || '[]') : (Array.isArray(raw) ? raw : []);
        } catch (_) {
            list = [];
        }
        if (!Array.isArray(list)) return [];
        return list.map(safeUrl).filter(Boolean).slice(0, 2);
    }

    function ensureModal() {
        if (document.getElementById('testimonialModal')) return;
        var wrap = document.createElement('div');
        wrap.className = 'modal-overlay';
        wrap.id = 'testimonialModal';
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-modal', 'true');
        wrap.innerHTML =
            '<div class="modal">' +
                '<div class="modal-header">' +
                    '<div class="modal-title">Add testimonials</div>' +
                    '<div class="modal-subtitle">Paste a public comment and link it back to the original post.</div>' +
                    '<button class="modal-close" type="button" id="testimonialClose" aria-label="Close">×</button>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<form class="review-form" id="testimonialForm" autocomplete="off">' +
                        '<div><label class="review-label" for="testimonialProfile">Spellcaster <span style="color:#c9b97a;">*</span></label>' +
                        '<select class="review-input" id="testimonialProfile" required><option value="">Select a spellcaster</option></select></div>' +
                        '<div><label class="review-label" for="testimonialPlatform">Platform <span style="color:#c9b97a;">*</span></label>' +
                        '<select class="review-input" id="testimonialPlatform" required><option value="">Select platform</option>' +
                        PLATFORMS.map(function (p) { return '<option value="' + p.id + '">' + p.label + '</option>'; }).join('') +
                        '</select></div>' +
                        '<div><label class="review-label" for="testimonialUser">Username <span style="color:#c9b97a;">*</span></label>' +
                        '<input class="review-input" id="testimonialUser" required placeholder="e.g. @username"></div>' +
                        '<div><label class="review-label" for="testimonialText">Comment <span style="color:#c9b97a;">*</span></label>' +
                        '<textarea class="review-textarea" id="testimonialText" rows="5" required placeholder="Paste the comment or post text"></textarea></div>' +
                        '<div><label class="review-label" for="testimonialUrl">Link to the original post <span style="color:#c9b97a;">*</span></label>' +
                        '<input class="review-input" id="testimonialUrl" required placeholder="https://"></div>' +
                        '<div><label class="review-label">Proof / Screenshots <span style="color:var(--muted);font-weight:400;">(optional, max 2 images)</span></label>' +
                        '<div class="image-upload-zone">' +
                            '<input type="file" id="testimonialImages" accept="image/*" multiple>' +
                            '<label for="testimonialImages" class="image-upload-label">Click to upload images</label>' +
                            '<div class="image-previews" id="testimonialImageNote"></div>' +
                        '</div></div>' +
                        '<p class="testimonial-form-msg" id="testimonialMsg"></p>' +
                        '<button type="submit" class="modal-submit" id="testimonialSave">Save testimonial</button>' +
                    '</form>' +
                '</div>' +
            '</div>';
        document.body.appendChild(wrap);
        document.getElementById('testimonialClose').addEventListener('click', close);
        wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
        document.getElementById('testimonialUrl').addEventListener('input', function () {
            var guessed = detectPlatform(this.value);
            var sel = document.getElementById('testimonialPlatform');
            if (guessed && sel && !sel.value) sel.value = guessed;
        });
        document.getElementById('testimonialImages').addEventListener('change', function () {
            if (this.files && this.files.length > 2 && typeof DataTransfer !== 'undefined') {
                var dt = new DataTransfer();
                Array.from(this.files).slice(0, 2).forEach(function (file) { dt.items.add(file); });
                this.files = dt.files;
            }
            var note = document.getElementById('testimonialImageNote');
            var names = Array.from(this.files || []).slice(0, 2).map(function (file) { return file.name; });
            if (note) note.textContent = names.join(', ');
            var msg = document.getElementById('testimonialMsg');
            if (msg && this.files && this.files.length > 2) msg.textContent = 'Only the first 2 images will be saved.';
        });
    }

    function close() {
        var modal = document.getElementById('testimonialModal');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    async function open(client, preferredId) {
        ensureModal();
        var msg = document.getElementById('testimonialMsg');
        msg.textContent = '';
        document.getElementById('testimonialForm').reset();
        var imageNote = document.getElementById('testimonialImageNote');
        if (imageNote) imageNote.textContent = '';
        var sel = document.getElementById('testimonialProfile');
        sel.innerHTML = '<option value="">Loading spellcasters…</option>';
        document.getElementById('testimonialModal').classList.add('active');
        document.body.style.overflow = 'hidden';
        var res = await client.from('sc_profiles')
            .select('id, professional_name')
            .eq('status', 'approved')
            .eq('is_active', true)
            .order('professional_name');
        var rows = res.data || [];
        sel.innerHTML = '<option value="">Select a spellcaster</option>' + rows.map(function (p) {
            return '<option value="' + esc(p.id) + '">' + esc(p.professional_name || 'Untitled') + '</option>';
        }).join('');
        if (preferredId && rows.some(function (p) { return p.id === preferredId; })) sel.value = preferredId;
    }

    function bindForm(client, onSaved) {
        ensureModal();
        var form = document.getElementById('testimonialForm');
        if (form.dataset.bound === '1') return;
        form.dataset.bound = '1';
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            var msg = document.getElementById('testimonialMsg');
            var btn = document.getElementById('testimonialSave');
            var profileId = document.getElementById('testimonialProfile').value;
            var platform = document.getElementById('testimonialPlatform').value;
            var username = document.getElementById('testimonialUser').value.trim();
            var comment = document.getElementById('testimonialText').value.trim();
            var url = safeUrl(document.getElementById('testimonialUrl').value);
            if (!profileId || !platform || !username || !comment || !url) {
                msg.textContent = 'Choose a spellcaster and platform, then add a username, comment, and a valid http(s) link.';
                return;
            }
            var files = Array.from((document.getElementById('testimonialImages') || {}).files || []).slice(0, 2);
            var imageUrls = [];
            btn.disabled = true;
            btn.textContent = files.length ? 'Uploading…' : 'Saving…';
            if (files.length) {
                if (typeof r2Upload !== 'function') {
                    btn.disabled = false;
                    btn.textContent = 'Save testimonial';
                    msg.textContent = 'Image upload is unavailable right now.';
                    return;
                }
                try {
                    for (var i = 0; i < files.length; i++) {
                        imageUrls.push(await r2Upload(files[i], 'testimonial-images/' + profileId));
                    }
                } catch (_) {
                    btn.disabled = false;
                    btn.textContent = 'Save testimonial';
                    msg.textContent = 'Could not upload the screenshots. Try again, or remove them and save the text only.';
                    return;
                }
            }
            btn.textContent = 'Saving…';
            var res = await client.from('sc_testimonials').insert({
                profile_id: profileId,
                platform: platform,
                username: username,
                comment_text: comment,
                source_url: url,
                image_urls: JSON.stringify(imageUrls)
            });
            btn.disabled = false;
            btn.textContent = 'Save testimonial';
            if (res.error) {
                msg.textContent = /image_urls/i.test(res.error.message || '')
                    ? 'Could not save the screenshots. Run the testimonials image column update in Supabase, then try again.'
                    : 'Could not save. Confirm the testimonials table has been created in Supabase.';
                return;
            }
            close();
            if (typeof onSaved === 'function') onSaved(profileId);
        });
    }

    function syncButton(button, user) {
        if (!button) return;
        button.hidden = !isAdmin(user);
    }

    function sourceHtml(t) {
        var href = safeUrl(t.source_url);
        var inner = '<span class="testimonial-logo">' + icon(t.platform) + '</span>' +
            '<span class="testimonial-user">' + esc(t.username || 'Anonymous') + '</span>' +
            '<span class="testimonial-platform">' + esc(platformLabel(t.platform)) + '</span>';
        return href
            ? '<a class="testimonial-source" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + inner + '</a>'
            : '<div class="testimonial-source">' + inner + '</div>';
    }

    function cardHtml(t) {
        var raw = String(t.comment_text || '');
        var long = raw.length > 500;
        var quote = long
            ? '<span class="testimonial-short">“' + esc(raw.slice(0, 500)) + '…”</span><span class="testimonial-full" hidden>“' + esc(raw) + '”</span>'
            : '“' + esc(raw) + '”';
        var images = imageList(t.image_urls);
        var imageHtml = images.length
            ? '<div class="review-images">' + images.map(function (url) {
                return '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer"><img src="' + esc(url) + '" alt="Testimonial proof" class="review-img" loading="lazy"></a>';
            }).join('') + '</div>'
            : '';
        return '<article class="review-card testimonial-card">' +
            sourceHtml(t) +
            '<p class="review-text testimonial-quote">' + quote + '</p>' +
            (long ? '<button type="button" class="testimonial-more">see more</button>' : '') +
            imageHtml +
        '</article>';
    }

    function bindExpand() {
        if (document.documentElement.dataset.testimonialExpand === '1') return;
        document.documentElement.dataset.testimonialExpand = '1';
        document.addEventListener('click', function (e) {
            var btn = e.target.closest && e.target.closest('.testimonial-more');
            if (!btn) return;
            e.preventDefault();
            var card = btn.closest('.testimonial-card');
            if (!card) return;
            var open = card.classList.toggle('is-expanded');
            var short = card.querySelector('.testimonial-short');
            var full = card.querySelector('.testimonial-full');
            if (short) short.hidden = open;
            if (full) full.hidden = !open;
            btn.textContent = open ? 'see less' : 'see more';
        });
    }

    bindExpand();

    window.scTestimonials = {
        isAdmin: isAdmin,
        loadCounts: loadCounts,
        fetchForProfile: fetchForProfile,
        icon: icon,
        safeUrl: safeUrl,
        cardHtml: cardHtml,
        open: open,
        bindForm: bindForm,
        syncButton: syncButton
    };
})();
