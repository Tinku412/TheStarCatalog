// ============================================
// Leads & Analytics dashboard
// ============================================

const SUPABASE_URL = 'https://uapjfrxjjpotmvpuidsq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcGpmcnhqanBvdG12cHVpZHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjcxMzAsImV4cCI6MjA3NTcwMzEzMH0.NAFy5Iqs6xm39R42yxBHpjxdBmT66cB7l9LcpULUGoI';
const DASHBOARD_UID = 'a6316b86-f6dd-4fee-9449-b125eafd97e8';

const EVENT_LABELS = {
    profile_card_click: 'Profile card click',
    contact_click: 'Contact click',
    inquiry_submit: 'Inquiry submit',
    share_click: 'Share click',
};

let sc;
let profilesById = {};
let rawAnalytics = [];
let rawInquiries = [];
let rawFind = [];
let activeTab = 'overview';

function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch (_) {
        return String(iso);
    }
}

function fmtDay(iso) {
    if (!iso) return '';
    return new Date(iso).toISOString().slice(0, 10);
}

function profileHref(p) {
    if (!p) return '#';
    return p.slug
        ? 'profile.html?slug=' + encodeURIComponent(p.slug)
        : 'profile.html?id=' + encodeURIComponent(p.id);
}

function profileName(id) {
    const p = profilesById[id];
    return p ? (p.professional_name || p.personal_name || '—') : (id ? String(id).slice(0, 8) + '…' : '—');
}

function socialLinksHtml(p) {
    if (!p) return '<span class="lad-muted">—</span>';
    const links = [];
    if (p.email) links.push('<a href="mailto:' + esc(p.email) + '">Email</a>');
    if (p.website) links.push('<a href="' + esc(p.website) + '" target="_blank" rel="noopener">Website</a>');
    if (p.store_link) links.push('<a href="' + esc(p.store_link) + '" target="_blank" rel="noopener">Store</a>');
    if (p.instagram_link) links.push('<a href="' + esc(p.instagram_link) + '" target="_blank" rel="noopener">Instagram</a>');
    if (p.reddit_link) links.push('<a href="' + esc(p.reddit_link) + '" target="_blank" rel="noopener">Reddit</a>');
    if (!links.length) return '<span class="lad-muted">—</span>';
    return '<div class="lad-socials">' + links.join('') + '</div>';
}

function getFilters() {
    return {
        from: document.getElementById('ladDateFrom')?.value || '',
        to: document.getElementById('ladDateTo')?.value || '',
        eventType: document.getElementById('ladEventType')?.value || '',
        leadSource: document.getElementById('ladLeadSource')?.value || '',
        profileId: document.getElementById('ladProfileFilter')?.value || '',
        search: (document.getElementById('ladSearch')?.value || '').trim().toLowerCase(),
    };
}

function inDateRange(iso, from, to) {
    if (!iso) return true;
    const d = fmtDay(iso);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
}

function filterAnalytics() {
    const f = getFilters();
    return rawAnalytics.filter(row => {
        if (!inDateRange(row.created_at, f.from, f.to)) return false;
        if (f.eventType && row.event_type !== f.eventType) return false;
        if (f.profileId && row.profile_id !== f.profileId) return false;
        if (f.search) {
            const hay = [
                row.event_type,
                EVENT_LABELS[row.event_type] || '',
                profileName(row.profile_id),
                row.profile_id,
            ].join(' ').toLowerCase();
            if (!hay.includes(f.search)) return false;
        }
        return true;
    });
}

function filterInquiries() {
    const f = getFilters();
    return rawInquiries.filter(row => {
        if (!inDateRange(row.created_at, f.from, f.to)) return false;
        if (f.profileId && row.profile_id !== f.profileId) return false;
        if (f.leadSource === 'find') return false;
        if (f.search) {
            const p = profilesById[row.profile_id];
            const hay = [
                row.full_name, row.email, row.budget, row.description,
                profileName(row.profile_id), p?.email, p?.website,
            ].join(' ').toLowerCase();
            if (!hay.includes(f.search)) return false;
        }
        return true;
    });
}

function filterFind() {
    const f = getFilters();
    return rawFind.filter(row => {
        if (!inDateRange(row.created_at, f.from, f.to)) return false;
        if (f.leadSource === 'inquiry') return false;
        if (f.profileId) return false; // find requests are not tied to a profile
        if (f.search) {
            const hay = [
                row.full_name, row.contact_email, row.contact_phone,
                row.service_type, row.service_type_other, row.requirement_details,
                row.budget, row.practitioner_type, row.timing, row.status,
            ].join(' ').toLowerCase();
            if (!hay.includes(f.search)) return false;
        }
        return true;
    });
}

function buildCombinedLeads() {
    const inquiries = filterInquiries().map(row => ({
        source: 'inquiry',
        created_at: row.created_at,
        customer_name: row.full_name,
        customer_email: row.email,
        customer_phone: '',
        budget: row.budget,
        details: row.description,
        dob: row.date_of_birth,
        profile_id: row.profile_id,
        service_type: '',
        timing: '',
        status: '',
        preferred_contact: 'Email',
        raw: row,
    }));
    const finds = filterFind().map(row => ({
        source: 'find',
        created_at: row.created_at,
        customer_name: row.full_name,
        customer_email: row.contact_email,
        customer_phone: row.contact_phone || '',
        budget: row.budget,
        details: row.requirement_details,
        dob: '',
        profile_id: null,
        service_type: row.service_type_other || row.service_type,
        timing: row.timing,
        status: row.status,
        preferred_contact: row.preferred_contact || '',
        raw: row,
    }));
    return inquiries.concat(finds).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function renderCards() {
    const analytics = filterAnalytics();
    const inquiries = filterInquiries();
    const finds = filterFind();
    const byType = {};
    analytics.forEach(r => {
        byType[r.event_type] = (byType[r.event_type] || 0) + 1;
    });
    const totalViews = Object.values(profilesById).reduce((s, p) => s + (p.views || 0), 0);
    const inquiryN = inquiries.length;
    const findN = finds.length;
    const diff = Math.abs(inquiryN - findN);
    const leadWinner = inquiryN === findN
        ? 'Tied'
        : (inquiryN > findN ? 'Inquiries ahead by ' + diff : 'Find Match ahead by ' + diff);

    document.getElementById('ladCards').innerHTML = `
        <div class="lad-card"><div class="lad-card-label">Total clicks</div><div class="lad-card-val">${analytics.length}</div></div>
        <div class="lad-card"><div class="lad-card-label">Card clicks</div><div class="lad-card-val">${byType.profile_card_click || 0}</div></div>
        <div class="lad-card"><div class="lad-card-label">Contact clicks</div><div class="lad-card-val">${byType.contact_click || 0}</div></div>
        <div class="lad-card"><div class="lad-card-label">Shares</div><div class="lad-card-val">${byType.share_click || 0}</div></div>
        <div class="lad-card"><div class="lad-card-label">Profile views (DB)</div><div class="lad-card-val">${totalViews}</div><div class="lad-card-sub">sc_profiles.views sum</div></div>
        <div class="lad-card accent"><div class="lad-card-label">Inquiry leads</div><div class="lad-card-val">${inquiryN}</div><div class="lad-card-sub">Contact form → sc_inquiries</div></div>
        <div class="lad-card accent"><div class="lad-card-label">Find Match leads</div><div class="lad-card-val">${findN}</div><div class="lad-card-sub">Find form → sc_find_requests</div></div>
        <div class="lad-card diff"><div class="lad-card-label">Lead difference</div><div class="lad-card-val">${diff}</div><div class="lad-card-sub">${esc(leadWinner)}</div></div>
        <div class="lad-card"><div class="lad-card-label">All leads</div><div class="lad-card-val">${inquiryN + findN}</div></div>
    `;
}

function renderOverview() {
    const analytics = filterAnalytics();
    const byType = {};
    const byProfile = {};
    analytics.forEach(r => {
        byType[r.event_type] = (byType[r.event_type] || 0) + 1;
        if (r.profile_id) byProfile[r.profile_id] = (byProfile[r.profile_id] || 0) + 1;
    });
    const topProfiles = Object.entries(byProfile)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

    const typeRows = Object.keys(EVENT_LABELS).map(k =>
        `<tr><td>${esc(EVENT_LABELS[k])}</td><td><code>${esc(k)}</code></td><td>${byType[k] || 0}</td></tr>`
    ).join('');

    const topRows = topProfiles.map(([id, n]) => {
        const p = profilesById[id];
        return `<tr>
            <td>${p ? `<a href="${esc(profileHref(p))}" target="_blank">${esc(profileName(id))}</a>` : esc(id)}</td>
            <td>${n}</td>
            <td>${p?.views ?? '—'}</td>
            <td>${socialLinksHtml(p)}</td>
        </tr>`;
    }).join('');

    const inquiries = filterInquiries().length;
    const finds = filterFind().length;

    document.getElementById('ladPanelOverview').innerHTML = `
        <div class="lad-compare-note">
            <strong>Lead sources compared:</strong>
            <strong>Inquiries</strong> come from the Contact form on a specific spellcaster profile (<code>sc_inquiries</code>).
            <strong>Find Match</strong> comes from the Find a Spellcaster intake form (<code>sc_find_requests</code>) — not tied to one profile.
            Current filter window: <strong>${inquiries}</strong> inquiry lead${inquiries === 1 ? '' : 's'} vs
            <strong>${finds}</strong> find-match lead${finds === 1 ? '' : 's'}
            (difference: <strong>${Math.abs(inquiries - finds)}</strong>).
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
                <div class="lad-count" style="margin-bottom:6px;">CLICKS BY TYPE</div>
                <div class="lad-table-wrap" style="max-height:360px;">
                    <table class="lad-table">
                        <thead><tr><th>Label</th><th>Event type</th><th>Count</th></tr></thead>
                        <tbody>${typeRows || '<tr><td colspan="3" class="lad-empty">No click data</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
            <div>
                <div class="lad-count" style="margin-bottom:6px;">TOP PROFILES BY CLICKS</div>
                <div class="lad-table-wrap" style="max-height:360px;">
                    <table class="lad-table">
                        <thead><tr><th>Spellcaster</th><th>Clicks</th><th>Views</th><th>Contact</th></tr></thead>
                        <tbody>${topRows || '<tr><td colspan="4" class="lad-empty">No click data</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderClicks() {
    const rows = filterAnalytics();
    const body = rows.map(r => {
        const p = profilesById[r.profile_id];
        return `<tr>
            <td>${esc(fmtDate(r.created_at))}</td>
            <td><span class="lad-badge">${esc(EVENT_LABELS[r.event_type] || r.event_type)}</span></td>
            <td><code>${esc(r.event_type)}</code></td>
            <td>${p ? `<a href="${esc(profileHref(p))}" target="_blank">${esc(profileName(r.profile_id))}</a>` : esc(r.profile_id || '—')}</td>
            <td>${socialLinksHtml(p)}</td>
            <td class="lad-muted">${esc(r.id || '')}</td>
        </tr>`;
    }).join('');

    document.getElementById('ladPanelClicks').innerHTML = `
        <div class="lad-count">${rows.length} event${rows.length === 1 ? '' : 's'}</div>
        <div class="lad-table-wrap">
            <table class="lad-table">
                <thead>
                    <tr>
                        <th>When</th><th>Type</th><th>Event key</th>
                        <th>Spellcaster</th><th>Profile contact / social</th><th>Event ID</th>
                    </tr>
                </thead>
                <tbody>${body || '<tr><td colspan="6" class="lad-empty">No analytics events for these filters</td></tr>'}</tbody>
            </table>
        </div>
    `;
}

function renderInquiries() {
    const rows = filterInquiries();
    const body = rows.map(r => {
        const p = profilesById[r.profile_id];
        return `<tr>
            <td>${esc(fmtDate(r.created_at))}</td>
            <td>${p ? `<a href="${esc(profileHref(p))}" target="_blank">${esc(profileName(r.profile_id))}</a>` : esc(r.profile_id || '—')}</td>
            <td>${socialLinksHtml(p)}</td>
            <td>${esc(r.full_name)}</td>
            <td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></td>
            <td>${esc(r.date_of_birth || '—')}</td>
            <td>${esc(r.budget || '—')}</td>
            <td>${esc(r.description || '')}</td>
        </tr>`;
    }).join('');

    document.getElementById('ladPanelInquiries').innerHTML = `
        <div class="lad-compare-note">Source: <strong>Contact / inquiry form</strong> on a profile → <code>sc_inquiries</code>. Each row is a lead for a specific spellcaster.</div>
        <div class="lad-count">${rows.length} inquir${rows.length === 1 ? 'y' : 'ies'}</div>
        <div class="lad-table-wrap">
            <table class="lad-table">
                <thead>
                    <tr>
                        <th>When</th>
                        <th>Spellcaster</th>
                        <th>Caster social / contact</th>
                        <th>Customer name</th>
                        <th>Customer email</th>
                        <th>DOB</th>
                        <th>Budget</th>
                        <th>Requirement</th>
                    </tr>
                </thead>
                <tbody>${body || '<tr><td colspan="8" class="lad-empty">No inquiries for these filters</td></tr>'}</tbody>
            </table>
        </div>
    `;
}

function renderFind() {
    const rows = filterFind();
    const body = rows.map(r => `<tr>
        <td>${esc(fmtDate(r.created_at))}</td>
        <td>${esc(r.full_name)}</td>
        <td><a href="mailto:${esc(r.contact_email)}">${esc(r.contact_email)}</a></td>
        <td>${esc(r.contact_phone || '—')}</td>
        <td>${esc(r.preferred_contact || '—')}</td>
        <td>${esc(r.service_type)}${r.service_type_other ? ' — ' + esc(r.service_type_other) : ''}</td>
        <td>${esc(r.requirement_details || '')}</td>
        <td>${esc(r.budget || '—')}</td>
        <td>${esc(r.practitioner_type || '—')}${r.practitioner_type_other ? ' — ' + esc(r.practitioner_type_other) : ''}</td>
        <td>${esc(r.timing || '—')}</td>
        <td><span class="lad-badge">${esc(r.status || 'new')}</span></td>
    </tr>`).join('');

    document.getElementById('ladPanelFind').innerHTML = `
        <div class="lad-compare-note">Source: <strong>Find a Spellcaster</strong> form → <code>sc_find_requests</code>. These leads are matching requests (not tied to one profile).</div>
        <div class="lad-count">${rows.length} request${rows.length === 1 ? '' : 's'}</div>
        <div class="lad-table-wrap">
            <table class="lad-table">
                <thead>
                    <tr>
                        <th>When</th><th>Name</th><th>Email</th><th>Phone</th><th>Pref. contact</th>
                        <th>Service type</th><th>Requirement details</th><th>Budget</th>
                        <th>Practitioner preference</th><th>Timing</th><th>Status</th>
                    </tr>
                </thead>
                <tbody>${body || '<tr><td colspan="11" class="lad-empty">No find-match requests for these filters</td></tr>'}</tbody>
            </table>
        </div>
    `;
}

function renderAllLeads() {
    const rows = buildCombinedLeads();
    const body = rows.map(r => {
        const p = r.profile_id ? profilesById[r.profile_id] : null;
        return `<tr>
            <td><span class="lad-badge ${r.source === 'inquiry' ? 'inquiry' : 'find'}">${r.source === 'inquiry' ? 'Inquiry' : 'Find Match'}</span></td>
            <td>${esc(fmtDate(r.created_at))}</td>
            <td>${r.profile_id && p ? `<a href="${esc(profileHref(p))}" target="_blank">${esc(profileName(r.profile_id))}</a>` : '<span class="lad-muted">— (match request)</span>'}</td>
            <td>${socialLinksHtml(p)}</td>
            <td>${esc(r.customer_name)}</td>
            <td>${r.customer_email ? `<a href="mailto:${esc(r.customer_email)}">${esc(r.customer_email)}</a>` : '—'}</td>
            <td>${esc(r.customer_phone || '—')}</td>
            <td>${esc(r.dob || '—')}</td>
            <td>${esc(r.budget || '—')}</td>
            <td>${esc(r.service_type || '—')}</td>
            <td>${esc(r.timing || '—')}</td>
            <td>${esc(r.preferred_contact || '—')}</td>
            <td>${esc(r.details || '')}</td>
        </tr>`;
    }).join('');

    const inq = rows.filter(r => r.source === 'inquiry').length;
    const find = rows.filter(r => r.source === 'find').length;

    document.getElementById('ladPanelLeads').innerHTML = `
        <div class="lad-compare-note">
            Combined lead sheet. <strong>Inquiry</strong> = contact form on a profile.
            <strong>Find Match</strong> = Find a Spellcaster form.
            Showing <strong>${inq}</strong> inquiries + <strong>${find}</strong> find-match = <strong>${rows.length}</strong> total
            (difference ${Math.abs(inq - find)}).
        </div>
        <div class="lad-count">${rows.length} lead${rows.length === 1 ? '' : 's'}</div>
        <div class="lad-table-wrap">
            <table class="lad-table">
                <thead>
                    <tr>
                        <th>Source</th><th>When</th><th>Spellcaster</th><th>Caster social</th>
                        <th>Customer</th><th>Email</th><th>Phone</th><th>DOB</th>
                        <th>Budget</th><th>Service</th><th>Timing</th><th>Pref. contact</th><th>Details</th>
                    </tr>
                </thead>
                <tbody>${body || '<tr><td colspan="13" class="lad-empty">No leads for these filters</td></tr>'}</tbody>
            </table>
        </div>
    `;
}

function renderAll() {
    renderCards();
    renderOverview();
    renderClicks();
    renderInquiries();
    renderFind();
    renderAllLeads();
}

function switchTab(name) {
    activeTab = name;
    document.querySelectorAll('.lad-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.lad-panel').forEach(p => p.classList.remove('active'));
    const map = {
        overview: 'ladPanelOverview',
        clicks: 'ladPanelClicks',
        inquiries: 'ladPanelInquiries',
        find: 'ladPanelFind',
        leads: 'ladPanelLeads',
    };
    document.getElementById(map[name])?.classList.add('active');
}

function populateProfileFilter() {
    const sel = document.getElementById('ladProfileFilter');
    if (!sel) return;
    const opts = Object.values(profilesById)
        .sort((a, b) => String(a.professional_name || '').localeCompare(String(b.professional_name || '')))
        .map(p => `<option value="${esc(p.id)}">${esc(p.professional_name || p.id)}</option>`)
        .join('');
    sel.innerHTML = '<option value="">All profiles</option>' + opts;
}

async function loadAll() {
    const [profilesRes, analyticsRes, inquiriesRes, findRes] = await Promise.all([
        sc.from('sc_profiles').select('id, slug, professional_name, personal_name, email, website, store_link, instagram_link, reddit_link, views, status'),
        sc.from('sc_analytics').select('*').order('created_at', { ascending: false }).limit(5000),
        sc.from('sc_inquiries').select('*').order('created_at', { ascending: false }).limit(2000),
        sc.from('sc_find_requests').select('*').order('created_at', { ascending: false }).limit(2000),
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (analyticsRes.error) throw analyticsRes.error;
    if (inquiriesRes.error) throw inquiriesRes.error;
    if (findRes.error) throw findRes.error;

    profilesById = {};
    (profilesRes.data || []).forEach(p => { profilesById[p.id] = p; });
    rawAnalytics = analyticsRes.data || [];
    rawInquiries = inquiriesRes.data || [];
    rawFind = findRes.data || [];

    populateProfileFilter();
    renderAll();
}

function exportCsv() {
    let rows = [];
    let headers = [];

    if (activeTab === 'clicks') {
        headers = ['when', 'event_label', 'event_type', 'spellcaster', 'profile_id'];
        rows = filterAnalytics().map(r => [
            fmtDate(r.created_at), EVENT_LABELS[r.event_type] || r.event_type, r.event_type,
            profileName(r.profile_id), r.profile_id,
        ]);
    } else if (activeTab === 'inquiries') {
        headers = ['when', 'spellcaster', 'customer_name', 'customer_email', 'dob', 'budget', 'description'];
        rows = filterInquiries().map(r => [
            fmtDate(r.created_at), profileName(r.profile_id), r.full_name, r.email,
            r.date_of_birth || '', r.budget || '', r.description || '',
        ]);
    } else if (activeTab === 'find') {
        headers = ['when', 'name', 'email', 'phone', 'service', 'details', 'budget', 'practitioner', 'timing', 'status'];
        rows = filterFind().map(r => [
            fmtDate(r.created_at), r.full_name, r.contact_email, r.contact_phone || '',
            r.service_type_other || r.service_type, r.requirement_details, r.budget || '',
            r.practitioner_type || '', r.timing || '', r.status || '',
        ]);
    } else {
        headers = ['source', 'when', 'spellcaster', 'customer', 'email', 'phone', 'budget', 'service', 'details'];
        rows = buildCombinedLeads().map(r => [
            r.source, fmtDate(r.created_at), r.profile_id ? profileName(r.profile_id) : '',
            r.customer_name, r.customer_email, r.customer_phone, r.budget || '',
            r.service_type || '', r.details || '',
        ]);
    }

    const csv = [headers].concat(rows).map(line =>
        line.map(cell => {
            const s = String(cell == null ? '' : cell).replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
        }).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'witch-weekly-' + activeTab + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function showDashboard(ok) {
    document.getElementById('ladGate').style.display = ok ? 'none' : 'block';
    document.getElementById('ladDashboard').style.display = ok ? 'block' : 'none';
}

async function onAuth(user) {
    const allowed = !!(user && user.id === DASHBOARD_UID);
    showDashboard(allowed);
    if (!allowed) {
        if (user) {
            document.getElementById('ladGate').innerHTML =
                '<div style="font-family:\'Cinzel\',serif;font-size:1.2rem;font-weight:700;margin-bottom:8px;">Access denied</div>' +
                'This account is signed in but is not authorized to view leads analytics.<br>' +
                '<button type="button" id="ladSignInBtn">Switch account</button>';
            document.getElementById('ladSignInBtn')?.addEventListener('click', () => {
                sc.auth.signOut().then(() => scAuth.openSignInModal('Sign in with the authorized account.'));
            });
        }
        return;
    }
    try {
        await loadAll();
    } catch (err) {
        console.error(err);
        document.getElementById('ladPanelOverview').innerHTML =
            '<div class="lad-empty">Failed to load data: ' + esc(err.message || err) +
            '. Ensure you ran supabase-migration-leads-analytics-read.sql.</div>';
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    const { createClient } = supabase;
    sc = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    await scAuth.init(sc, {
        onSignIn: onAuth,
        onSignOut: () => {
            showDashboard(false);
            document.getElementById('ladGate').innerHTML =
                '<div style="font-family:\'Cinzel\',serif;font-size:1.2rem;font-weight:700;margin-bottom:8px;">Sign in required</div>' +
                'Sign in with the authorized account to view leads, inquiries, and click analytics.<br>' +
                '<button type="button" id="ladSignInBtn">Sign In</button>';
            document.getElementById('ladSignInBtn')?.addEventListener('click', () => {
                scAuth.openSignInModal('Sign in to view leads analytics.');
            });
        },
    });

    document.getElementById('ladSignInBtn')?.addEventListener('click', () => {
        scAuth.openSignInModal('Sign in to view leads analytics.');
    });

    document.querySelectorAll('.lad-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    ['ladDateFrom', 'ladDateTo', 'ladEventType', 'ladLeadSource', 'ladProfileFilter'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', renderAll);
    });
    document.getElementById('ladSearch')?.addEventListener('input', () => {
        clearTimeout(window.__ladSearchT);
        window.__ladSearchT = setTimeout(renderAll, 200);
    });
    document.getElementById('ladClearFilters')?.addEventListener('click', () => {
        ['ladDateFrom', 'ladDateTo', 'ladSearch'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('ladEventType').value = '';
        document.getElementById('ladLeadSource').value = '';
        document.getElementById('ladProfileFilter').value = '';
        renderAll();
    });
    document.getElementById('ladExportCsv')?.addEventListener('click', exportCsv);
    document.getElementById('ladRefreshBtn')?.addEventListener('click', () => onAuth(scAuth.currentUser));

    await onAuth(scAuth.currentUser);
});
