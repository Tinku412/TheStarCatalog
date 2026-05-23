// ============================================
// SUPABASE CONFIGURATION
// ============================================
const SUPABASE_URL      = 'https://uapjfrxjjpotmvpuidsq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcGpmcnhqanBvdG12cHVpZHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjcxMzAsImV4cCI6MjA3NTcwMzEzMH0.NAFy5Iqs6xm39R42yxBHpjxdBmT66cB7l9LcpULUGoI';

let supabaseClient;

// ─ Edit mode state ────────────────────────────────────────────────────────────
let editProfileId   = null;   // set when ?edit=<id> is in the URL
let editCurrentPic  = null;   // URL of the existing profile picture

function buildOfferingRow() {
    const row = document.createElement('div');
    row.className = 'offering-row';
    row.innerHTML = `
        <input type="text" name="offeringName[]" placeholder="Offering (e.g. Love Binding)">
        <input type="text" name="offeringPrice[]" placeholder="Price (e.g. from $75)">
        <button type="button" class="offering-remove-btn" aria-label="Remove offering row">×</button>
    `;
    return row;
}

// ============================================
// SLUG GENERATION
// ============================================
function generateSlug(name) {
    return (name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip accents (é → e)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

/** Build slug from professional name, falling back to personal name. */
function slugFromFormData(formData) {
    const professional = (formData.get('professionalName') || '').trim();
    const personal     = (formData.get('personalName') || '').trim();
    return generateSlug(professional) || generateSlug(personal) || null;
}

/**
 * Insert profile, retrying with -2, -3, … suffixes if slug collides.
 * Avoids a pre-insert SELECT (which can hang or miss rows under RLS).
 */
async function insertProfileWithUniqueSlug(profileData, baseSlug) {
    const slugCandidates = [baseSlug];
    for (let i = 2; i <= 25; i++) slugCandidates.push(`${baseSlug}-${i}`);

    let lastError = null;
    for (const slug of slugCandidates) {
        const payload = { ...profileData, slug };
        const { data, error } = await supabaseClient
            .from('sc_profiles')
            .insert([payload])
            .select('id, slug')
            .limit(1);

        if (!error && data && data.length > 0) {
            return data[0];
        }

        lastError = error;
        // Unique violation on slug — try next candidate
        if (error?.code === '23505') continue;

        // Column missing — insert without slug so submission still works, but warn
        if (error?.message?.includes('slug') && /column|schema cache/i.test(error.message)) {
            console.warn('[submit] slug column missing in database — run ALTER TABLE to add it');
            const { slug: _s, ...withoutSlug } = payload;
            const { data: fallbackData, error: fallbackErr } = await supabaseClient
                .from('sc_profiles')
                .insert([withoutSlug])
                .select('id')
                .limit(1);
            if (fallbackErr) throw fallbackErr;
            throw new Error(
                'Profile saved, but the slug column is missing in your database. ' +
                'Run: ALTER TABLE sc_profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;'
            );
        }

        throw error;
    }

    throw lastError || new Error('Could not generate a unique profile URL slug.');
}

document.addEventListener('DOMContentLoaded', function () {
    const { createClient } = supabase;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const form = document.getElementById('submitForm');
    if (form) form.addEventListener('submit', handleFormSubmit);

    // Profile picture size guard
    document.querySelector('input[name="profilePic"]')?.addEventListener('change', function () {
        if (this.files[0]?.size > 5 * 1024 * 1024) {
            showNotification('Profile picture must be under 5 MB.', 'error');
            this.value = '';
        }
    });

    // Dynamic offering rows
    const addRowBtn = document.getElementById('addOfferingRow');
    const rowsWrap  = document.getElementById('offeringRows');
    if (addRowBtn && rowsWrap) {
        addRowBtn.addEventListener('click', () => rowsWrap.appendChild(buildOfferingRow()));
        rowsWrap.addEventListener('click', function (e) {
            const removeBtn = e.target.closest('.offering-remove-btn');
            if (!removeBtn) return;
            const allRows = rowsWrap.querySelectorAll('.offering-row');
            if (allRows.length <= 1) {
                allRows[0].querySelector('input[name="offeringName[]"]').value  = '';
                allRows[0].querySelector('input[name="offeringPrice[]"]').value = '';
                return;
            }
            removeBtn.closest('.offering-row')?.remove();
        });
    }

    // ── Edit mode detection ───────────────────────────────────────────────────
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId) {
        editProfileId = editId;
        document.getElementById('_editProfileId').value = editId;
        // Show a saved confirmation if redirected back after saving
        if (params.get('saved') === '1') {
            setTimeout(() => showNotification('Profile saved successfully!', 'success'), 300);
        }
        loadEditMode(editId);
    }
});

// ============================================
// EDIT MODE — load existing profile into form
// ============================================
async function loadEditMode(profileId) {
    // Verify auth — only the owner should edit
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        showNotification('You must be signed in to edit a profile.', 'error');
        return;
    }

    // Fetch the profile row
    const { data: profiles, error } = await supabaseClient
        .from('sc_profiles')
        .select('*')
        .eq('id', profileId)
        .limit(1);

    if (error || !profiles || profiles.length === 0) {
        showNotification('Profile not found or you do not have permission to edit it.', 'error');
        return;
    }

    const p = profiles[0];

    // Verify the logged-in user is the owner
    if (p.owner_user_id && p.owner_user_id !== user.id) {
        showNotification('You are not authorised to edit this profile.', 'error');
        return;
    }

    // Show edit banner
    const banner = document.getElementById('editModeBanner');
    const nameEl = document.getElementById('editModeProfileName');
    if (banner) banner.style.display = '';
    if (nameEl) nameEl.textContent   = p.professional_name || '';

    // Update page title and submit button
    document.title = 'Edit Profile — ' + (p.professional_name || '');
    document.querySelectorAll('.submit-btn').forEach(b => b.textContent = '✦ Save Changes');

    const form = document.getElementById('submitForm');
    if (!form) return;

    // ── Helper to set a plain input / select / textarea ──────────────────────
    function setField(name, value) {
        if (value == null) return;
        const el = form.elements[name];
        if (!el) return;
        el.value = value;
    }

    // ── Step 1 fields ─────────────────────────────────────────────────────────
    setField('personalName',    p.personal_name);
    setField('professionalName', p.professional_name);
    setField('oneLiner',        p.one_liner);
    setField('description',     p.description);

    // Existing profile picture — show as preview, keep URL for reuse
    if (p.profile_picture_url) {
        editCurrentPic = p.profile_picture_url;
        const preview = document.getElementById('picPreview');
        if (preview) {
            preview.src          = p.profile_picture_url;
            preview.style.display = 'block';
        }
    }

    // Specialties — wait for Tom Select to be ready, then set values
    (function trySetSpecialties(attempts) {
        if (window.specialtiesSelectInstance && p.specialties) {
            const vals = p.specialties.split(',').map(s => s.trim()).filter(Boolean);
            // Add any custom values that aren't in the predefined list
            vals.forEach(v => {
                if (!window.specialtiesSelectInstance.options[v]) {
                    window.specialtiesSelectInstance.addOption({ value: v, text: v });
                }
            });
            window.specialtiesSelectInstance.setValue(vals);
        } else if (attempts > 0) {
            setTimeout(() => trySetSpecialties(attempts - 1), 150);
        }
    })(20);

    // ── Step 2 fields ─────────────────────────────────────────────────────────
    // Practitioner type — handle "Other" case
    const typeSelect = form.elements['professionalIdentity'];
    if (typeSelect && p.professional_identity) {
        // Try setting directly
        typeSelect.value = p.professional_identity;
        // If no match, use Other + text
        if (!typeSelect.value) {
            typeSelect.value = 'Other';
            setField('professionalIdentityOther', p.professional_identity);
            const wrap = document.getElementById('practitionerTypeOtherWrap');
            if (wrap) wrap.style.display = '';
        }
    }

    setField('serviceType',      p.service_type);
    setField('experience',       p.experience);
    setField('priceRange',       p.minimum_price);
    setField('deliveryTime',     p.delivery_time);
    setField('providesProof',    p.provides_proof ? 'Yes' : (p.provides_proof === false ? 'No' : ''));
    setField('refund',           p.refund_policy  ? 'Yes' : (p.refund_policy  === false ? 'No' : ''));
    setField('acceptsEmergency', p.accepts_emergency);
    setField('location',         p.location);
    setField('activeSince',      p.active_since);
    setField('responseTime',     p.response_time);
    setField('worksOnline',      p.works_online === false ? 'No' : (p.works_online ? 'Yes' : ''));
    setField('languages',        p.languages);

    // Offerings — parse from the saved `offerings` text field (Name — Price\n...)
    if (p.offerings) {
        const rowsWrap = document.getElementById('offeringRows');
        if (rowsWrap) {
            rowsWrap.innerHTML = '';
            const lines = p.offerings.split('\n').filter(l => l.trim());
            lines.forEach((line, i) => {
                const dashIdx = line.indexOf(' — ');
                const name    = dashIdx >= 0 ? line.slice(0, dashIdx).trim() : line.trim();
                const price   = dashIdx >= 0 ? line.slice(dashIdx + 3).trim() : '';
                const row     = buildOfferingRow();
                row.querySelector('input[name="offeringName[]"]').value  = name;
                row.querySelector('input[name="offeringPrice[]"]').value  = price;
                rowsWrap.appendChild(row);
            });
            // If nothing parsed, keep the empty default row
            if (!lines.length) rowsWrap.appendChild(buildOfferingRow());
        }
    }

    // ── Step 3 (contact) fields ───────────────────────────────────────────────
    setField('email',          p.email);
    setField('website',        p.website);
    setField('instagramLink',  p.instagram_link);
    setField('redditLink',     p.reddit_link);
    setField('storeLink',      p.store_link);
}

// ============================================
// FORM SUBMISSION
// ============================================
async function handleFormSubmit(e) {
    e.preventDefault();

    const submitBtn  = document.querySelector('.submit-btn');
    const origText   = submitBtn?.textContent || 'Submit Practitioner';
    if (submitBtn) { submitBtn.textContent = 'Submitting…'; submitBtn.disabled = true; }

    try {
        const formData = new FormData(e.target);

        // ── Specialties — read from Tom Select multi-select ───────────────────
        const specEl = document.getElementById('specialtiesSelect');
        const selectedSpecs = Array.from(specEl?.selectedOptions || [])
            .map(o => o.value)
            .filter(v => v !== 'Custom / Other');
        const customSpecText = document.getElementById('specialtyCustomTextInput')?.value.trim();
        if (customSpecText) selectedSpecs.push(customSpecText);
        const specialties = selectedSpecs.join(', ');

        // ── Practitioner type — handle "Other (please specify)" ───────────────
        let professionalIdentity = formData.get('professionalIdentity') || '';
        if (professionalIdentity === 'Other (please specify)') {
            professionalIdentity = (formData.get('professionalIdentityOther') || '').trim() || 'Other';
        }

        // ── Offerings ─────────────────────────────────────────────────────────
        const offeringNames  = formData.getAll('offeringName[]').map(v => String(v || '').trim());
        const offeringPrices = formData.getAll('offeringPrice[]').map(v => String(v || '').trim());
        const structured = offeringNames
            .map((n, i) => ({ name: n, price: offeringPrices[i] || '' }))
            .filter(item => item.name || item.price);
        const servicesOffered = structured.map(i => i.name).filter(Boolean).join(', ');
        const offeringsText   = structured
            .map(i => i.price ? `${i.name || 'Offering'} — ${i.price}` : i.name)
            .filter(Boolean).join('\n');

        // ── Contact check ─────────────────────────────────────────────────────
        const hasContact = formData.get('email') || formData.get('website') ||
                           formData.get('storeLink') || formData.get('instagramLink') ||
                           formData.get('redditLink');
        if (!hasContact) {
            showNotification('Please provide at least one contact method.', 'error');
            if (submitBtn) { submitBtn.textContent = origText; submitBtn.disabled = false; }
            return;
        }

        // ── Profile picture — upload to Cloudflare R2 ─────────────────────────
        let picUrl = null;
        const picFile = formData.get('profilePic');
        if (picFile && picFile.size > 0) {
            // New file selected — upload to R2
            picUrl = await r2Upload(picFile, 'profile-pictures');
        } else if (editProfileId && editCurrentPic) {
            // Edit mode with no new file — keep existing URL
            picUrl = editCurrentPic;
        }

        // ── Slug (only required for new profiles — kept unchanged on edit) ──────
        const baseSlug = slugFromFormData(formData);
        if (!baseSlug && !editProfileId) {
            showNotification('Please enter a Professional / Practice Name so we can create a profile URL.', 'error');
            if (submitBtn) { submitBtn.textContent = origText; submitBtn.disabled = false; }
            return;
        }

        // ── Build data payload ─────────────────────────────────────────────────
        const profileData = {
            personal_name:         formData.get('personalName')     || null,
            professional_name:     formData.get('professionalName') || null,
            profile_picture_url:   picUrl,
            one_liner:             formData.get('oneLiner')         || null,
            description:           formData.get('description')      || null,
            specialties:           specialties                      || null,
            professional_identity: professionalIdentity             || null,
            service_type:          formData.get('serviceType')      || null,
            experience:            formData.get('experience')       || null,
            provides_proof:        formData.get('providesProof')    === 'Yes',
            refund_policy:         formData.get('refund')           === 'Yes',
            delivery_time:         formData.get('deliveryTime')     || null,
            minimum_price:         formData.get('priceRange')       || null,
            email:                 formData.get('email')            || null,
            website:               formData.get('website')          || null,
            store_link:            formData.get('storeLink')        || null,
            instagram_link:        formData.get('instagramLink')    || null,
            reddit_link:           formData.get('redditLink')       || null,
            location:              formData.get('location')         || null,
            active_since:          formData.get('activeSince')      || null,
            response_time:         formData.get('responseTime')     || null,
            languages:             formData.get('languages')        || null,
            works_online:          formData.get('worksOnline')      !== 'No — In-person only',
            services_offered:      servicesOffered                  || null,
            offerings:             offeringsText                    || null,
            accepts_emergency:     formData.get('acceptsEmergency') || null,
        };

        // ── Branch: UPDATE existing profile vs INSERT new ─────────────────────
        if (editProfileId) {
            // Edit mode — UPDATE the existing row (slug stays unchanged)
            const { error: updateErr } = await supabaseClient
                .from('sc_profiles')
                .update(profileData)
                .eq('id', editProfileId);

            if (updateErr) throw updateErr;

            showNotification('Profile updated successfully!', 'success');
            if (submitBtn) { submitBtn.textContent = '✦ Save Changes'; submitBtn.disabled = false; }

            // Redirect back to the profile page after a short delay
            setTimeout(() => {
                window.location.href = '/submit-practitioner.html?edit=' + encodeURIComponent(editProfileId) + '&saved=1';
            }, 1800);

        } else {
            // New submission — INSERT with auto-generated unique slug
            profileData.status    = 'pending';
            profileData.is_active = true;

            const inserted = await insertProfileWithUniqueSlug(profileData, baseSlug);
            console.log('[submit] Profile created with slug:', inserted?.slug);

            showNotification('Practitioner submitted successfully! It will appear once reviewed. Thank you!', 'success');

            setTimeout(() => {
                e.target.reset();
                if (window.specialtiesSelectInstance) window.specialtiesSelectInstance.clear();
                const otherWrap  = document.getElementById('practitionerTypeOtherWrap');
                if (otherWrap)  otherWrap.style.display  = 'none';
                const customWrap = document.getElementById('specialtyCustomTextWrap');
                if (customWrap) customWrap.style.display = 'none';
                const picPreview = document.getElementById('picPreview');
                if (picPreview) { picPreview.src = ''; picPreview.style.display = 'none'; }
                if (submitBtn)  { submitBtn.textContent = origText; submitBtn.disabled = false; }
            }, 2500);
        }

    } catch (err) {
        console.error('Submission error:', err);
        showNotification('Error submitting: ' + err.message, 'error');
        if (submitBtn) { submitBtn.textContent = origText; submitBtn.disabled = false; }
    }
}

// ============================================
// NOTIFICATION
// ============================================
function showNotification(message, type = 'success') {
    const n = document.createElement('div');
    n.className = `notification notification-${type}`;
    n.innerHTML = `<div class="notification-content">
        <span class="notification-icon">${type === 'success' ? '✓' : '✗'}</span>
        <span class="notification-message">${message}</span>
    </div>`;
    document.body.appendChild(n);
    setTimeout(() => n.classList.add('show'), 50);
    setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, 5000);
}
