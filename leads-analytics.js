// ============================================
// Leads inbox — assign / share leads with casters
// All dates displayed in IST (Asia/Kolkata)
// ============================================

const SUPABASE_URL = 'https://uapjfrxjjpotmvpuidsq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcGpmcnhqanBvdG12cHVpZHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjcxMzAsImV4cCI6MjA3NTcwMzEzMH0.NAFy5Iqs6xm39R42yxBHpjxdBmT66cB7l9LcpULUGoI';
const DASHBOARD_UID = 'a6316b86-f6dd-4fee-9449-b125eafd97e8';
const IST = 'Asia/Kolkata';

let sc;
let profilesById = {};
let casterList = [];
let rawInquiries = [];
let rawFind = [];
let rawAnalytics = [];
let sharesByLead = {}; // `${source}:${id}` → [{id, profile_id, shared_at}]
let dateRange = 'today';
let openPickerKey = '';

function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function istDayKey(dateLike) {
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-CA', { timeZone: IST }); // YYYY-MM-DD
}

function todayIst() {
    return istDayKey(new Date());
}

function addDaysIst(yyyyMmDd, days) {
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
}

function weekStartIst(dayKey) {
    const [y, m, d] = dayKey.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const weekday = dt.getUTCDay(); // calendar weekday of the IST date key
    const back = weekday === 0 ? 6 : weekday - 1; // Monday start
    dt.setUTCDate(dt.getUTCDate() - back);
    return dt.toISOString().slice(0, 10);
}

function fmtIst(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        const date = d.toLocaleDateString('en-IN', {
            timeZone: IST, day: 'numeric', month: 'short', year: 'numeric',
        });
        const time = d.toLocaleTimeString('en-IN', {
            timeZone: IST, hour: '2-digit', minute: '2-digit', hour12: true,
        });
        return date + ', ' + time + ' IST';
    } catch (_) {
        return String(iso);
    }
}

function fmtIstShort(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleString('en-IN', {
            timeZone: IST, day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
    } catch (_) {
        return '';
    }
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

function leadKey(source, id) {
    return source + ':' + id;
}

function sharesFor(lead) {
    return sharesByLead[leadKey(lead.source, lead.id)] || [];
}

function toast(msg) {
    const el = document.getElementById('ladToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(window.__ladToastT);
    window.__ladToastT = setTimeout(() => el.classList.remove('show'), 2600);
}

function getFilters() {
    return {
        range: dateRange,
        from: document.getElementById('ladDateFrom')?.value || '',
        to: document.getElementById('ladDateTo')?.value || '',
        source: document.getElementById('ladLeadSource')?.value || '',
        status: document.getElementById('ladShareStatus')?.value || '',
        casterId: document.getElementById('ladCasterFilter')?.value || '',
        search: (document.getElementById('ladSearch')?.value || '').trim().toLowerCase(),
    };
}

function inSelectedRange(iso) {
    const f = getFilters();
    const day = istDayKey(iso);
    const today = todayIst();
    if (f.range === 'today') return day === today;
    if (f.range === 'yesterday') return day === addDaysIst(today, -1);
    if (f.range === 'week') return day >= weekStartIst(today) && day <= today;
    if (f.range === 'custom') {
        if (f.from && day < f.from) return false;
        if (f.to && day > f.to) return false;
        return true;
    }
    return true; // all
}

function buildLeads() {
    const inquiries = rawInquiries.map(row => ({
        source: 'inquiry',
        id: row.id,
        created_at: row.created_at,
        name: row.full_name,
        email: row.email,
        phone: '',
        budget: row.budget,
        details: row.description,
        dob: row.date_of_birth,
        asked_profile_id: row.profile_id,
        service: '',
        timing: '',
        preferred_contact: 'Email',
    }));
    const finds = rawFind.map(row => ({
        source: 'find',
        id: row.id,
        created_at: row.created_at,
        name: row.full_name,
        email: row.contact_email,
        phone: row.contact_phone || '',
        budget: row.budget,
        details: row.requirement_details,
        dob: '',
        asked_profile_id: null,
        service: row.service_type_other || row.service_type,
        timing: row.timing,
        preferred_contact: row.preferred_contact || '',
        practitioner: [row.practitioner_type, row.practitioner_type_other].filter(Boolean).join(' — '),
    }));
    return inquiries.concat(finds).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function filterLeads() {
    const f = getFilters();
    return buildLeads().filter(lead => {
        if (!inSelectedRange(lead.created_at)) return false;
        if (f.source && lead.source !== f.source) return false;
        const shares = sharesFor(lead);
        const shared = shares.length > 0;
        if (f.status === 'shared' && !shared) return false;
        if (f.status === 'unshared' && shared) return false;
        if (f.casterId) {
            const asked = lead.asked_profile_id === f.casterId;
            const sent = shares.some(s => s.profile_id === f.casterId);
            if (!asked && !sent) return false;
        }
        if (f.search) {
            const hay = [
                lead.name, lead.email, lead.phone, lead.details, lead.budget,
                lead.service, lead.timing, profileName(lead.asked_profile_id),
            ].join(' ').toLowerCase();
            if (!hay.includes(f.search)) return false;
        }
        return true;
    });
}

function allLeadsUnfiltered() {
    return buildLeads();
}

function renderGlance() {
    const today = todayIst();
    const weekStart = weekStartIst(today);
    const all = allLeadsUnfiltered();
    const todayLeads = all.filter(l => istDayKey(l.created_at) === today);
    const weekLeads = all.filter(l => {
        const d = istDayKey(l.created_at);
        return d >= weekStart && d <= today;
    });
    const unsharedToday = todayLeads.filter(l => sharesFor(l).length === 0).length;
    const sharedToday = todayLeads.length - unsharedToday;
    const unsharedAll = all.filter(l => sharesFor(l).length === 0).length;

    document.getElementById('ladGlance').innerHTML = `
        <div class="lad-card today">
            <div class="lad-card-label">Today</div>
            <div class="lad-card-val">${todayLeads.length}</div>
            <div class="lad-card-sub">${sharedToday} shared · ${unsharedToday} waiting</div>
        </div>
        <div class="lad-card${unsharedAll ? ' warn' : ''}">
            <div class="lad-card-label">Not shared</div>
            <div class="lad-card-val">${unsharedAll}</div>
            <div class="lad-card-sub">Need to send to casters</div>
        </div>
        <div class="lad-card">
            <div class="lad-card-label">Shared</div>
            <div class="lad-card-val">${all.length - unsharedAll}</div>
            <div class="lad-card-sub">Sent to at least one caster</div>
        </div>
        <div class="lad-card">
            <div class="lad-card-label">This week</div>
            <div class="lad-card-val">${weekLeads.length}</div>
            <div class="lad-card-sub">Mon–today IST</div>
        </div>
    `;

    const todayClicks = rawAnalytics.filter(r => istDayKey(r.created_at) === today);
    const byType = {};
    todayClicks.forEach(r => { byType[r.event_type] = (byType[r.event_type] || 0) + 1; });
    const inqToday = todayLeads.filter(l => l.source === 'inquiry').length;
    const findToday = todayLeads.filter(l => l.source === 'find').length;

    document.getElementById('ladActivity').innerHTML = `
        <span>Today’s activity</span>
        <strong>${inqToday}</strong> inquiries
        <strong>${findToday}</strong> find-match
        <strong>${byType.profile_card_click || 0}</strong> profile clicks
        <strong>${byType.contact_click || 0}</strong> contact clicks
        <strong>${byType.share_click || 0}</strong> shares
    `;
}

function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => toast('Copied lead details')).catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('Copied lead details'); } catch (_) {}
    ta.remove();
}

function leadCopyPayload(lead) {
    const asked = lead.asked_profile_id ? profileName(lead.asked_profile_id) : '';
    const shares = sharesFor(lead);
    const sent = shares.map(s => profileName(s.profile_id) + ' (' + fmtIstShort(s.shared_at) + ')').join(', ');
    return [
        'Lead: ' + (lead.name || ''),
        'Received: ' + fmtIst(lead.created_at),
        'Source: ' + (lead.source === 'inquiry' ? 'Profile inquiry' : 'Find a Spellcaster'),
        asked ? 'Asked about: ' + asked : '',
        lead.email ? 'Email: ' + lead.email : '',
        lead.phone ? 'Phone: ' + lead.phone : '',
        lead.preferred_contact ? 'Prefers: ' + lead.preferred_contact : '',
        lead.service ? 'Service: ' + lead.service : '',
        lead.budget ? 'Budget: ' + lead.budget : '',
        lead.timing ? 'Timing: ' + lead.timing : '',
        lead.dob ? 'DOB: ' + lead.dob : '',
        lead.details ? 'Details: ' + lead.details : '',
        sent ? 'Shared with: ' + sent : 'Shared with: —',
    ].filter(Boolean).join('\n');
}

function renderPicker(lead) {
    const key = leadKey(lead.source, lead.id);
    const selected = new Set(sharesFor(lead).map(s => s.profile_id));
    const open = openPickerKey === key;
    return `
        <div class="lad-picker${open ? ' open' : ''}" data-picker="${esc(key)}">
            <button type="button" class="lad-btn primary" data-open-picker="${esc(key)}">
                ${selected.size ? 'Edit casters' : 'Assign casters'}
            </button>
            <div class="lad-picker-panel">
                <input type="search" class="lad-picker-search" placeholder="Search casters…" data-picker-search="${esc(key)}">
                <div data-picker-opts="${esc(key)}">
                    ${casterList.map(p => `
                        <label class="lad-picker-opt" data-name="${esc((p.professional_name || '').toLowerCase())}">
                            <input type="checkbox" ${selected.has(p.id) ? 'checked' : ''}
                                data-toggle-share="${esc(lead.source)}" data-lead="${esc(lead.id)}" data-profile="${esc(p.id)}">
                            ${esc(p.professional_name || p.id)}
                        </label>
                    `).join('') || '<div class="lad-picker-empty">No casters loaded</div>'}
                </div>
            </div>
        </div>
    `;
}

function renderLead(lead) {
    const shares = sharesFor(lead);
    const shared = shares.length > 0;
    const asked = lead.asked_profile_id ? profilesById[lead.asked_profile_id] : null;
    const lastShare = shares.slice().sort((a, b) => new Date(b.shared_at) - new Date(a.shared_at))[0];
    const lastAt = lastShare ? fmtIst(lastShare.shared_at) : '';

    const chips = shares.map(s => {
        const p = profilesById[s.profile_id];
        return `<span class="lad-caster-chip">
            ${p ? `<a href="${esc(profileHref(p))}" target="_blank">${esc(profileName(s.profile_id))}</a>` : esc(profileName(s.profile_id))}
            <small>${esc(fmtIstShort(s.shared_at))}</small>
            <button type="button" title="Remove" data-toggle-share="${esc(lead.source)}" data-lead="${esc(lead.id)}" data-profile="${esc(s.profile_id)}" data-remove="1">×</button>
        </span>`;
    }).join('');

    const bits = [];
    if (lead.email) bits.push(`<a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>`);
    if (lead.phone) bits.push(`<a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a>`);
    if (lead.preferred_contact) bits.push('Prefers ' + esc(lead.preferred_contact));
    if (lead.budget) bits.push('Budget ' + esc(lead.budget));
    if (lead.service) bits.push(esc(lead.service));
    if (lead.timing) bits.push(esc(lead.timing));
    if (lead.dob) bits.push('DOB ' + esc(lead.dob));

    return `<article class="lad-lead ${shared ? 'shared' : 'unshared'}" data-lead-key="${esc(leadKey(lead.source, lead.id))}">
        <div class="lad-lead-head">
            <div class="lad-lead-when">${esc(fmtIst(lead.created_at))}<small>Received</small></div>
            <div class="lad-badges">
                <span class="lad-badge ${lead.source === 'inquiry' ? 'inquiry' : 'find'}">${lead.source === 'inquiry' ? 'Inquiry' : 'Find match'}</span>
                <span class="lad-badge ${shared ? 'ok' : 'wait'}">${shared ? 'Shared · ' + shares.length : 'Not shared'}</span>
            </div>
        </div>
        <div class="lad-name">${esc(lead.name || '—')}</div>
        <div class="lad-meta">${bits.join(' · ') || '<span class="lad-muted">No contact details</span>'}</div>
        ${asked ? `<div class="lad-asked">Asked about <a href="${esc(profileHref(asked))}" target="_blank">${esc(profileName(asked.id))}</a>${asked.email ? ' · <a href="mailto:' + esc(asked.email) + '">' + esc(asked.email) + '</a>' : ''}</div>` : ''}
        ${lead.details ? `<div class="lad-need">${esc(lead.details)}</div>` : ''}
        <div class="lad-share">
            <div class="lad-share-row">
                <label class="lad-check">
                    <input type="checkbox" ${shared ? 'checked' : ''} data-shared-toggle="${esc(lead.source)}" data-lead="${esc(lead.id)}">
                    Shared with casters
                </label>
                <span class="lad-share-meta">${shared ? shares.length + ' caster' + (shares.length === 1 ? '' : 's') + (lastAt ? ' · last ' + esc(lastAt) : '') : 'Select who you sent this to'}</span>
            </div>
            <div class="lad-chips-casters">${chips}</div>
            <div class="lad-actions">
                ${renderPicker(lead)}
                <button type="button" class="lad-btn ghost" data-copy-lead="${esc(lead.source)}" data-lead="${esc(lead.id)}">Copy details</button>
            </div>
        </div>
    </article>`;
}

function renderList() {
    const rows = filterLeads();
    const el = document.getElementById('ladList');
    const count = document.getElementById('ladCount');
    const label = dateRange === 'today' ? 'today' : dateRange === 'yesterday' ? 'yesterday' : dateRange === 'week' ? 'this week' : dateRange === 'custom' ? 'this range' : 'all time';
    count.textContent = rows.length + ' lead' + (rows.length === 1 ? '' : 's') + ' · ' + label;
    if (!rows.length) {
        el.innerHTML = `<div class="lad-empty">No leads ${label}. ${dateRange === 'today' ? 'Try This week if you want older ones.' : ''}</div>`;
        return;
    }
    el.innerHTML = rows.map(renderLead).join('');
}

function renderAll() {
    renderGlance();
    renderList();
}

function populateCasterFilter() {
    const sel = document.getElementById('ladCasterFilter');
    if (!sel) return;
    sel.innerHTML = '<option value="">Any caster</option>' + casterList.map(p =>
        `<option value="${esc(p.id)}">${esc(p.professional_name || p.id)}</option>`
    ).join('');
}

function setShareCache(source, leadId, profileId, row, remove) {
    const key = leadKey(source, leadId);
    const list = sharesByLead[key] ? sharesByLead[key].slice() : [];
    if (remove) {
        sharesByLead[key] = list.filter(s => s.profile_id !== profileId);
        if (!sharesByLead[key].length) delete sharesByLead[key];
    } else {
        if (!list.some(s => s.profile_id === profileId)) {
            list.push(row);
            sharesByLead[key] = list;
        }
    }
}

async function addShare(source, leadId, profileId) {
    const { data, error } = await sc.from('sc_lead_shares').insert({
        lead_source: source,
        lead_id: leadId,
        profile_id: profileId,
        created_by: DASHBOARD_UID,
    }).select('id, lead_source, lead_id, profile_id, shared_at').single();
    if (error) {
        if (error.code === '23505' || String(error.message || '').toLowerCase().includes('duplicate')) return;
        throw error;
    }
    setShareCache(source, leadId, profileId, data, false);
}

async function removeShare(source, leadId, profileId) {
    const { error } = await sc.from('sc_lead_shares')
        .delete()
        .eq('lead_source', source)
        .eq('lead_id', leadId)
        .eq('profile_id', profileId);
    if (error) throw error;
    setShareCache(source, leadId, profileId, null, true);
}

async function toggleShare(source, leadId, profileId, shouldHave) {
    const has = sharesFor({ source, id: leadId }).some(s => s.profile_id === profileId);
    try {
        if (shouldHave && !has) await addShare(source, leadId, profileId);
        if (!shouldHave && has) await removeShare(source, leadId, profileId);
        renderAll();
        toast(shouldHave ? 'Shared with ' + profileName(profileId) : 'Removed ' + profileName(profileId));
    } catch (err) {
        console.error(err);
        toast(err.message || 'Could not save. Run supabase-migration-lead-shares.sql');
    }
}

async function clearShares(source, leadId) {
    const shares = sharesFor({ source, id: leadId }).slice();
    try {
        for (const s of shares) await removeShare(source, leadId, s.profile_id);
        renderAll();
        toast('Marked as not shared');
    } catch (err) {
        console.error(err);
        toast(err.message || 'Could not update');
    }
}

function findLead(source, id) {
    return buildLeads().find(l => l.source === source && l.id === id);
}

function wireListEvents() {
    const list = document.getElementById('ladList');
    if (!list || list.dataset.wired) return;
    list.dataset.wired = '1';

    list.addEventListener('click', async (e) => {
        const openBtn = e.target.closest('[data-open-picker]');
        if (openBtn) {
            const key = openBtn.dataset.openPicker;
            openPickerKey = openPickerKey === key ? '' : key;
            renderList();
            return;
        }
        const copyBtn = e.target.closest('[data-copy-lead]');
        if (copyBtn) {
            const lead = findLead(copyBtn.dataset.copyLead, copyBtn.dataset.lead);
            if (lead) copyText(leadCopyPayload(lead));
            return;
        }
        const rem = e.target.closest('[data-remove][data-toggle-share]');
        if (rem) {
            e.preventDefault();
            await toggleShare(rem.dataset.toggleShare, rem.dataset.lead, rem.dataset.profile, false);
        }
    });

    list.addEventListener('change', async (e) => {
        const box = e.target.closest('[data-toggle-share]');
        if (box && box.matches('input[type="checkbox"]')) {
            await toggleShare(box.dataset.toggleShare, box.dataset.lead, box.dataset.profile, box.checked);
            return;
        }
        const master = e.target.closest('[data-shared-toggle]');
        if (master) {
            const source = master.dataset.sharedToggle;
            const leadId = master.dataset.lead;
            if (master.checked) {
                openPickerKey = leadKey(source, leadId);
                renderList();
            } else {
                if (!confirm('Remove all casters this lead was shared with?')) {
                    master.checked = true;
                    return;
                }
                await clearShares(source, leadId);
            }
        }
    });

    list.addEventListener('input', (e) => {
        const search = e.target.closest('[data-picker-search]');
        if (!search) return;
        const q = search.value.trim().toLowerCase();
        const wrap = list.querySelector('[data-picker-opts="' + search.dataset.pickerSearch + '"]');
        if (!wrap) return;
        wrap.querySelectorAll('.lad-picker-opt').forEach(opt => {
            const name = opt.dataset.name || '';
            opt.style.display = !q || name.includes(q) ? '' : 'none';
        });
    });
}

document.addEventListener('click', (e) => {
    if (!openPickerKey) return;
    if (e.target.closest('[data-picker="' + openPickerKey + '"]')) return;
    if (e.target.closest('[data-open-picker]')) return;
    openPickerKey = '';
    renderList();
});

function exportCsv() {
    const rows = filterLeads();
    const headers = ['received_ist', 'source', 'name', 'email', 'phone', 'asked_about', 'shared_count', 'shared_with', 'budget', 'details'];
    const body = rows.map(l => {
        const shares = sharesFor(l);
        return [
            fmtIst(l.created_at),
            l.source,
            l.name,
            l.email,
            l.phone,
            l.asked_profile_id ? profileName(l.asked_profile_id) : '',
            shares.length,
            shares.map(s => profileName(s.profile_id) + ' @ ' + fmtIst(s.shared_at)).join('; '),
            l.budget || '',
            (l.details || '').replace(/\s+/g, ' '),
        ];
    });
    const csv = [headers].concat(body).map(line =>
        line.map(cell => {
            const s = String(cell == null ? '' : cell).replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
        }).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads-' + todayIst() + '.csv';
    a.click();
    URL.revokeObjectURL(url);
}

async function loadAll() {
    const [profilesRes, inquiriesRes, findRes, analyticsRes, sharesRes] = await Promise.all([
        sc.from('sc_profiles').select('id, slug, professional_name, personal_name, email, status, is_active').order('professional_name'),
        sc.from('sc_inquiries').select('*').order('created_at', { ascending: false }).limit(2000),
        sc.from('sc_find_requests').select('*').order('created_at', { ascending: false }).limit(2000),
        sc.from('sc_analytics').select('event_type, created_at').order('created_at', { ascending: false }).limit(4000),
        sc.from('sc_lead_shares').select('id, lead_source, lead_id, profile_id, shared_at').order('shared_at', { ascending: false }).limit(5000),
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (inquiriesRes.error) throw inquiriesRes.error;
    if (findRes.error) throw findRes.error;
    if (analyticsRes.error) throw analyticsRes.error;

    profilesById = {};
    (profilesRes.data || []).forEach(p => { profilesById[p.id] = p; });
    casterList = (profilesRes.data || []).filter(p => p.status === 'approved' || p.status == null)
        .sort((a, b) => String(a.professional_name || '').localeCompare(String(b.professional_name || '')));
    if (!casterList.length) casterList = Object.values(profilesById);

    rawInquiries = inquiriesRes.data || [];
    rawFind = findRes.data || [];
    rawAnalytics = analyticsRes.data || [];

    sharesByLead = {};
    if (sharesRes.error) {
        console.warn('Lead shares table missing or unreadable. Run supabase-migration-lead-shares.sql', sharesRes.error);
        toast('Sharing is not set up yet — run supabase-migration-lead-shares.sql in Supabase');
    } else {
        (sharesRes.data || []).forEach(row => {
            const key = leadKey(row.lead_source, row.lead_id);
            if (!sharesByLead[key]) sharesByLead[key] = [];
            sharesByLead[key].push(row);
        });
    }

    populateCasterFilter();
    renderAll();
}

function showDashboard(ok) {
    document.getElementById('ladGate').style.display = ok ? 'none' : 'block';
    document.getElementById('ladDashboard').style.display = ok ? 'block' : 'none';
}

function gateHtml(title, body, btnLabel) {
    return '<div style="font-family:\'Cinzel\',serif;font-size:1.2rem;font-weight:700;margin-bottom:8px;">' + title + '</div>' +
        body + '<br><button type="button" id="ladSignInBtn">' + btnLabel + '</button>';
}

async function onAuth(user) {
    const allowed = !!(user && user.id === DASHBOARD_UID);
    showDashboard(allowed);
    if (!allowed) {
        if (user) {
            document.getElementById('ladGate').innerHTML = gateHtml(
                'Access denied',
                'This account is signed in but is not authorized to manage leads.',
                'Switch account'
            );
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
        document.getElementById('ladList').innerHTML =
            '<div class="lad-empty">Failed to load: ' + esc(err.message || err) +
            '. Ensure supabase-migration-leads-analytics-read.sql has been run.</div>';
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    const { createClient } = supabase;
    sc = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    await scAuth.init(sc, {
        onSignIn: onAuth,
        onSignOut: () => {
            showDashboard(false);
            document.getElementById('ladGate').innerHTML = gateHtml(
                'Sign in required',
                'Sign in with the authorized account to manage leads.',
                'Sign In'
            );
            document.getElementById('ladSignInBtn')?.addEventListener('click', () => {
                scAuth.openSignInModal('Sign in to manage leads.');
            });
        },
    });

    document.getElementById('ladSignInBtn')?.addEventListener('click', () => {
        scAuth.openSignInModal('Sign in to manage leads.');
    });

    document.getElementById('ladDateChips')?.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-range]');
        if (!chip) return;
        dateRange = chip.dataset.range;
        document.querySelectorAll('#ladDateChips .lad-chip').forEach(c => c.classList.toggle('active', c === chip));
        document.getElementById('ladCustomDates')?.classList.toggle('show', dateRange === 'custom');
        renderAll();
    });

    ['ladDateFrom', 'ladDateTo', 'ladLeadSource', 'ladShareStatus', 'ladCasterFilter'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', renderAll);
    });
    document.getElementById('ladSearch')?.addEventListener('input', () => {
        clearTimeout(window.__ladSearchT);
        window.__ladSearchT = setTimeout(renderAll, 180);
    });
    document.getElementById('ladExportCsv')?.addEventListener('click', exportCsv);
    document.getElementById('ladRefreshBtn')?.addEventListener('click', () => onAuth(scAuth.currentUser));

    wireListEvents();
    await onAuth(scAuth.currentUser);
});
