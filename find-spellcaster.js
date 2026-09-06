// ============================================
// Find Spellcaster — request form
// ============================================

const SUPABASE_URL = 'https://uapjfrxjjpotmvpuidsq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcGpmcnhqanBvdG12cHVpZHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjcxMzAsImV4cCI6MjA3NTcwMzEzMH0.NAFy5Iqs6xm39R42yxBHpjxdBmT66cB7l9LcpULUGoI';

let supabaseClient;

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

function toggleOtherWrap(selectEl, wrapEl) {
    if (!selectEl || !wrapEl) return;
    const show = selectEl.value === 'Other';
    wrapEl.classList.toggle('visible', show);
    if (!show) {
        const input = wrapEl.querySelector('input');
        if (input) input.value = '';
    }
}

function wireOtherToggles() {
    const serviceSelect = document.getElementById('findServiceType');
    const serviceWrap = document.getElementById('serviceTypeOtherWrap');
    const pracSelect = document.getElementById('findPractitionerType');
    const pracWrap = document.getElementById('practitionerTypeOtherWrap');

    serviceSelect?.addEventListener('change', () => toggleOtherWrap(serviceSelect, serviceWrap));
    pracSelect?.addEventListener('change', () => toggleOtherWrap(pracSelect, pracWrap));
}

async function handleFindSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('findSubmitBtn');
    const originalText = submitBtn?.textContent || 'Submit Request';
    if (submitBtn) {
        submitBtn.textContent = 'Submitting…';
        submitBtn.disabled = true;
    }

    try {
        const fullName = (document.getElementById('findFullName')?.value || '').trim();
        const serviceType = document.getElementById('findServiceType')?.value || '';
        const serviceTypeOther = (document.getElementById('findServiceTypeOther')?.value || '').trim() || null;
        const requirementDetails = (document.getElementById('findRequirementDetails')?.value || '').trim();
        const budget = document.getElementById('findBudget')?.value || null;
        const practitionerType = document.getElementById('findPractitionerType')?.value || null;
        const practitionerTypeOther = (document.getElementById('findPractitionerTypeOther')?.value || '').trim() || null;
        const timing = document.getElementById('findTiming')?.value || '';
        const contactEmail = (document.getElementById('findContactEmail')?.value || '').trim();
        const contactPhone = (document.getElementById('findContactPhone')?.value || '').trim() || null;
        const preferredContact = document.getElementById('findPreferredContact')?.value || null;

        if (!fullName) throw new Error('Please enter your name');
        if (!serviceType) throw new Error('Please select a type of service');
        if (serviceType === 'Other' && !serviceTypeOther) {
            throw new Error('Please describe the service type');
        }
        if (!requirementDetails) throw new Error('Please share your requirement details');
        if (!timing) throw new Error('Please select timing');
        if (!contactEmail) throw new Error('Please enter your email');
        if (practitionerType === 'Other' && !practitionerTypeOther) {
            throw new Error('Please describe your practitioner preference');
        }

        const { error } = await supabaseClient
            .from('sc_find_requests')
            .insert({
                full_name: fullName,
                service_type: serviceType,
                service_type_other: serviceType === 'Other' ? serviceTypeOther : null,
                requirement_details: requirementDetails,
                budget: budget || null,
                practitioner_type: practitionerType || null,
                practitioner_type_other: practitionerType === 'Other' ? practitionerTypeOther : null,
                timing,
                contact_email: contactEmail,
                contact_phone: contactPhone,
                preferred_contact: preferredContact || null,
                status: 'new',
            });

        if (error) throw error;

        e.target.reset();
        document.getElementById('serviceTypeOtherWrap')?.classList.remove('visible');
        document.getElementById('practitionerTypeOtherWrap')?.classList.remove('visible');

        const success = document.getElementById('findSuccess');
        if (success) {
            success.classList.add('visible');
            success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        showNotification('Your request was submitted successfully.', 'success');
    } catch (err) {
        console.error('Find spellcaster submit error:', err);
        showNotification(err.message || 'Could not submit your request. Please try again.', 'error');
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
        await scAuth.init(supabaseClient);
    }

    wireOtherToggles();
    document.getElementById('findSpellcasterForm')?.addEventListener('submit', handleFindSubmit);
    document.getElementById('findResetBtn')?.addEventListener('click', () => {
        setTimeout(() => {
            document.getElementById('serviceTypeOtherWrap')?.classList.remove('visible');
            document.getElementById('practitionerTypeOtherWrap')?.classList.remove('visible');
            document.getElementById('findSuccess')?.classList.remove('visible');
        }, 0);
    });
});
