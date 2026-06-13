# ─────────────────────────────────────────────────────────────────────────────
# build-specialty-pages.ps1  — generates all 12 specialty pages
# ─────────────────────────────────────────────────────────────────────────────
param()
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

$SUPA_URL = 'https://uapjfrxjjpotmvpuidsq.supabase.co'
$SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcGpmcnhqanBvdG12cHVpZHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjcxMzAsImV4cCI6MjA3NTcwMzEzMH0.NAFy5Iqs6xm39R42yxBHpjxdBmT66cB7l9LcpULUGoI'

# ── Shared JavaScript (card builder uses string concat to avoid PS ${ } issues)
$JS_SHARED = @'
    (function () {
        'use strict';

        const SUPABASE_URL      = 'SUPA_URL_PLACEHOLDER';
        const SUPABASE_ANON_KEY = 'SUPA_KEY_PLACEHOLDER';
        const PAGE_SIZE         = 12;
        const KEYWORDS = [KEYWORDS_PLACEHOLDER];

        let sc, allProfiles = [], displayedCount = 0;

        const upvoteIcon = '<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polygon points="6,1 11,11 1,11" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';
        const saveIcon   = '<svg width="10" height="10" viewBox="0 0 12 14" fill="none"><path d="M1 1h10v12l-5-3.5L1 13V1z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';
        const starIcon   = '<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polygon points="6,1 7.5,4.5 11,5 8.5,7.5 9.5,11 6,9 2.5,11 3.5,7.5 1,5 4.5,4.5" fill="currentColor"/></svg>';

        document.addEventListener('DOMContentLoaded', async function () {
            const { createClient } = supabase;
            sc = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            initMobileMenu();
            await loadProfiles();
            document.getElementById('lscSort').addEventListener('change', renderGrid);
            try {
                if (typeof scAuth !== 'undefined') {
                    scAuth.init(sc, { onSignIn: refreshCardStates, onSignOut: refreshCardStates }).catch(function(){});
                }
            } catch (_) {}
        });

        async function loadProfiles() {
            const grid = document.getElementById('lscGrid');
            grid.innerHTML = '<div class="lsc-empty">Loading EMPTY_LABEL_PLACEHOLDER\u2026</div>';
            try {
                const filter = KEYWORDS.map(function(k){ return 'specialties.ilike.%' + k + '%'; }).join(',');
                const { data, error } = await sc
                    .from('sc_profiles')
                    .select('id, professional_name, personal_name, professional_identity, profile_picture_url, average_rating, review_count, upvotes, minimum_price, one_liner, slug, specialties')
                    .eq('status', 'approved')
                    .eq('is_active', true)
                    .or(filter)
                    .order('average_rating', { ascending: false, nullsFirst: false });
                if (error) throw error;
                if (!data || data.length === 0) {
                    grid.innerHTML = '<div class="lsc-empty">No EMPTY_LABEL_PLACEHOLDER found yet \u2014 be the first to <a href="submit-practitioner.html" style="color:var(--accent);">submit one</a>!</div>';
                    document.getElementById('lscCount').textContent = '0 practitioners';
                    return;
                }
                allProfiles = data;
                renderGrid();
            } catch (err) {
                console.error('loadProfiles error:', err);
                document.getElementById('lscGrid').innerHTML = '<div class="lsc-empty">Could not load practitioners \u2014 please try refreshing the page.</div>';
            }
        }

        function renderGrid() {
            const sortVal = document.getElementById('lscSort').value;
            const sorted  = allProfiles.slice().sort(function(a, b) {
                if (sortVal === 'rating')  return (parseFloat(b.average_rating) || 0) - (parseFloat(a.average_rating) || 0);
                if (sortVal === 'reviews') return (b.review_count || 0) - (a.review_count || 0);
                return 0;
            });
            const grid = document.getElementById('lscGrid');
            grid.innerHTML = '';
            displayedCount = 0;
            showMore(sorted);
            const total = allProfiles.length;
            const label = 'COUNT_LABEL_PLACEHOLDER';
            document.getElementById('lscCount').textContent = total + ' ' + label + (total === 1 ? '' : 's') + ' found';
            document.getElementById('lscLoadMore').onclick = function(){ showMore(sorted); };
        }

        function showMore(sorted) {
            const grid  = document.getElementById('lscGrid');
            const wrap  = document.getElementById('lscLoadMoreWrap');
            const slice = sorted.slice(displayedCount, displayedCount + PAGE_SIZE);
            slice.forEach(function(p){ grid.appendChild(buildCard(p)); });
            displayedCount += slice.length;
            wrap.style.display = displayedCount < sorted.length ? 'block' : 'none';
            initCardInteractions();
        }

        function buildCard(p) {
            const card = document.createElement('article');
            card.className = 'lsc-card featured-card profile-card';
            card.dataset.profileId = p.id;
            card.dataset.upvotes   = p.upvotes || 0;
            card.setAttribute('role', 'listitem');

            const rawDesc     = p.one_liner || '';
            const desc        = rawDesc.length > 90 ? rawDesc.substring(0, 90) + '\u2026' : rawDesc;
            const avgRating   = p.average_rating ? parseFloat(p.average_rating).toFixed(1) : null;
            const reviewCount = p.review_count || 0;
            const name        = p.professional_name || p.personal_name || 'Practitioner';
            const type        = p.professional_identity || '';
            const altText     = type ? (name + ' \u2014 ' + type + ', ALT_SUFFIX_PLACEHOLDER') : (name + ' \u2014 ALT_SUFFIX_PLACEHOLDER');
            const rawPrice    = p.minimum_price ? String(p.minimum_price) : '';
            const priceLabel  = rawPrice ? (rawPrice.toUpperCase().startsWith('FROM') ? rawPrice : 'FROM ' + rawPrice) : '';

            let ratingDisplay;
            if (reviewCount > 0 && avgRating)  ratingDisplay = avgRating + ' (' + reviewCount + ' review' + (reviewCount === 1 ? '' : 's') + ')';
            else if (reviewCount > 0)          ratingDisplay = reviewCount + ' review' + (reviewCount === 1 ? '' : 's');
            else                               ratingDisplay = 'Be the first to review';

            const isUpvoted = (typeof scAuth !== 'undefined') && scAuth.userUpvotes.has(p.id);
            const isSaved   = (typeof scAuth !== 'undefined') && scAuth.userSaves.has(p.id);

            const upBtnClass = 'action-btn upvote-btn' + (isUpvoted ? ' active' : '');
            const svBtnClass = 'action-btn bookmark-btn' + (isSaved   ? ' active' : '');

            card.innerHTML =
                '<div class="card-image-wrap">' +
                    '<img class="featured-card-img" src="' + (p.profile_picture_url || 'placeholder.jpg') + '" alt="' + altText + '" loading="lazy" width="300" height="225">' +
                    '<div class="card-profession">' + type + '</div>' +
                '</div>' +
                '<div class="featured-card-body">' +
                    '<div class="featured-card-top-row">' +
                        '<div class="featured-card-name">' + name + '</div>' +
                        '<div class="card-actions">' +
                            '<button class="' + upBtnClass + '" title="Recommend" aria-label="Recommend ' + name + '">' + upvoteIcon + '</button>' +
                            '<button class="' + svBtnClass + '" title="Save"      aria-label="Save '      + name + '">' + saveIcon   + '</button>' +
                        '</div>' +
                    '</div>' +
                    (desc ? '<div class="featured-card-tagline">' + desc + '</div>' : '') +
                    '<div class="featured-card-footer">' +
                        '<div class="featured-card-rating">' +
                            '<span class="featured-card-stars" aria-hidden="true">' + starIcon + '</span>' +
                            '<span class="featured-card-rating-val' + (reviewCount === 0 ? ' rating-val-compact' : '') + '">' + ratingDisplay + '</span>' +
                        '</div>' +
                        '<div class="featured-card-price">' + (priceLabel || '\u2014') + '</div>' +
                    '</div>' +
                '</div>';

            card.addEventListener('click', function (e) {
                if (!e.target.closest('.action-btn')) {
                    try { sc.from('sc_analytics').insert({ profile_id: p.id, event_type: 'profile_card_click' }).then(function(){}); } catch (_) {}
                    const href = p.slug ? ('/spellcasters/' + encodeURIComponent(p.slug)) : ('/profile.html?id=' + encodeURIComponent(p.id));
                    window.location.href = href;
                }
            });
            return card;
        }

        function initCardInteractions() {
            document.querySelectorAll('.lsc-card .upvote-btn').forEach(function(btn) {
                btn.onclick = null;
                btn.addEventListener('click', async function (e) {
                    e.preventDefault(); e.stopPropagation();
                    const card = this.closest('.profile-card');
                    const pid  = card.dataset.profileId;
                    const { data: { user } } = await sc.auth.getUser();
                    if (!user) {
                        typeof scAuth !== 'undefined' ? scAuth.openSignInModal('Sign in to recommend practitioners.') : alert('Sign in to recommend practitioners.');
                        return;
                    }
                    const alreadyUp = (typeof scAuth !== 'undefined') && scAuth.userUpvotes.has(pid);
                    this.classList.toggle('active', !alreadyUp);
                    if (typeof scAuth !== 'undefined') await scAuth.toggleUpvote(pid, parseInt(card.dataset.upvotes || '0'));
                });
            });
            document.querySelectorAll('.lsc-card .bookmark-btn').forEach(function(btn) {
                btn.onclick = null;
                btn.addEventListener('click', async function (e) {
                    e.preventDefault(); e.stopPropagation();
                    const card = this.closest('.profile-card');
                    const pid  = card.dataset.profileId;
                    const { data: { user } } = await sc.auth.getUser();
                    if (!user) {
                        typeof scAuth !== 'undefined' ? scAuth.openSignInModal('Sign in to save practitioners.') : alert('Sign in to save practitioners.');
                        return;
                    }
                    const alreadySaved = (typeof scAuth !== 'undefined') && scAuth.userSaves.has(pid);
                    this.classList.toggle('active', !alreadySaved);
                    if (typeof scAuth !== 'undefined') await scAuth.toggleSave(pid);
                });
            });
        }

        function refreshCardStates() {
            if (typeof scAuth === 'undefined') return;
            document.querySelectorAll('.lsc-card').forEach(function(card) {
                const pid = card.dataset.profileId;
                card.querySelector('.upvote-btn')  && card.querySelector('.upvote-btn').classList.toggle('active', scAuth.userUpvotes.has(pid));
                card.querySelector('.bookmark-btn') && card.querySelector('.bookmark-btn').classList.toggle('active', scAuth.userSaves.has(pid));
            });
        }

        function initMobileMenu() {
            const btn = document.getElementById('mobileMenuBtn');
            const nav = document.getElementById('mobileNav');
            if (!btn || !nav) return;
            btn.addEventListener('click', function () { this.classList.toggle('active'); nav.classList.toggle('active'); });
            document.addEventListener('click', function (e) {
                if (nav.classList.contains('active') && !nav.contains(e.target) && !btn.contains(e.target)) {
                    nav.classList.remove('active'); btn.classList.remove('active');
                }
            });
        }

        document.addEventListener('DOMContentLoaded', function () {
            document.querySelectorAll('.lsc-faq-q').forEach(function(q) {
                q.addEventListener('click', function () {
                    const item   = this.closest('.lsc-faq-item');
                    const isOpen = item.classList.contains('open');
                    document.querySelectorAll('.lsc-faq-item.open').forEach(function(el){ el.classList.remove('open'); });
                    if (!isOpen) item.classList.add('open');
                });
            });
        });

    })();
'@

# ── Page definitions ──────────────────────────────────────────────────────────
$pages = @(

  @{
    file        = 'money-spell-casters.html'
    titleFull   = 'Top Money Spell Casters — Verified Reviews &amp; Ratings | The Star Catalog'
    metaDesc    = 'Find legit money spell casters with real community reviews. Browse verified wealth spells, prosperity rituals, abundance magic, and financial spell casting services. No paid rankings.'
    keywords    = 'money spell casters, top money spell casters, wealth spell casters, prosperity spell casters, best money spell casters, money spell casting services, abundance spells, financial spell casters'
    canonical   = 'https://thestarcatalog.com/money-spell-casters.html'
    ogTitle     = 'Top Money Spell Casters — Verified Reviews &amp; Ratings'
    ogDesc      = 'Real reviews on money spell casters, wealth workers, and prosperity practitioners. Community directory — no paid listings.'
    twTitle     = 'Top Money Spell Casters — Reviews &amp; Directory | The Star Catalog'
    twDesc      = 'Find trusted money spell casters with verified community reviews. Wealth attraction, prosperity rituals &amp; abundance magic.'
    ldName      = 'Top Money Spell Casters — Verified Reviews'
    ldDesc      = 'A community-reviewed directory of money spell casters, wealth workers, prosperity specialists, and financial magic practitioners.'
    ldBreadcrumb= 'Money Spell Casters'
    eyebrow     = 'Community-reviewed practitioners'
    h1          = 'Top Money Spell Casters'
    heroDesc    = 'Browse legit money spell casters, wealth attraction workers, and prosperity practitioners — all reviewed by real people who actually hired them.'
    sortLabel   = 'money spell casters'
    gridLabel   = 'Money spell caster profiles'
    emptyLabel  = 'money spell casters'
    keywords_js = "'money', 'wealth', 'prosperity', 'abundance', 'financial', 'business', 'luck', 'lottery', 'rich', 'fortune'"
    countLabel  = 'money spell caster'
    altSuffix   = 'money spell caster'
    whoTitle    = 'What Is a Money Spell Caster?'
    whoP1       = 'A money spell caster is a spiritual practitioner who uses ritual, candle magic, folk magic, or energy work to influence financial situations. They work across traditions including hoodoo, Wicca, voodoo, and Santeria to attract wealth, remove financial blocks, and draw prosperity.'
    whoP2       = 'Money spell casting services fall into several categories: <strong>wealth attraction spells</strong> (drawing money, clients, or opportunities), <strong>prosperity rituals</strong> (building long-term financial growth), <strong>luck spells</strong> (improving chance and fortune), <strong>business spells</strong> (success for a venture), and <strong>financial block removal</strong> (clearing obstacles to abundance).'
    whoP3       = 'The best money spell casters are honest about what spellwork can and cannot do. Spells support action — they are not a substitute for it. Avoid anyone who promises guaranteed lottery wins or overnight riches.'
    chipsTitle  = 'Browse Money Spell Specialties'
    chips       = @('<a href="money-spell-casters.html" class="lsc-sub-chip">Wealth Attraction</a>','<a href="money-spell-casters.html" class="lsc-sub-chip">Prosperity Rituals</a>','<a href="money-spell-casters.html" class="lsc-sub-chip">Business Success Spells</a>','<a href="money-spell-casters.html" class="lsc-sub-chip">Luck &amp; Fortune</a>','<a href="road-opener-spell-casters.html" class="lsc-sub-chip">Road Opener Spells</a>','<a href="money-spell-casters.html" class="lsc-sub-chip">Financial Block Removal</a>')
    legitTitle  = 'How to Spot a Legit Money Spell Caster'
    legitIntro  = 'Before hiring any practitioner for money or wealth work, look for these signs of legitimacy:'
    legitItems  = @('Multiple detailed reviews from verified clients about actual financial results','Clear pricing — no vague fees that keep escalating','Honest about limitations — spells complement action, not replace it','Explains their tradition and methods openly','Does not promise guaranteed lottery wins or overnight wealth','Does not pressure you by claiming you are "financially cursed"')
    faqTitle    = 'Money Spell Casters — FAQs'
    faqs        = @(
      @{ q='What is a money spell caster?'; a='A money spell caster is a spiritual practitioner who uses ritual, candle magic, or folk magic traditions to influence financial situations. This includes attracting new income, removing blocks to prosperity, improving business success, and drawing overall abundance. Traditions vary from hoodoo and Wicca to voodoo and ceremonial magic.' },
      @{ q='Do money spells actually work?'; a='Results vary widely and depend on many factors including the practitioner, your personal situation, and your own actions. Legitimate practitioners typically describe spells as supporting and amplifying your efforts, not replacing them. Be very cautious of anyone who promises guaranteed financial outcomes.' },
      @{ q='How much does a money spell cost?'; a='Prices range from around $30 for a simple candle ritual to $200-$500+ for complex multi-step prosperity workings. Be wary of practitioners who charge escalating fees, claiming your money block is more serious than they first thought.' },
      @{ q='How long does a money spell take to work?'; a='Most honest practitioners will say results can manifest over days to several months. There is no standard timeline. If a practitioner gives you a very specific date, treat it with skepticism. Major financial changes typically unfold over time.' },
      @{ q='Can a money spell help my business?'; a='Many practitioners specialise in business success work — drawing customers, removing competition blocks, and opening paths for growth. Look for practitioners who have reviews specifically from clients who requested business spells, not just general wealth work.' },
      @{ q='What is the difference between a prosperity spell and a money spell?'; a='Money spells typically focus on drawing a specific sum or solving an immediate financial problem. Prosperity spells are more about cultivating long-term abundance and removing deep-seated financial blocks. Many practitioners offer both, and often a combination is recommended.' }
    )
    relatedTiles = @('<a href="love-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Love Spell Casters</span><span class="lsc-related-tile-sub">Attraction, binding &amp; reconciliation</span></a>','<a href="road-opener-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Road Opener Spell Casters</span><span class="lsc-related-tile-sub">Clear blocks &amp; new opportunities</span></a>','<a href="protection-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Protection Spell Casters</span><span class="lsc-related-tile-sub">Warding, cleansing &amp; shielding</span></a>','<a href="court-case-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Court Case Spell Casters</span><span class="lsc-related-tile-sub">Justice, legal protection &amp; wins</span></a>','<a href="banishment-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Banishment Spell Casters</span><span class="lsc-related-tile-sub">Remove enemies &amp; negative energy</span></a>','<a href="hex-and-curse-removal.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Hex &amp; Curse Removal</span><span class="lsc-related-tile-sub">Evil eye, jinx &amp; cleansing</span></a>','<a href="fertility-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Fertility Spell Casters</span><span class="lsc-related-tile-sub">Pregnancy, conception &amp; family blessings</span></a>','<a href="spellcasters.html" class="lsc-related-tile" style="background:var(--navy);"><span class="lsc-related-tile-label" style="color:var(--cream);">All Spell Casters</span><span class="lsc-related-tile-sub" style="color:rgba(232,224,204,.55);">Browse the full directory</span></a>')
  },

  @{
    file        = 'protection-spell-casters.html'
    titleFull   = 'Top Protection Spell Casters — Verified Reviews &amp; Ratings | The Star Catalog'
    metaDesc    = 'Find legit protection spell casters with real community reviews. Warding spells, psychic protection, spiritual cleansing, evil eye removal, and shielding rituals. No paid rankings.'
    keywords    = 'protection spell casters, top protection spell casters, warding spell casters, psychic protection, spiritual cleansing, shielding spells, evil eye removal, protection magic'
    canonical   = 'https://thestarcatalog.com/protection-spell-casters.html'
    ogTitle     = 'Top Protection Spell Casters — Verified Reviews'
    ogDesc      = 'Real reviews on protection spell casters, warding specialists, and spiritual cleansing practitioners. Community directory — no paid listings.'
    twTitle     = 'Top Protection Spell Casters | The Star Catalog'
    twDesc      = 'Find trusted protection spell casters with verified community reviews. Warding, cleansing, psychic protection &amp; evil eye removal.'
    ldName      = 'Top Protection Spell Casters — Verified Reviews'
    ldDesc      = 'A community-reviewed directory of protection spell casters, warding specialists, cleansing practitioners, and psychic protection workers.'
    ldBreadcrumb= 'Protection Spell Casters'
    eyebrow     = 'Community-reviewed practitioners'
    h1          = 'Top Protection Spell Casters'
    heroDesc    = 'Browse legit protection spell casters, warding specialists, and psychic protection practitioners — all reviewed by real people who actually hired them.'
    sortLabel   = 'protection spell casters'
    gridLabel   = 'Protection spell caster profiles'
    emptyLabel  = 'protection spell casters'
    keywords_js = "'protection', 'warding', 'cleansing', 'shielding', 'psychic protection', 'spiritual protection', 'ward', 'evil eye', 'defensive', 'shield'"
    countLabel  = 'protection spell caster'
    altSuffix   = 'protection spell caster'
    whoTitle    = 'What Is a Protection Spell Caster?'
    whoP1       = 'A protection spell caster is a spiritual practitioner who uses ritual, energy work, and folk magic to create spiritual safeguards around a person, home, or situation. They work across traditions like Wicca, hoodoo, Santeria, and ceremonial magic.'
    whoP2       = 'Protection spell casting services include: <strong>warding spells</strong> (creating energetic barriers), <strong>cleansing rituals</strong> (removing negative energy from a person or space), <strong>psychic shielding</strong> (defending against psychic attack), <strong>evil eye removal</strong> (clearing targeted ill-wishes), and <strong>home protection</strong> (spiritually securing living spaces).'
    whoP3       = 'The best protection spell casters are clear about what they are doing and why. They explain what triggered the need for protection and what the work involves. Be wary of anyone who claims you are under a severe curse and uses fear to push additional services.'
    chipsTitle  = 'Browse Protection Spell Specialties'
    chips       = @('<a href="protection-spell-casters.html" class="lsc-sub-chip">Warding Spells</a>','<a href="protection-spell-casters.html" class="lsc-sub-chip">Psychic Protection</a>','<a href="protection-spell-casters.html" class="lsc-sub-chip">Home Protection</a>','<a href="protection-spell-casters.html" class="lsc-sub-chip">Spiritual Cleansing</a>','<a href="hex-and-curse-removal.html" class="lsc-sub-chip">Hex &amp; Curse Removal</a>','<a href="protection-spell-casters.html" class="lsc-sub-chip">Evil Eye Removal</a>','<a href="banishment-spell-casters.html" class="lsc-sub-chip">Banishment Spells</a>')
    legitTitle  = 'How to Spot a Legit Protection Spell Caster'
    legitIntro  = 'Before hiring anyone for protection or cleansing work, look for these signs of a genuine practitioner:'
    legitItems  = @('Reviews from clients who describe specific protection needs and what happened after','Clear explanation of what protection work involves and what to expect','Does not escalate — claiming you need increasingly expensive layers of protection','Honest about their tradition and why they use specific methods','Does not manufacture fear to sell more services','Communicates clearly throughout the process')
    faqTitle    = 'Protection Spell Casters — FAQs'
    faqs        = @(
      @{ q='What is a protection spell?'; a='A protection spell is a ritual or energy working designed to create a spiritual barrier around a person, home, relationship, or situation. Protection spells range from simple daily shielding practices to complex multi-step workings targeting specific threats like psychic attack, negative neighbours, or spiritual interference.' },
      @{ q='How do I know if I need a protection spell?'; a='Common signs people seek protection work include: sensing persistent bad luck, feeling drained after certain interactions, unexplained illness or bad dreams, relationship or financial problems that started suddenly, or a general sense of being watched or followed spiritually. A legitimate practitioner will discuss your situation before recommending any specific work.' },
      @{ q='What is the difference between protection and cleansing?'; a='Cleansing removes existing negative energy from a person, home, or object. Protection creates ongoing barriers to prevent new negative energy from attaching. Many practitioners recommend cleansing first, then setting protection — cleansing without protection can leave a person or space open to re-attachment.' },
      @{ q='Can a protection spell remove a curse?'; a='Protection and curse removal are related but different. Protection prevents new harm; curse removal addresses existing harm. Many practitioners offer both. For a suspected active curse or hex, look for practitioners who specialise in hex removal or uncrossing work specifically.' },
      @{ q='How much does a protection spell cost?'; a='Simple protection rituals or home cleansings can cost $30-$100. More complex psychic shielding work can range from $150-$400+. Be very cautious of anyone who quotes thousands of dollars because your curse level is very severe — this is an extremely common scam tactic.' },
      @{ q='How long does a protection spell last?'; a='This varies by practitioner, tradition, and type of work done. Some protection work is set once and maintained. Some practitioners recommend periodic renewal. Ask any practitioner directly how they handle this, and be cautious of those who insist on ongoing paid renewals as a condition of the spell working.' }
    )
    relatedTiles = @('<a href="hex-and-curse-removal.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Hex &amp; Curse Removal</span><span class="lsc-related-tile-sub">Evil eye, jinx &amp; uncrossing</span></a>','<a href="banishment-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Banishment Spell Casters</span><span class="lsc-related-tile-sub">Remove enemies &amp; negative energy</span></a>','<a href="cord-cutting-practitioners.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Cord Cutting Practitioners</span><span class="lsc-related-tile-sub">Release toxic bonds &amp; attachments</span></a>','<a href="love-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Love Spell Casters</span><span class="lsc-related-tile-sub">Attraction, binding &amp; reconciliation</span></a>','<a href="money-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Money Spell Casters</span><span class="lsc-related-tile-sub">Wealth, prosperity &amp; abundance</span></a>','<a href="court-case-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Court Case Spell Casters</span><span class="lsc-related-tile-sub">Justice, legal protection &amp; wins</span></a>','<a href="road-opener-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Road Opener Spell Casters</span><span class="lsc-related-tile-sub">Clear blocks &amp; new opportunities</span></a>','<a href="spellcasters.html" class="lsc-related-tile" style="background:var(--navy);"><span class="lsc-related-tile-label" style="color:var(--cream);">All Spell Casters</span><span class="lsc-related-tile-sub" style="color:rgba(232,224,204,.55);">Browse the full directory</span></a>')
  },

  @{
    file        = 'hex-and-curse-removal.html'
    titleFull   = 'Hex &amp; Curse Removal Specialists — Verified Reviews | The Star Catalog'
    metaDesc    = 'Find hex and curse removal specialists with real community reviews. Evil eye removal, uncrossing, jinx breaking, and spiritual cleansing practitioners. No paid rankings.'
    keywords    = 'hex removal, curse removal, hex and curse removal, evil eye removal, uncrossing spells, jinx breaking, curse breaking, spiritual cleansing, hex removal specialists'
    canonical   = 'https://thestarcatalog.com/hex-and-curse-removal.html'
    ogTitle     = 'Hex &amp; Curse Removal Specialists — Verified Reviews'
    ogDesc      = 'Real reviews on hex removal, curse breaking, and uncrossing practitioners. Community directory — no paid listings.'
    twTitle     = 'Hex &amp; Curse Removal Specialists | The Star Catalog'
    twDesc      = 'Find trusted hex and curse removal specialists with real community reviews. Evil eye, jinx breaking, uncrossing &amp; spiritual cleansing.'
    ldName      = 'Hex and Curse Removal Specialists — Verified Reviews'
    ldDesc      = 'A community-reviewed directory of hex removal, curse breaking, evil eye specialists, and uncrossing practitioners.'
    ldBreadcrumb= 'Hex &amp; Curse Removal'
    eyebrow     = 'Community-reviewed practitioners'
    h1          = 'Hex &amp; Curse Removal Specialists'
    heroDesc    = 'Browse legit hex removal specialists, curse breakers, and uncrossing practitioners — all reviewed by real people who actually hired them.'
    sortLabel   = 'hex and curse removal specialists'
    gridLabel   = 'Hex and curse removal practitioner profiles'
    emptyLabel  = 'hex and curse removal specialists'
    keywords_js = "'hex', 'curse', 'removal', 'uncrossing', 'evil eye', 'jinx', 'cleansing', 'crossing', 'curse break', 'hex break', 'negative energy'"
    countLabel  = 'hex and curse removal specialist'
    altSuffix   = 'hex and curse removal specialist'
    whoTitle    = 'What Is Hex &amp; Curse Removal?'
    whoP1       = 'Hex and curse removal is a form of spiritual work aimed at breaking harmful magical influences targeting a person, family, or home. Practitioners use cleansing rituals, uncrossing baths, spiritual baths, and counter-magic drawn from traditions like hoodoo, voodoo, Wicca, and Santeria.'
    whoP2       = 'Hex and curse removal services typically include: <strong>uncrossing rituals</strong> (breaking general crossed conditions), <strong>evil eye removal</strong> (clearing targeted ill-wishes), <strong>jinx breaking</strong> (stopping persistent bad luck), <strong>hex reversal</strong> (returning harmful energy to its source), and <strong>deep cleansing</strong> (full spiritual reset for a person or space).'
    whoP3       = 'The most important thing to know about this area is that it attracts scammers. The "you have been cursed" tactic is one of the most common frauds in spiritual services. A legitimate practitioner will not create panic or demand urgent payment.'
    chipsTitle  = 'Browse Curse Removal Specialties'
    chips       = @('<a href="hex-and-curse-removal.html" class="lsc-sub-chip">Evil Eye Removal</a>','<a href="hex-and-curse-removal.html" class="lsc-sub-chip">Uncrossing Rituals</a>','<a href="hex-and-curse-removal.html" class="lsc-sub-chip">Jinx Breaking</a>','<a href="hex-and-curse-removal.html" class="lsc-sub-chip">Spiritual Cleansing</a>','<a href="protection-spell-casters.html" class="lsc-sub-chip">Protection Spells</a>','<a href="banishment-spell-casters.html" class="lsc-sub-chip">Banishment Work</a>','<a href="cord-cutting-practitioners.html" class="lsc-sub-chip">Cord Cutting</a>')
    legitTitle  = 'How to Spot a Legit Hex Removal Specialist'
    legitIntro  = 'This is one of the highest-fraud areas in spiritual services. Here is how to tell the real from the fake:'
    legitItems  = @('Does NOT open with "you have been cursed" before any consultation','Does not escalate costs by claiming additional layers of curse','Provides a clear explanation of what they found and what they will do','Has verified reviews from real clients describing actual results','Charges reasonable, consistent prices — not emergency premiums','Communicates openly throughout without creating dependency')
    faqTitle    = 'Hex &amp; Curse Removal — FAQs'
    faqs        = @(
      @{ q='How do I know if I have been hexed or cursed?'; a='Common signs include: sudden streak of bad luck across multiple areas of life, relationship and financial problems starting suddenly, persistent illness without clear cause, bad dreams, or an unexplained heavy feeling. However, these symptoms often have mundane explanations too. A legitimate practitioner will do a reading or assessment before claiming you are cursed — and will not use this as an automatic sales tactic.' },
      @{ q='What is the difference between a hex and a curse?'; a='The terms are often used interchangeably. A hex typically refers to targeted magical harm sent by a specific person. A curse can refer to a broader negative condition placed on a person, bloodline, or property. In hoodoo and folk traditions, a crossed condition covers most forms of spiritual interference.' },
      @{ q='Can anyone remove a hex, or does it need a specialist?'; a='Many protection and cleansing practitioners handle hex removal. Some specialise specifically in uncrossing work. Look for practitioners who have reviews from clients who described similar conditions to yours. The tradition matters too — a hoodoo rootworker, a Santeria practitioner, and a Wiccan witch may approach removal very differently.' },
      @{ q='How much does hex removal cost?'; a='Simple uncrossing rituals or cleansing baths can cost $30-$150. More complex removal work can range from $150-$400+. Be very suspicious of anyone who quotes thousands of dollars because your curse is generational or severe — this is the most common scam in this category.' },
      @{ q='How long does curse removal take?'; a='A single cleansing session may provide noticeable relief immediately. More complex long-standing work may take multiple sessions over weeks. Ask any practitioner for a realistic timeline upfront, and be cautious of open-ended arrangements that require ongoing payments.' },
      @{ q='What is evil eye removal?'; a='Evil eye is a belief in many cultures that intense envy or ill-wishing from another person can cause harm. Evil eye removal typically involves specific cleansing rituals, protective charms, or prayers. In Mediterranean, Latin American, and Middle Eastern folk traditions, this is a very common form of spiritual healing.' }
    )
    relatedTiles = @('<a href="protection-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Protection Spell Casters</span><span class="lsc-related-tile-sub">Warding, cleansing &amp; shielding</span></a>','<a href="banishment-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Banishment Spell Casters</span><span class="lsc-related-tile-sub">Remove enemies &amp; negative energy</span></a>','<a href="cord-cutting-practitioners.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Cord Cutting Practitioners</span><span class="lsc-related-tile-sub">Release toxic bonds &amp; attachments</span></a>','<a href="revenge-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Revenge &amp; Justice</span><span class="lsc-related-tile-sub">Karma work &amp; enemy spells</span></a>','<a href="love-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Love Spell Casters</span><span class="lsc-related-tile-sub">Attraction, binding &amp; reconciliation</span></a>','<a href="money-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Money Spell Casters</span><span class="lsc-related-tile-sub">Wealth, prosperity &amp; abundance</span></a>','<a href="road-opener-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Road Opener Spell Casters</span><span class="lsc-related-tile-sub">Clear blocks &amp; new opportunities</span></a>','<a href="spellcasters.html" class="lsc-related-tile" style="background:var(--navy);"><span class="lsc-related-tile-label" style="color:var(--cream);">All Spell Casters</span><span class="lsc-related-tile-sub" style="color:rgba(232,224,204,.55);">Browse the full directory</span></a>')
  },

  @{
    file        = 'cord-cutting-practitioners.html'
    titleFull   = 'Top Cord Cutting Practitioners — Verified Reviews | The Star Catalog'
    metaDesc    = 'Find legit cord cutting practitioners with real community reviews. Release toxic emotional bonds, energetic attachments, and karmic ties. No paid rankings.'
    keywords    = 'cord cutting practitioners, cord cutting spell, energetic cord cutting, spiritual cord cutting, cut cords, release attachment, toxic bond removal, cord cutting ritual'
    canonical   = 'https://thestarcatalog.com/cord-cutting-practitioners.html'
    ogTitle     = 'Top Cord Cutting Practitioners — Verified Reviews'
    ogDesc      = 'Real reviews on cord cutting practitioners and energetic attachment removal specialists. Community directory — no paid listings.'
    twTitle     = 'Top Cord Cutting Practitioners | The Star Catalog'
    twDesc      = 'Find trusted cord cutting practitioners with real community reviews. Release energetic bonds, toxic attachments &amp; karmic ties.'
    ldName      = 'Top Cord Cutting Practitioners — Verified Reviews'
    ldDesc      = 'A community-reviewed directory of cord cutting practitioners and energetic bond release specialists.'
    ldBreadcrumb= 'Cord Cutting Practitioners'
    eyebrow     = 'Community-reviewed practitioners'
    h1          = 'Top Cord Cutting Practitioners'
    heroDesc    = 'Browse legit cord cutting practitioners who help release toxic emotional bonds, energetic attachments, and karmic ties — reviewed by real people who actually hired them.'
    sortLabel   = 'cord cutting practitioners'
    gridLabel   = 'Cord cutting practitioner profiles'
    emptyLabel  = 'cord cutting practitioners'
    keywords_js = "'cord cutting', 'cord', 'energetic', 'attachment', 'release', 'bond', 'karmic', 'toxic bond', 'cut cords', 'release ties'"
    countLabel  = 'cord cutting practitioner'
    altSuffix   = 'cord cutting practitioner'
    whoTitle    = 'What Is Cord Cutting?'
    whoP1       = 'Cord cutting is a spiritual practice that addresses energetic cords — invisible connections between people that can carry emotion, energy, or influence. These cords form through significant relationships: past lovers, abusive family members, people who have wronged you. When the cord becomes toxic or draining, cord cutting severs it.'
    whoP2       = 'Cord cutting services typically include: <strong>romantic cord cutting</strong> (releasing an ex or past relationship), <strong>family cord cutting</strong> (breaking unhealthy family patterns), <strong>toxic bond removal</strong> (cutting connections with abusers or manipulators), and <strong>karmic cord cutting</strong> (addressing soul-level attachments from past lives).'
    whoP3       = 'Cord cutting does not erase memories or feelings — it addresses the energetic drain and unhealthy pull of those connections. Many people report feeling lighter and more focused after cord cutting work. Results and timelines vary by person and situation.'
    chipsTitle  = 'Browse Cord Cutting Specialties'
    chips       = @('<a href="cord-cutting-practitioners.html" class="lsc-sub-chip">Romantic Cord Cutting</a>','<a href="cord-cutting-practitioners.html" class="lsc-sub-chip">Family Cord Cutting</a>','<a href="cord-cutting-practitioners.html" class="lsc-sub-chip">Toxic Bond Removal</a>','<a href="cord-cutting-practitioners.html" class="lsc-sub-chip">Karmic Tie Release</a>','<a href="hex-and-curse-removal.html" class="lsc-sub-chip">Spiritual Cleansing</a>','<a href="protection-spell-casters.html" class="lsc-sub-chip">Psychic Protection</a>','<a href="reconciliation-spell-casters.html" class="lsc-sub-chip">Reconciliation Work</a>')
    legitTitle  = 'How to Spot a Legit Cord Cutting Practitioner'
    legitIntro  = 'Before hiring anyone for cord cutting work, look for these signs of a genuine practitioner:'
    legitItems  = @('Explains the process clearly — what cord cutting involves and what you can expect to feel','Does not promise that cord cutting will make the other person return or change','Reviews from real clients describing their emotional or energetic experience post-cutting','Does not pressure you to buy ongoing sessions as a condition of the cord staying cut','Clear pricing for a defined scope of work','Comfortable discussing the spiritual tradition they draw from')
    faqTitle    = 'Cord Cutting — FAQs'
    faqs        = @(
      @{ q='What are energetic cords?'; a='Energetic cords are believed to be invisible connections that form between people through significant emotional or spiritual interaction. In many spiritual traditions, these cords carry energy, emotion, and influence between people — even after a relationship ends. When a cord becomes unhealthy or one-sided, it can drain your energy or keep you stuck in patterns tied to that person.' },
      @{ q='Will cord cutting help me get over an ex?'; a='Many people use cord cutting specifically to help move on from a past relationship. The goal is not to erase feelings but to release the energetic pull and drain of a toxic connection. Most practitioners will tell you cord cutting supports your healing process — it is not a magical switch that eliminates grief overnight.' },
      @{ q='Can cord cutting be done remotely?'; a='Yes. Most cord cutting practitioners work remotely using your name, photo, or birthdate as a connection point. You do not need to be physically present. The practitioner performs the ritual on their end and typically reports back on what they experienced.' },
      @{ q='Does cord cutting work without the other person knowing?'; a='Yes. Cord cutting is focused on your own energetic field, not on changing the other person. The other person does not need to consent or participate. The practitioner works with your energy and severs the cord on your side.' },
      @{ q='How long does a cord cutting ritual take to work?'; a='Some people feel a shift quite quickly — sometimes within hours or days. For deeper karmic ties or long-term relationships, the process may unfold over several weeks. Emotional processing continues after the ritual. Give yourself time and be patient with the experience.' },
      @{ q='How much does cord cutting cost?'; a='Simple cord cutting rituals typically range from $50-$150. More complex multi-layer or karmic work can cost $150-$350+. Be cautious of practitioners who quote unusually high prices because your cord is deeply embedded or generational without first doing a proper assessment.' }
    )
    relatedTiles = @('<a href="hex-and-curse-removal.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Hex &amp; Curse Removal</span><span class="lsc-related-tile-sub">Evil eye, jinx &amp; cleansing</span></a>','<a href="protection-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Protection Spell Casters</span><span class="lsc-related-tile-sub">Warding, cleansing &amp; shielding</span></a>','<a href="banishment-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Banishment Spell Casters</span><span class="lsc-related-tile-sub">Remove enemies &amp; negative energy</span></a>','<a href="love-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Love Spell Casters</span><span class="lsc-related-tile-sub">Attraction, binding &amp; reconciliation</span></a>','<a href="reconciliation-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Reconciliation Spell Casters</span><span class="lsc-related-tile-sub">Bring back ex &amp; relationship healing</span></a>','<a href="obsession-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Obsession Spell Casters</span><span class="lsc-related-tile-sub">Domination, control &amp; obsession work</span></a>','<a href="road-opener-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Road Opener Spell Casters</span><span class="lsc-related-tile-sub">Clear blocks &amp; new opportunities</span></a>','<a href="spellcasters.html" class="lsc-related-tile" style="background:var(--navy);"><span class="lsc-related-tile-label" style="color:var(--cream);">All Spell Casters</span><span class="lsc-related-tile-sub" style="color:rgba(232,224,204,.55);">Browse the full directory</span></a>')
  },

  @{
    file        = 'banishment-spell-casters.html'
    titleFull   = 'Top Banishment Spell Casters — Verified Reviews | The Star Catalog'
    metaDesc    = 'Find legit banishment spell casters with real community reviews. Remove enemies, toxic people, and negative energy from your life. No paid rankings.'
    keywords    = 'banishment spell casters, banishing spells, enemy removal spells, banishment rituals, remove toxic people spells, banishment magic, enemy banishment'
    canonical   = 'https://thestarcatalog.com/banishment-spell-casters.html'
    ogTitle     = 'Top Banishment Spell Casters — Verified Reviews'
    ogDesc      = 'Real reviews on banishment spell casters and enemy removal practitioners. Community directory — no paid listings.'
    twTitle     = 'Top Banishment Spell Casters | The Star Catalog'
    twDesc      = 'Find trusted banishment spell casters with verified community reviews. Remove enemies, toxic people &amp; negative energy.'
    ldName      = 'Top Banishment Spell Casters — Verified Reviews'
    ldDesc      = 'A community-reviewed directory of banishment spell casters and enemy removal practitioners.'
    ldBreadcrumb= 'Banishment Spell Casters'
    eyebrow     = 'Community-reviewed practitioners'
    h1          = 'Top Banishment Spell Casters'
    heroDesc    = 'Browse legit banishment spell casters who remove enemies, toxic people, and negative influences — all reviewed by real people who actually hired them.'
    sortLabel   = 'banishment spell casters'
    gridLabel   = 'Banishment spell caster profiles'
    emptyLabel  = 'banishment spell casters'
    keywords_js = "'banishment', 'banishing', 'enemy', 'remove', 'expulsion', 'send away', 'get rid', 'toxic person', 'enemy removal'"
    countLabel  = 'banishment spell caster'
    altSuffix   = 'banishment spell caster'
    whoTitle    = 'What Is a Banishment Spell Caster?'
    whoP1       = 'A banishment spell caster is a spiritual practitioner who uses ritual and magic to remove unwanted people, energies, or influences from your life or environment. Banishment work draws from many traditions including hoodoo, Wicca, ceremonial magic, and folk traditions.'
    whoP2       = 'Banishment services typically include: <strong>enemy banishment</strong> (removing a person causing harm or interference), <strong>toxic person removal</strong> (pushing away negative influences), <strong>workplace banishment</strong> (removing a difficult coworker or boss), <strong>negative energy removal</strong> (clearing harmful energy from your environment), and <strong>spiritual entity banishment</strong> (removing unwanted spiritual presences).'
    whoP3       = 'Banishment work does not cause harm to the target — it redirects their energy away from you. Legitimate practitioners draw a clear distinction between banishment (separation) and curse work (harm). If you want someone removed from your life without causing them ill, banishment is the appropriate tool.'
    chipsTitle  = 'Browse Banishment Specialties'
    chips       = @('<a href="banishment-spell-casters.html" class="lsc-sub-chip">Enemy Banishment</a>','<a href="banishment-spell-casters.html" class="lsc-sub-chip">Toxic Person Removal</a>','<a href="banishment-spell-casters.html" class="lsc-sub-chip">Workplace Banishment</a>','<a href="protection-spell-casters.html" class="lsc-sub-chip">Protection Spells</a>','<a href="hex-and-curse-removal.html" class="lsc-sub-chip">Hex &amp; Curse Removal</a>','<a href="cord-cutting-practitioners.html" class="lsc-sub-chip">Cord Cutting</a>','<a href="revenge-spell-casters.html" class="lsc-sub-chip">Revenge &amp; Justice Spells</a>')
    legitTitle  = 'How to Spot a Legit Banishment Spell Caster'
    legitIntro  = 'Before hiring anyone for banishment work, look for these signs of a genuine practitioner:'
    legitItems  = @('Clear distinction between banishment (separation) and cursing or harming','Explains the method and tradition they use for banishment work','Reviews from clients describing real-world improvements after banishment','Does not promise the target will be harmed — only removed from your sphere','Consistent, upfront pricing without escalation','Open communication before, during, and after the work')
    faqTitle    = 'Banishment Spell Casters — FAQs'
    faqs        = @(
      @{ q='What is a banishment spell?'; a='A banishment spell is a ritual designed to remove an unwanted person, energy, or influence from your life or environment. Unlike curse work, banishment does not aim to cause harm — it creates separation and distance. Banishment can target a specific person, a type of energy, or a pattern of behaviour.' },
      @{ q='Is banishment work ethical?'; a='Most spiritual traditions that include banishment draw a distinction between removing something harmful from your life (generally considered acceptable) and actively causing harm to another person (which most traditions discourage). If your goal is safety and separation rather than punishment, banishment is typically considered the appropriate approach.' },
      @{ q='How do I know if I need banishment or cord cutting?'; a='Banishment is for actively removing someone from your sphere. Cord cutting is for releasing the energetic attachment between you and someone — often used after the relationship has already ended. If someone is actively causing problems, banishment is usually recommended first.' },
      @{ q='Can banishment be reversed?'; a='Yes, banishment is not permanent by nature. The goal is to redirect someone away from you for a period of time. If circumstances change — or if the banishment is done incorrectly — the effect can fade. Many practitioners include protective elements alongside banishment to reinforce the separation.' },
      @{ q='How much does a banishment spell cost?'; a='Simple banishment rituals can range from $50-$150. More complex multi-target or difficult situation banishment can cost $150-$350+. As with all spiritual services, be cautious of extremely high prices justified by claims about the severity of the situation.' },
      @{ q='How long does a banishment spell take to work?'; a='Results vary by situation. Simple banishments for minor situations can show effect within days to weeks. More deeply entrenched situations may take longer. You may notice the target becoming less present, losing interest, or finding reasons to avoid you.' }
    )
    relatedTiles = @('<a href="hex-and-curse-removal.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Hex &amp; Curse Removal</span><span class="lsc-related-tile-sub">Evil eye, jinx &amp; cleansing</span></a>','<a href="protection-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Protection Spell Casters</span><span class="lsc-related-tile-sub">Warding, cleansing &amp; shielding</span></a>','<a href="cord-cutting-practitioners.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Cord Cutting Practitioners</span><span class="lsc-related-tile-sub">Release toxic bonds &amp; attachments</span></a>','<a href="revenge-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Revenge &amp; Justice</span><span class="lsc-related-tile-sub">Karma work &amp; enemy spells</span></a>','<a href="love-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Love Spell Casters</span><span class="lsc-related-tile-sub">Attraction, binding &amp; reconciliation</span></a>','<a href="money-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Money Spell Casters</span><span class="lsc-related-tile-sub">Wealth, prosperity &amp; abundance</span></a>','<a href="obsession-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Obsession Spell Casters</span><span class="lsc-related-tile-sub">Domination, control &amp; obsession work</span></a>','<a href="spellcasters.html" class="lsc-related-tile" style="background:var(--navy);"><span class="lsc-related-tile-label" style="color:var(--cream);">All Spell Casters</span><span class="lsc-related-tile-sub" style="color:rgba(232,224,204,.55);">Browse the full directory</span></a>')
  },

  @{
    file        = 'reconciliation-spell-casters.html'
    titleFull   = 'Top Reconciliation Spell Casters — Verified Reviews | The Star Catalog'
    metaDesc    = 'Find legit reconciliation spell casters with real community reviews. Bring back ex, relationship healing, reunion spells, and commitment work. No paid rankings.'
    keywords    = 'reconciliation spell casters, bring back ex spell casters, reunion spells, ex back spells, relationship healing, reconciliation magic, return lover spells'
    canonical   = 'https://thestarcatalog.com/reconciliation-spell-casters.html'
    ogTitle     = 'Top Reconciliation Spell Casters — Verified Reviews'
    ogDesc      = 'Real reviews on reconciliation spell casters, bring-back-ex practitioners, and relationship healing workers. Community directory — no paid listings.'
    twTitle     = 'Top Reconciliation Spell Casters | The Star Catalog'
    twDesc      = 'Find trusted reconciliation spell casters with real community reviews. Bring back ex, relationship healing &amp; reunion spells.'
    ldName      = 'Top Reconciliation Spell Casters — Verified Reviews'
    ldDesc      = 'A community-reviewed directory of reconciliation spell casters, bring-back-ex practitioners, and relationship healing workers.'
    ldBreadcrumb= 'Reconciliation Spell Casters'
    eyebrow     = 'Community-reviewed practitioners'
    h1          = 'Top Reconciliation Spell Casters'
    heroDesc    = 'Browse legit reconciliation spell casters, bring-back-ex workers, and relationship healers — all reviewed by real people who actually hired them.'
    sortLabel   = 'reconciliation spell casters'
    gridLabel   = 'Reconciliation spell caster profiles'
    emptyLabel  = 'reconciliation spell casters'
    keywords_js = "'reconciliation', 'bring back', 'ex', 'reunion', 'return', 'come back', 'get back together', 'relationship healing', 'ex back', 'lost love'"
    countLabel  = 'reconciliation spell caster'
    altSuffix   = 'reconciliation spell caster'
    whoTitle    = 'What Is a Reconciliation Spell Caster?'
    whoP1       = 'A reconciliation spell caster specialises in healing broken relationships and reuniting separated partners. They use candle magic, ritual work, and spiritual influence to soften hearts, remove obstacles between people, and create openings for reconnection. Most draw from hoodoo, voodoo, Santeria, or Wiccan traditions.'
    whoP2       = 'Reconciliation spell casting services include: <strong>bring back ex spells</strong> (working to return a specific person to you), <strong>relationship healing rituals</strong> (repairing trust and emotional damage), <strong>communication spells</strong> (opening lines of communication after a falling out), <strong>commitment work</strong> (encouraging deeper investment), and <strong>block removal</strong> (clearing whatever is keeping two people apart).'
    whoP3       = 'Legitimate reconciliation practitioners are honest that results depend on many factors including the other person''s free will. No one can guarantee that a specific person will return. If a practitioner guarantees your ex will come back by a specific date, that is a significant red flag.'
    chipsTitle  = 'Browse Reconciliation Specialties'
    chips       = @('<a href="reconciliation-spell-casters.html" class="lsc-sub-chip">Bring Back Ex</a>','<a href="reconciliation-spell-casters.html" class="lsc-sub-chip">Lost Love Return</a>','<a href="reconciliation-spell-casters.html" class="lsc-sub-chip">Communication Spells</a>','<a href="reconciliation-spell-casters.html" class="lsc-sub-chip">Relationship Healing</a>','<a href="love-spell-casters.html" class="lsc-sub-chip">Commitment Spells</a>','<a href="love-spell-casters.html" class="lsc-sub-chip">Binding Spells</a>','<a href="obsession-spell-casters.html" class="lsc-sub-chip">Obsession &amp; Control</a>')
    legitTitle  = 'How to Spot a Legit Reconciliation Spell Caster'
    legitIntro  = 'Reconciliation work is one of the most emotionally charged spell casting services. Here is how to find genuine practitioners:'
    legitItems  = @('Does not guarantee specific outcomes — honest about the role of free will','Reviews from real clients who share their specific bring-back-ex experiences','Does not escalate costs by inventing new obstacles to your reunion','Clear about what reconciliation work can and cannot do','Asks about your situation before recommending services','Does not use urgency or deadline pressure to drive purchases')
    faqTitle    = 'Reconciliation Spell Casters — FAQs'
    faqs        = @(
      @{ q='Can a reconciliation spell bring my ex back?'; a='Reconciliation and bring-back-ex work is one of the most requested spiritual services. Whether it works depends on many factors including the nature of the relationship, the other person''s situation, and what caused the separation. Legitimate practitioners will tell you honestly that results are never guaranteed, because another person''s free will is always a factor.' },
      @{ q='How long does a reconciliation spell take to work?'; a='Timelines vary significantly. Some people report their ex making contact within days or weeks. Others describe a process of months. The complexity of the situation — how the relationship ended, whether there is a third party involved, how much time has passed — all affect the timeline. Be suspicious of practitioners who give you a specific date guarantee.' },
      @{ q='Will the other person know I used a spell?'; a='No. Reconciliation work is done on your end, energetically, and the target is unaware. The goal is to create conditions favourable to reconnection — softening resistance, removing obstacles, and opening communication channels. The actual decision to reach out or reconnect remains theirs.' },
      @{ q='What is the difference between a reconciliation spell and a love spell?'; a='Love spells are broader — they can target attracting any partner, deepening an existing relationship, or creating romantic feelings. Reconciliation spells specifically address a prior relationship that has ended or been damaged. Reconciliation work often includes elements of both love magic and obstacle removal.' },
      @{ q='How much does a reconciliation spell cost?'; a='Simple reconciliation rituals can start around $50-$100. More complex multi-step bring-back-ex work with readings, ritual, and follow-up can cost $200-$600+. Be cautious of escalating costs — practitioners who keep finding new reasons your ex has not returned.' },
      @{ q='Should I tell my ex I hired a spell caster?'; a='This is entirely your decision. Most clients do not. The effectiveness of the work is not dependent on disclosure. However, if reconciliation does occur, building the relationship on honesty is generally recommended for its long-term success.' }
    )
    relatedTiles = @('<a href="love-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Love Spell Casters</span><span class="lsc-related-tile-sub">Attraction, binding &amp; love magic</span></a>','<a href="obsession-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Obsession Spell Casters</span><span class="lsc-related-tile-sub">Domination, control &amp; obsession work</span></a>','<a href="cord-cutting-practitioners.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Cord Cutting Practitioners</span><span class="lsc-related-tile-sub">Release toxic bonds &amp; attachments</span></a>','<a href="hex-and-curse-removal.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Hex &amp; Curse Removal</span><span class="lsc-related-tile-sub">Clear blocks &amp; crossed conditions</span></a>','<a href="protection-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Protection Spell Casters</span><span class="lsc-related-tile-sub">Warding, cleansing &amp; shielding</span></a>','<a href="banishment-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Banishment Spell Casters</span><span class="lsc-related-tile-sub">Remove third parties &amp; negative energy</span></a>','<a href="money-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Money Spell Casters</span><span class="lsc-related-tile-sub">Wealth, prosperity &amp; abundance</span></a>','<a href="spellcasters.html" class="lsc-related-tile" style="background:var(--navy);"><span class="lsc-related-tile-label" style="color:var(--cream);">All Spell Casters</span><span class="lsc-related-tile-sub" style="color:rgba(232,224,204,.55);">Browse the full directory</span></a>')
  },

  @{
    file        = 'court-case-spell-casters.html'
    titleFull   = 'Top Court Case Spell Casters — Verified Reviews | The Star Catalog'
    metaDesc    = 'Find legit court case spell casters with real community reviews. Legal protection, justice spells, lawsuit spells, and court case rituals. No paid rankings.'
    keywords    = 'court case spell casters, court case spells, legal spell casters, justice spells, lawsuit spells, court protection spells, legal protection magic, win court case spell'
    canonical   = 'https://thestarcatalog.com/court-case-spell-casters.html'
    ogTitle     = 'Top Court Case Spell Casters — Verified Reviews'
    ogDesc      = 'Real reviews on court case spell casters and legal protection practitioners. Community directory — no paid listings.'
    twTitle     = 'Top Court Case Spell Casters | The Star Catalog'
    twDesc      = 'Find trusted court case spell casters with real community reviews. Legal protection, justice spells &amp; court rituals.'
    ldName      = 'Top Court Case Spell Casters — Verified Reviews'
    ldDesc      = 'A community-reviewed directory of court case spell casters and legal protection magic practitioners.'
    ldBreadcrumb= 'Court Case Spell Casters'
    eyebrow     = 'Community-reviewed practitioners'
    h1          = 'Top Court Case Spell Casters'
    heroDesc    = 'Browse legit court case spell casters and legal protection magic practitioners — all reviewed by real people who actually hired them.'
    sortLabel   = 'court case spell casters'
    gridLabel   = 'Court case spell caster profiles'
    emptyLabel  = 'court case spell casters'
    keywords_js = "'court', 'legal', 'justice', 'lawsuit', 'court case', 'judge', 'law', 'legal protection', 'trial', 'case win'"
    countLabel  = 'court case spell caster'
    altSuffix   = 'court case spell caster'
    whoTitle    = 'What Is a Court Case Spell Caster?'
    whoP1       = 'A court case spell caster is a spiritual practitioner who uses ritual magic to influence legal outcomes — favourably affecting judges, juries, prosecutors, and the overall proceedings of a case. This is a well-established area of hoodoo folk magic, with specific rootwork traditions going back generations.'
    whoP2       = 'Court case spell casting services include: <strong>court case rituals</strong> (general working for a favourable outcome), <strong>judge influence spells</strong> (softening the judge''s disposition), <strong>legal protection work</strong> (protecting you from false accusations), <strong>speedy resolution spells</strong> (encouraging a fast and fair conclusion), and <strong>counter-attack magic</strong> (neutralising work being done against you by the opposing side).'
    whoP3       = 'Court case spells are spiritual support — they work alongside real legal strategy, not instead of it. Always have competent legal representation. No spell caster can guarantee a specific verdict. If one claims they can, treat it as a serious warning sign.'
    chipsTitle  = 'Browse Court Case Specialties'
    chips       = @('<a href="court-case-spell-casters.html" class="lsc-sub-chip">Court Case Rituals</a>','<a href="court-case-spell-casters.html" class="lsc-sub-chip">Legal Protection Magic</a>','<a href="court-case-spell-casters.html" class="lsc-sub-chip">Judge Influence Work</a>','<a href="court-case-spell-casters.html" class="lsc-sub-chip">False Accusation Clearing</a>','<a href="money-spell-casters.html" class="lsc-sub-chip">Financial Recovery</a>','<a href="revenge-spell-casters.html" class="lsc-sub-chip">Justice Spells</a>','<a href="road-opener-spell-casters.html" class="lsc-sub-chip">Road Opener Work</a>')
    legitTitle  = 'How to Spot a Legit Court Case Spell Caster'
    legitIntro  = 'Before hiring anyone for court case spiritual work, look for these signs of a genuine practitioner:'
    legitItems  = @('Reviews from clients describing actual legal situations and outcomes','Clear about the scope — spiritual support, not a replacement for legal advice','Knowledgeable about specific court case traditions (hoodoo has very specific practices)','Does not guarantee a verdict or promise the case will be won','Upfront, consistent pricing without escalation based on case severity','Works on a realistic timeline aligned with your actual court dates')
    faqTitle    = 'Court Case Spell Casters — FAQs'
    faqs        = @(
      @{ q='Can a spell really help with a court case?'; a='Court case magic has a long history in hoodoo and folk magic traditions. Many practitioners and clients report positive experiences using spiritual work alongside legal strategy. Whether it works depends on the practitioner, the case, and many factors. It is best viewed as spiritual support that works alongside, not instead of, proper legal representation.' },
      @{ q='What kind of court cases can spells help with?'; a='Practitioners report working on civil cases, criminal defence, custody disputes, divorce settlements, workplace discrimination cases, and immigration hearings. Court case spells are not limited to one type of proceeding — they focus on influence over the people and conditions involved.' },
      @{ q='How do court case spells work?'; a='In hoodoo tradition, court case work typically involves specific herbs, oils, and roots associated with justice and legal favour — like High John the Conqueror, Court Case herb, and Compelling oil. Work may be done on courtroom documents, photographs of judges, or the practitioner''s altar. Timing is often coordinated with court dates.' },
      @{ q='When should I start court case spiritual work?'; a='Most practitioners recommend starting as early as possible — ideally well before the court date. This gives the work time to build and influence the process. Work done the night before a hearing is generally less effective than work done over weeks. Discuss timing with your practitioner when you contact them.' },
      @{ q='How much does a court case spell cost?'; a='Court case rituals can range from $75 for a focused candle working to $300-$600+ for extended multi-step work covering the full duration of a case. Be wary of practitioners who escalate costs as the case progresses, claiming additional layers of opposition from the other side.' },
      @{ q='Should I tell my lawyer about the spiritual work?'; a='This is entirely your choice. Most lawyers would not take it into account either way. What matters is that you maintain a strong legal strategy regardless of any spiritual work. The two approaches should complement each other.' }
    )
    relatedTiles = @('<a href="money-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Money Spell Casters</span><span class="lsc-related-tile-sub">Wealth, prosperity &amp; financial recovery</span></a>','<a href="protection-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Protection Spell Casters</span><span class="lsc-related-tile-sub">Warding &amp; psychic defence</span></a>','<a href="revenge-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Revenge &amp; Justice</span><span class="lsc-related-tile-sub">Karma work &amp; enemy spells</span></a>','<a href="banishment-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Banishment Spell Casters</span><span class="lsc-related-tile-sub">Remove enemies &amp; negative energy</span></a>','<a href="hex-and-curse-removal.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Hex &amp; Curse Removal</span><span class="lsc-related-tile-sub">Clear crossed conditions</span></a>','<a href="road-opener-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Road Opener Spell Casters</span><span class="lsc-related-tile-sub">Clear blocks &amp; new opportunities</span></a>','<a href="love-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Love Spell Casters</span><span class="lsc-related-tile-sub">Attraction, binding &amp; reconciliation</span></a>','<a href="spellcasters.html" class="lsc-related-tile" style="background:var(--navy);"><span class="lsc-related-tile-label" style="color:var(--cream);">All Spell Casters</span><span class="lsc-related-tile-sub" style="color:rgba(232,224,204,.55);">Browse the full directory</span></a>')
  },

  @{
    file        = 'fertility-spell-casters.html'
    titleFull   = 'Top Fertility Spell Casters — Verified Reviews | The Star Catalog'
    metaDesc    = 'Find legit fertility spell casters with real community reviews. Pregnancy spells, conception blessings, fertility rituals, and family magic. No paid rankings.'
    keywords    = 'fertility spell casters, pregnancy spells, fertility magic, conception spells, fertility rituals, pregnancy blessing, fertility practitioners, womb healing'
    canonical   = 'https://thestarcatalog.com/fertility-spell-casters.html'
    ogTitle     = 'Top Fertility Spell Casters — Verified Reviews'
    ogDesc      = 'Real reviews on fertility spell casters and pregnancy blessing practitioners. Community directory — no paid listings.'
    twTitle     = 'Top Fertility Spell Casters | The Star Catalog'
    twDesc      = 'Find trusted fertility spell casters with real community reviews. Pregnancy spells, conception blessings &amp; fertility rituals.'
    ldName      = 'Top Fertility Spell Casters — Verified Reviews'
    ldDesc      = 'A community-reviewed directory of fertility spell casters and pregnancy blessing practitioners.'
    ldBreadcrumb= 'Fertility Spell Casters'
    eyebrow     = 'Community-reviewed practitioners'
    h1          = 'Top Fertility Spell Casters'
    heroDesc    = 'Browse legit fertility spell casters, pregnancy blessing practitioners, and womb healing workers — all reviewed by real people who actually hired them.'
    sortLabel   = 'fertility spell casters'
    gridLabel   = 'Fertility spell caster profiles'
    emptyLabel  = 'fertility spell casters'
    keywords_js = "'fertility', 'pregnancy', 'conception', 'baby', 'family', 'womb', 'pregnant', 'fertility blessing', 'birth'"
    countLabel  = 'fertility spell caster'
    altSuffix   = 'fertility spell caster'
    whoTitle    = 'What Is a Fertility Spell Caster?'
    whoP1       = 'A fertility spell caster is a spiritual practitioner who uses ritual, prayer, energy healing, and folk magic to support conception, pregnancy, and family blessings. Fertility magic has roots in many traditions — from Wiccan moon rituals and hoodoo to Yoruba-based traditions and indigenous healing practices.'
    whoP2       = 'Fertility spell casting services include: <strong>conception spells</strong> (spiritually supporting the process of becoming pregnant), <strong>pregnancy blessings</strong> (protecting and nurturing an ongoing pregnancy), <strong>womb healing</strong> (addressing spiritual or energetic blocks to fertility), <strong>family blessing rituals</strong> (bringing new life and growth into a family), and <strong>fertility block removal</strong> (clearing spiritual obstacles to conception).'
    whoP3       = 'Fertility spells are spiritual support for a deeply personal journey. They are not a substitute for medical advice, fertility treatment, or professional healthcare. Legitimate practitioners work alongside medical efforts, not as a replacement. Always consult a healthcare provider for fertility concerns.'
    chipsTitle  = 'Browse Fertility Spell Specialties'
    chips       = @('<a href="fertility-spell-casters.html" class="lsc-sub-chip">Conception Spells</a>','<a href="fertility-spell-casters.html" class="lsc-sub-chip">Pregnancy Blessings</a>','<a href="fertility-spell-casters.html" class="lsc-sub-chip">Womb Healing</a>','<a href="fertility-spell-casters.html" class="lsc-sub-chip">Family Blessing Rituals</a>','<a href="fertility-spell-casters.html" class="lsc-sub-chip">Fertility Block Removal</a>','<a href="protection-spell-casters.html" class="lsc-sub-chip">Pregnancy Protection</a>','<a href="love-spell-casters.html" class="lsc-sub-chip">Love &amp; Relationship Work</a>')
    legitTitle  = 'How to Spot a Legit Fertility Spell Caster'
    legitIntro  = 'When seeking spiritual support for fertility, look for these signs of a genuine practitioner:'
    legitItems  = @('Compassionate, respectful approach — this is an emotionally sensitive area','Honest that spiritual work supports, not replaces, medical fertility treatment','Reviews from real clients sharing their fertility journey experiences','Does not exploit desperation with escalating prices or urgency tactics','Clear about what they offer and the tradition they work from','Does not promise pregnancy as a guaranteed outcome')
    faqTitle    = 'Fertility Spell Casters — FAQs'
    faqs        = @(
      @{ q='Can a fertility spell help me get pregnant?'; a='Many people combine spiritual fertility support with medical treatment. Fertility spells are intended to clear energetic blocks, support the body''s natural processes, and align spiritual conditions for conception. They are not a medical intervention and cannot guarantee pregnancy. Use them as a complementary practice alongside your healthcare provider''s guidance.' },
      @{ q='What traditions include fertility magic?'; a='Fertility magic exists across many traditions. Wiccan and pagan traditions use moon cycles, goddess invocations, and specific herbs tied to fertility. Hoodoo includes specific rootwork for pregnancy and family. Yoruba-based traditions like Candomble and Santeria have specific orishas associated with motherhood and fertility.' },
      @{ q='Can fertility spells work for men?'; a='Yes. Fertility concerns affect both partners, and spiritual work can address both sides. Some practitioners offer specific work for male fertility issues. Ask any practitioner directly if they offer fertility work for male partners.' },
      @{ q='Is it safe to do fertility spells during pregnancy?'; a='Many practitioners offer pregnancy protection and blessing work specifically for ongoing pregnancies. However, any ritual or spiritual work during pregnancy should be approached carefully. Always discuss with your practitioner and your healthcare provider before undertaking any spiritual practices during pregnancy.' },
      @{ q='How much does a fertility spell cost?'; a='Simple fertility blessings or rituals can start around $50-$100. More involved womb healing or multi-step fertility work can cost $150-$400+. As with all spell casting services, be cautious of escalating prices justified by claims about the depth of your spiritual blockages.' },
      @{ q='How long does it take for a fertility spell to work?'; a='There is no predictable timeline. Spiritual fertility work is most effective when combined with medical treatment and lifestyle factors that support conception. Some clients report improvement within one or two cycles; others describe a longer journey. Be patient and maintain realistic expectations.' }
    )
    relatedTiles = @('<a href="love-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Love Spell Casters</span><span class="lsc-related-tile-sub">Attraction, binding &amp; relationship work</span></a>','<a href="protection-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Protection Spell Casters</span><span class="lsc-related-tile-sub">Warding &amp; pregnancy protection</span></a>','<a href="reconciliation-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Reconciliation Spell Casters</span><span class="lsc-related-tile-sub">Bring back ex &amp; relationship healing</span></a>','<a href="hex-and-curse-removal.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Hex &amp; Curse Removal</span><span class="lsc-related-tile-sub">Clear spiritual blocks &amp; crossed conditions</span></a>','<a href="money-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Money Spell Casters</span><span class="lsc-related-tile-sub">Wealth, prosperity &amp; abundance</span></a>','<a href="road-opener-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Road Opener Spell Casters</span><span class="lsc-related-tile-sub">Clear blocks &amp; open new paths</span></a>','<a href="cord-cutting-practitioners.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Cord Cutting Practitioners</span><span class="lsc-related-tile-sub">Release toxic bonds &amp; attachments</span></a>','<a href="spellcasters.html" class="lsc-related-tile" style="background:var(--navy);"><span class="lsc-related-tile-label" style="color:var(--cream);">All Spell Casters</span><span class="lsc-related-tile-sub" style="color:rgba(232,224,204,.55);">Browse the full directory</span></a>')
  },

  @{
    file        = 'road-opener-spell-casters.html'
    titleFull   = 'Top Road Opener Spell Casters — Verified Reviews | The Star Catalog'
    metaDesc    = 'Find legit road opener spell casters with real community reviews. Clear life blocks, open new paths, attract opportunity, and advance your career. No paid rankings.'
    keywords    = 'road opener spell casters, road opener spells, open roads spell, path clearing spells, opportunity spells, career spell casters, life block removal, open the way spells'
    canonical   = 'https://thestarcatalog.com/road-opener-spell-casters.html'
    ogTitle     = 'Top Road Opener Spell Casters — Verified Reviews'
    ogDesc      = 'Real reviews on road opener spell casters and path clearing practitioners. Community directory — no paid listings.'
    twTitle     = 'Top Road Opener Spell Casters | The Star Catalog'
    twDesc      = 'Find trusted road opener spell casters with real community reviews. Clear life blocks, open new paths &amp; attract opportunity.'
    ldName      = 'Top Road Opener Spell Casters — Verified Reviews'
    ldDesc      = 'A community-reviewed directory of road opener spell casters, path clearing practitioners, and opportunity magic workers.'
    ldBreadcrumb= 'Road Opener Spell Casters'
    eyebrow     = 'Community-reviewed practitioners'
    h1          = 'Top Road Opener Spell Casters'
    heroDesc    = 'Browse legit road opener spell casters who clear life blocks, attract opportunity, and open new paths forward — reviewed by real people who actually hired them.'
    sortLabel   = 'road opener spell casters'
    gridLabel   = 'Road opener spell caster profiles'
    emptyLabel  = 'road opener spell casters'
    keywords_js = "'road opener', 'road opening', 'open road', 'path', 'opportunity', 'block', 'career', 'success', 'open doors', 'new beginnings', 'abre camino'"
    countLabel  = 'road opener spell caster'
    altSuffix   = 'road opener spell caster'
    whoTitle    = 'What Is a Road Opener Spell Caster?'
    whoP1       = 'A road opener spell caster is a spiritual practitioner who uses ritual and magic to remove blocks and open new paths in a person''s life. Abre Camino (open the road) is one of the most widely used spiritual formulas in Latinx and Caribbean traditions, and road opener work is found across hoodoo, Santeria, Candomble, and folk magic traditions worldwide.'
    whoP2       = 'Road opener services typically include: <strong>life block removal</strong> (clearing whatever is preventing progress), <strong>career and opportunity spells</strong> (attracting new jobs, clients, or ventures), <strong>travel and relocation work</strong> (opening paths for physical moves), <strong>crossroads rituals</strong> (decision-making and new direction work), and <strong>general prosperity opening</strong> (clearing old patterns and inviting flow).'
    whoP3       = 'Road opener work is often recommended as a foundation before more specific spells — clearing the path so that love, money, or career spells have a clear route to manifest. If you feel generally stuck across multiple areas of life, road opener work is typically the first recommendation.'
    chipsTitle  = 'Browse Road Opener Specialties'
    chips       = @('<a href="road-opener-spell-casters.html" class="lsc-sub-chip">Life Block Removal</a>','<a href="road-opener-spell-casters.html" class="lsc-sub-chip">Career &amp; Job Spells</a>','<a href="road-opener-spell-casters.html" class="lsc-sub-chip">Opportunity Attraction</a>','<a href="road-opener-spell-casters.html" class="lsc-sub-chip">Crossroads Rituals</a>','<a href="money-spell-casters.html" class="lsc-sub-chip">Money &amp; Prosperity</a>','<a href="hex-and-curse-removal.html" class="lsc-sub-chip">Spiritual Cleansing</a>','<a href="court-case-spell-casters.html" class="lsc-sub-chip">Court Case Work</a>')
    legitTitle  = 'How to Spot a Legit Road Opener Spell Caster'
    legitIntro  = 'Before hiring anyone for road opener or block removal work, look for these signs of a genuine practitioner:'
    legitItems  = @('Reviews from clients describing specific life areas that opened up after the work','Clear about what road opener work can and cannot do','Knowledgeable about abre camino traditions and specific associated herbs and tools','Does not manufacture ongoing blocks that require repeated expensive sessions','Upfront, consistent pricing for a defined scope of work','Communicates the expected timeline and what signs of progress to watch for')
    faqTitle    = 'Road Opener Spell Casters — FAQs'
    faqs        = @(
      @{ q='What is a road opener spell?'; a='A road opener spell is a ritual designed to clear obstacles and open new paths in your life. It works on the principle that spiritual blocks — accumulated negative energy, crossed conditions, bad luck patterns, or karmic obstacles — can prevent progress in career, relationships, or finances. Road opener work clears these blockages and creates flow.' },
      @{ q='How do I know if I need a road opener spell?'; a='Common signs include: feeling stuck across multiple areas of life, opportunities that seem to arise then disappear, persistent bad luck that does not respond to effort, feeling like you work hard but nothing moves forward, or a sense that doors keep closing just as you reach them. Road opener work is often recommended as a starting point before more specific spells.' },
      @{ q='What is the difference between a road opener and a money spell?'; a='A road opener clears the path for opportunities to reach you. A money spell specifically attracts financial energy. They work well together — a road opener creates the clear channel through which money, career, and opportunity spells can flow. Many practitioners recommend doing road opener work before or alongside other workings.' },
      @{ q='Can road opener spells help with career?'; a='Absolutely. Career progression is one of the most common reasons people seek road opener work. This includes: getting unstuck in a job search, attracting a specific promotion, building a client base, launching a business, or making a decision about a career change. Look for practitioners who have reviews from clients describing career-specific road opener results.' },
      @{ q='How much does a road opener spell cost?'; a='Simple road opener rituals or abre camino baths can start around $40-$100. More complex life-block removal or multi-step road opening work can cost $150-$400+. Be cautious of open-ended arrangements that claim your blocks require indefinite expensive sessions.' },
      @{ q='How long does a road opener spell take to work?'; a='Many people report feeling a shift in energy or new opportunities appearing within days to a few weeks. More deeply established blocks may take longer to clear. Watch for signs: new contacts appearing, doors that were closed reopening, a general sense of movement and momentum returning to your life.' }
    )
    relatedTiles = @('<a href="money-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Money Spell Casters</span><span class="lsc-related-tile-sub">Wealth, prosperity &amp; abundance</span></a>','<a href="hex-and-curse-removal.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Hex &amp; Curse Removal</span><span class="lsc-related-tile-sub">Clear crossed conditions &amp; jinxes</span></a>','<a href="protection-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Protection Spell Casters</span><span class="lsc-related-tile-sub">Warding, cleansing &amp; shielding</span></a>','<a href="court-case-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Court Case Spell Casters</span><span class="lsc-related-tile-sub">Justice, legal protection &amp; wins</span></a>','<a href="love-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Love Spell Casters</span><span class="lsc-related-tile-sub">Attraction, binding &amp; reconciliation</span></a>','<a href="fertility-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Fertility Spell Casters</span><span class="lsc-related-tile-sub">Pregnancy, conception &amp; family blessings</span></a>','<a href="banishment-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Banishment Spell Casters</span><span class="lsc-related-tile-sub">Remove enemies &amp; obstacles</span></a>','<a href="spellcasters.html" class="lsc-related-tile" style="background:var(--navy);"><span class="lsc-related-tile-label" style="color:var(--cream);">All Spell Casters</span><span class="lsc-related-tile-sub" style="color:rgba(232,224,204,.55);">Browse the full directory</span></a>')
  },

  @{
    file        = 'obsession-spell-casters.html'
    titleFull   = 'Top Obsession Spell Casters — Verified Reviews | The Star Catalog'
    metaDesc    = 'Find obsession spell casters with real community reviews. Domination spells, compelling work, and obsession magic practitioners. No paid rankings, no fake reviews.'
    keywords    = 'obsession spell casters, obsession spells, domination spells, compelling spells, obsession magic, control spells, make someone obsessed, come to me spells'
    canonical   = 'https://thestarcatalog.com/obsession-spell-casters.html'
    ogTitle     = 'Top Obsession Spell Casters — Verified Reviews'
    ogDesc      = 'Real reviews on obsession spell casters, domination workers, and compelling magic practitioners. Community directory — no paid listings.'
    twTitle     = 'Top Obsession Spell Casters | The Star Catalog'
    twDesc      = 'Find obsession spell casters with real community reviews. Domination, compelling spells &amp; obsession magic.'
    ldName      = 'Top Obsession Spell Casters — Verified Reviews'
    ldDesc      = 'A community-reviewed directory of obsession spell casters, domination workers, and compelling magic practitioners.'
    ldBreadcrumb= 'Obsession Spell Casters'
    eyebrow     = 'Community-reviewed practitioners'
    h1          = 'Top Obsession Spell Casters'
    heroDesc    = 'Browse obsession spell casters, domination workers, and compelling magic practitioners — reviewed by real people who actually hired them.'
    sortLabel   = 'obsession spell casters'
    gridLabel   = 'Obsession spell caster profiles'
    emptyLabel  = 'obsession spell casters'
    keywords_js = "'obsession', 'domination', 'control', 'compelling', 'compel', 'dominate', 'possess', 'fixation', 'come to me', 'bend over'"
    countLabel  = 'obsession spell caster'
    altSuffix   = 'obsession spell caster'
    whoTitle    = 'What Is an Obsession Spell Caster?'
    whoP1       = 'An obsession spell caster specialises in workings designed to create or intensify a strong fixation in a specific target person. These spells draw from hoodoo domination work, compelling magic, and folk traditions that use specific herbs and oils like Controlling Oil, Domination powder, and Come to Me formula.'
    whoP2       = 'Obsession spell services typically include: <strong>come to me spells</strong> (drawing a specific person toward you), <strong>domination work</strong> (influencing a specific person''s thinking and behaviour), <strong>compelling spells</strong> (motivating a specific person to act in a desired way), <strong>fixation workings</strong> (keeping a person''s thoughts focused on you), and <strong>controlling rituals</strong> (maintaining influence over a specific situation or person).'
    whoP3       = 'Obsession and domination magic sit in a morally complex area of spiritual practice. Different practitioners and traditions have different views on ethics. Read reviews carefully to understand what other clients experienced — both results and the practitioner''s approach and communication style.'
    chipsTitle  = 'Browse Obsession Spell Specialties'
    chips       = @('<a href="obsession-spell-casters.html" class="lsc-sub-chip">Come To Me Spells</a>','<a href="obsession-spell-casters.html" class="lsc-sub-chip">Domination Work</a>','<a href="obsession-spell-casters.html" class="lsc-sub-chip">Compelling Spells</a>','<a href="love-spell-casters.html" class="lsc-sub-chip">Love Binding Spells</a>','<a href="reconciliation-spell-casters.html" class="lsc-sub-chip">Bring Back Ex</a>','<a href="love-spell-casters.html" class="lsc-sub-chip">Lust &amp; Desire</a>','<a href="banishment-spell-casters.html" class="lsc-sub-chip">Banishment Work</a>')
    legitTitle  = 'How to Spot a Legit Obsession Spell Caster'
    legitIntro  = 'Before hiring anyone for obsession or domination work, look for these signs of a trustworthy practitioner:'
    legitItems  = @('Reviews from actual clients describing real experiences and outcomes','Honest about what domination and obsession magic can realistically achieve','Clear, upfront pricing without escalation','Does not promise guaranteed control over another person','Communicates their approach and tradition openly','Does not disappear after payment — follows through on the work')
    faqTitle    = 'Obsession Spell Casters — FAQs'
    faqs        = @(
      @{ q='What is an obsession spell?'; a='An obsession spell is a magical working intended to create or intensify a strong fixation in a specific person''s mind — usually making them think about you constantly, desire your company, or prioritise you above others. These spells draw from compelling and domination traditions in hoodoo, folk magic, and other practices.' },
      @{ q='Is obsession magic ethical?'; a='This is debated across spiritual communities. Some practitioners refuse domination or obsession work on ethical grounds. Others perform this work as a valid service. If you are uncomfortable with the ethics of influencing another person''s thoughts without their knowledge, consider exploring consent-based love work instead.' },
      @{ q='What is the difference between an obsession spell and a love spell?'; a='Love spells aim to create genuine affection, attraction, or a loving relationship. Obsession spells focus specifically on creating an intense fixation — making someone think about you constantly or feel compelled to seek you out. They are often more aggressive than standard love spells and draw from domination or compelling traditions.' },
      @{ q='Can an obsession spell backfire?'; a='Many practitioners warn that compelling and domination work can have unpredictable results. Creating a forced obsession in someone can sometimes result in behaviour you did not intend or want. Legitimate practitioners will discuss these risks with you before undertaking the work.' },
      @{ q='How much does an obsession spell cost?'; a='Obsession and domination spell services typically range from $75-$300+ depending on the complexity of the situation. Multi-target work or situations with significant obstacles generally cost more. Be cautious of very cheap obsession spell services — quality practitioners in this area tend to charge accordingly.' },
      @{ q='How long does an obsession spell take to work?'; a='Results vary by situation. Some clients report the target making contact within days. More complex situations may take weeks. The nature of the relationship, how much resistance the target has, and the quality of the working all affect the timeline.' }
    )
    relatedTiles = @('<a href="love-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Love Spell Casters</span><span class="lsc-related-tile-sub">Attraction, binding &amp; love magic</span></a>','<a href="reconciliation-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Reconciliation Spell Casters</span><span class="lsc-related-tile-sub">Bring back ex &amp; relationship healing</span></a>','<a href="banishment-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Banishment Spell Casters</span><span class="lsc-related-tile-sub">Remove enemies &amp; toxic people</span></a>','<a href="hex-and-curse-removal.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Hex &amp; Curse Removal</span><span class="lsc-related-tile-sub">Clear crossed conditions</span></a>','<a href="protection-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Protection Spell Casters</span><span class="lsc-related-tile-sub">Warding &amp; psychic protection</span></a>','<a href="cord-cutting-practitioners.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Cord Cutting Practitioners</span><span class="lsc-related-tile-sub">Release toxic bonds &amp; attachments</span></a>','<a href="money-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Money Spell Casters</span><span class="lsc-related-tile-sub">Wealth, prosperity &amp; abundance</span></a>','<a href="spellcasters.html" class="lsc-related-tile" style="background:var(--navy);"><span class="lsc-related-tile-label" style="color:var(--cream);">All Spell Casters</span><span class="lsc-related-tile-sub" style="color:rgba(232,224,204,.55);">Browse the full directory</span></a>')
  },

  @{
    file        = 'revenge-spell-casters.html'
    titleFull   = 'Top Revenge &amp; Justice Spell Casters — Verified Reviews | The Star Catalog'
    metaDesc    = 'Find revenge and justice spell casters with real community reviews. Karma spells, enemy work, justice rituals, and crossing spells. No paid rankings, no fake reviews.'
    keywords    = 'revenge spell casters, justice spell casters, karma spells, enemy work, revenge spells, crossing spells, justice magic, enemy spells, revenge magic practitioners'
    canonical   = 'https://thestarcatalog.com/revenge-spell-casters.html'
    ogTitle     = 'Top Revenge &amp; Justice Spell Casters — Verified Reviews'
    ogDesc      = 'Real reviews on revenge and justice spell casters. Community directory — no paid listings.'
    twTitle     = 'Top Revenge &amp; Justice Spell Casters | The Star Catalog'
    twDesc      = 'Find revenge and justice spell casters with real community reviews. Karma spells, enemy work &amp; justice rituals.'
    ldName      = 'Top Revenge and Justice Spell Casters — Verified Reviews'
    ldDesc      = 'A community-reviewed directory of revenge and justice spell casters, karma workers, and enemy magic practitioners.'
    ldBreadcrumb= 'Revenge &amp; Justice Spell Casters'
    eyebrow     = 'Community-reviewed practitioners'
    h1          = 'Top Revenge &amp; Justice Spell Casters'
    heroDesc    = 'Browse revenge and justice spell casters, karma workers, and enemy magic practitioners — all reviewed by real people who actually hired them.'
    sortLabel   = 'revenge and justice spell casters'
    gridLabel   = 'Revenge and justice spell caster profiles'
    emptyLabel  = 'revenge and justice spell casters'
    keywords_js = "'revenge', 'justice', 'karma', 'enemy', 'crossing', 'retribution', 'payback', 'enemy work', 'justified', 'enemy crossing'"
    countLabel  = 'revenge and justice spell caster'
    altSuffix   = 'revenge and justice spell caster'
    whoTitle    = 'What Is a Revenge &amp; Justice Spell Caster?'
    whoP1       = 'A revenge and justice spell caster is a spiritual practitioner who uses magic to redress wrongs, return harm to its source, and deliver spiritual justice. This work ranges from mild karma spells (inviting natural consequences) to more aggressive enemy work and crossing spells that actively send harm back to a wrongdoer.'
    whoP2       = 'Revenge and justice magic services include: <strong>karma spells</strong> (amplifying natural consequences for someone who wronged you), <strong>justice work</strong> (seeking fair outcomes in disputes), <strong>crossing spells</strong> (placing obstacles in an enemy''s path), <strong>mirror spells</strong> (returning harm to its sender), and <strong>enemy work</strong> (actively targeting someone who has wronged you).'
    whoP3       = 'Different practitioners approach this work with different ethics. Some perform justice work only when the client has genuinely been wronged. Others work without judgment. Read reviews carefully and understand what a practitioner''s approach is before hiring them for revenge or enemy work.'
    chipsTitle  = 'Browse Revenge &amp; Justice Specialties'
    chips       = @('<a href="revenge-spell-casters.html" class="lsc-sub-chip">Karma Spells</a>','<a href="revenge-spell-casters.html" class="lsc-sub-chip">Justice Work</a>','<a href="revenge-spell-casters.html" class="lsc-sub-chip">Enemy Crossing</a>','<a href="revenge-spell-casters.html" class="lsc-sub-chip">Mirror Spells</a>','<a href="banishment-spell-casters.html" class="lsc-sub-chip">Banishment Spells</a>','<a href="court-case-spell-casters.html" class="lsc-sub-chip">Court Case Work</a>','<a href="hex-and-curse-removal.html" class="lsc-sub-chip">Hex &amp; Curse Work</a>')
    legitTitle  = 'How to Spot a Legit Revenge &amp; Justice Spell Caster'
    legitIntro  = 'Before hiring anyone for revenge or enemy work, look for these signs of a genuine practitioner:'
    legitItems  = @('Clear about the scope of work — what methods they use and what to expect','Reviews from clients describing real situations and outcomes','Does not guarantee specific harm to a target','Upfront, consistent pricing without escalation','Willing to discuss their ethical approach to this type of work','Does not require excessive personal information about the target')
    faqTitle    = 'Revenge &amp; Justice Spell Casters — FAQs'
    faqs        = @(
      @{ q='What is the difference between justice magic and a revenge spell?'; a='Justice magic focuses on restoring balance — ensuring someone who did wrong faces appropriate natural or spiritual consequences. Revenge spells are more aggressive, actively targeting someone with specific harm or obstacles. Many practitioners offer both but approach them differently. If your goal is fairness rather than harm, justice or karma spells are often recommended first.' },
      @{ q='Is revenge magic dangerous?'; a='Many spiritual traditions warn that aggressive enemy work can have blowback — especially if the target is spiritually protected or if the harm sent is disproportionate. Most experienced practitioners include protective measures for the client before performing enemy work. Discuss this with any practitioner you hire.' },
      @{ q='Can a justice spell help after I was scammed?'; a='Many clients seek justice spells after being financially defrauded or emotionally manipulated. Practitioners report working on situations involving financial scams, infidelity, abuse, and other wrongs. Look for practitioners who have reviews from clients describing similar situations to yours.' },
      @{ q='Will a revenge spell hurt me too?'; a='Properly performed revenge or karma work should not harm the person requesting it. The work is directed outward. However, poorly done work or work without protection can result in unintended consequences. This is why many practitioners insist on including a cleansing and protection component alongside any enemy work.' },
      @{ q='How much does a revenge or justice spell cost?'; a='Simple karma or justice candle work can start around $50-$100. More complex multi-step enemy work can cost $200-$500+. Be cautious of practitioners who use your anger to sell increasingly expensive escalations without clear results from prior work.' },
      @{ q='How long does a revenge spell take to show results?'; a='Karma and justice spells often take time because they work with natural energy flows rather than forcing immediate outcomes. Most practitioners describe results manifesting over weeks to months. The timeline also depends on the target''s own protections and spiritual situation.' }
    )
    relatedTiles = @('<a href="banishment-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Banishment Spell Casters</span><span class="lsc-related-tile-sub">Remove enemies &amp; toxic people</span></a>','<a href="court-case-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Court Case Spell Casters</span><span class="lsc-related-tile-sub">Legal protection &amp; justice work</span></a>','<a href="hex-and-curse-removal.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Hex &amp; Curse Removal</span><span class="lsc-related-tile-sub">Clear crossed conditions</span></a>','<a href="protection-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Protection Spell Casters</span><span class="lsc-related-tile-sub">Warding &amp; psychic defence</span></a>','<a href="love-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Love Spell Casters</span><span class="lsc-related-tile-sub">Attraction, binding &amp; reconciliation</span></a>','<a href="money-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Money Spell Casters</span><span class="lsc-related-tile-sub">Wealth, prosperity &amp; abundance</span></a>','<a href="obsession-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Obsession Spell Casters</span><span class="lsc-related-tile-sub">Domination, control &amp; compelling work</span></a>','<a href="spellcasters.html" class="lsc-related-tile" style="background:var(--navy);"><span class="lsc-related-tile-label" style="color:var(--cream);">All Spell Casters</span><span class="lsc-related-tile-sub" style="color:rgba(232,224,204,.55);">Browse the full directory</span></a>')
  },

  @{
    file        = 'beauty-spell-casters.html'
    titleFull   = 'Top Beauty &amp; Glamour Spell Casters — Verified Reviews | The Star Catalog'
    metaDesc    = 'Find beauty and glamour spell casters with real community reviews. Glamour magic, confidence spells, attraction enhancement, and beauty rituals. No paid rankings.'
    keywords    = 'beauty spell casters, glamour spell casters, glamour magic, beauty spells, confidence spells, attraction enhancement spells, beauty rituals, glamour rituals'
    canonical   = 'https://thestarcatalog.com/beauty-spell-casters.html'
    ogTitle     = 'Top Beauty &amp; Glamour Spell Casters — Verified Reviews'
    ogDesc      = 'Real reviews on beauty and glamour spell casters. Glamour magic, confidence spells and attraction enhancement. Community directory — no paid listings.'
    twTitle     = 'Top Beauty &amp; Glamour Spell Casters | The Star Catalog'
    twDesc      = 'Find beauty and glamour spell casters with real community reviews. Glamour magic, confidence spells &amp; attraction enhancement.'
    ldName      = 'Top Beauty and Glamour Spell Casters — Verified Reviews'
    ldDesc      = 'A community-reviewed directory of beauty and glamour spell casters, confidence magic workers, and attraction enhancement practitioners.'
    ldBreadcrumb= 'Beauty &amp; Glamour Spell Casters'
    eyebrow     = 'Community-reviewed practitioners'
    h1          = 'Top Beauty &amp; Glamour Spell Casters'
    heroDesc    = 'Browse beauty and glamour spell casters, confidence magic workers, and attraction enhancement practitioners — all reviewed by real people who actually hired them.'
    sortLabel   = 'beauty and glamour spell casters'
    gridLabel   = 'Beauty and glamour spell caster profiles'
    emptyLabel  = 'beauty and glamour spell casters'
    keywords_js = "'beauty', 'glamour', 'confidence', 'appearance', 'self-image', 'glow', 'charisma', 'magnetism', 'glamour magic', 'attraction'"
    countLabel  = 'beauty and glamour spell caster'
    altSuffix   = 'beauty and glamour spell caster'
    whoTitle    = 'What Is a Beauty &amp; Glamour Spell Caster?'
    whoP1       = 'A beauty and glamour spell caster is a spiritual practitioner who uses ritual magic to enhance personal presence, attractiveness, and confidence. Glamour magic — the art of shaping how others perceive you — has deep roots in Celtic and Scottish folk traditions, Wicca, and modern witchcraft.'
    whoP2       = 'Beauty and glamour spell services include: <strong>glamour workings</strong> (shifting how others perceive your appearance and presence), <strong>confidence spells</strong> (boosting self-assurance and personal magnetism), <strong>attraction enhancement</strong> (increasing your natural draw to potential partners or opportunities), <strong>glow rituals</strong> (radiance and vitality work), and <strong>charisma spells</strong> (commanding attention and admiration).'
    whoP3       = 'Beauty and glamour magic works with your existing energy — amplifying and directing it outward. It is not about literal physical transformation. Most practitioners describe glamour work as enhancing what is already there: your confidence, presence, and natural appeal. Combined with self-care, the results can be striking.'
    chipsTitle  = 'Browse Beauty &amp; Glamour Specialties'
    chips       = @('<a href="beauty-spell-casters.html" class="lsc-sub-chip">Glamour Magic</a>','<a href="beauty-spell-casters.html" class="lsc-sub-chip">Confidence Spells</a>','<a href="beauty-spell-casters.html" class="lsc-sub-chip">Attraction Enhancement</a>','<a href="beauty-spell-casters.html" class="lsc-sub-chip">Charisma &amp; Magnetism</a>','<a href="beauty-spell-casters.html" class="lsc-sub-chip">Glow &amp; Radiance Rituals</a>','<a href="love-spell-casters.html" class="lsc-sub-chip">Love Attraction Spells</a>','<a href="protection-spell-casters.html" class="lsc-sub-chip">Self-Protection Work</a>')
    legitTitle  = 'How to Spot a Legit Beauty &amp; Glamour Spell Caster'
    legitIntro  = 'Before hiring anyone for beauty or glamour work, look for these signs of a genuine practitioner:'
    legitItems  = @('Reviews from clients describing real shifts in confidence or how others responded to them','Honest about what glamour magic does — enhancing presence, not literal physical transformation','Clear about the techniques they use: glamour crafting, mirror work, candle rituals, etc.','Does not promise you will look different physically','Upfront, consistent pricing','Experienced with the tradition they draw from for beauty and glamour work')
    faqTitle    = 'Beauty &amp; Glamour Spell Casters — FAQs'
    faqs        = @(
      @{ q='What is glamour magic?'; a='Glamour magic is the art of shifting how others perceive you — creating an aura of beauty, confidence, magnetism, or power. It draws from Scottish and Celtic folk traditions (where glamour originally described a magical illusion) as well as modern Wicca and witchcraft. Glamour work typically does not literally change your appearance, but clients often report being seen and treated differently.' },
      @{ q='Can beauty spells change how I look?'; a='Beauty and glamour spells work with your energetic presence and how you project yourself rather than causing literal physical changes. The effect is typically described as enhanced presence, increased confidence, and greater perceived attractiveness. Think of it as turning up the volume on qualities you already have.' },
      @{ q='What is the difference between a glamour spell and a love spell?'; a='Glamour spells focus on how you present yourself to the world — your presence, confidence, and perceived attractiveness. Love spells focus on drawing a specific person or romantic situation toward you. Glamour magic can complement love work by making you more magnetically attractive in general, while love spells target specific people or outcomes.' },
      @{ q='Can beauty spells help with confidence?'; a='Absolutely. Confidence work is one of the most common beauty and glamour requests. Many practitioners blend confidence magic with glamour work — clearing self-doubt and negative self-image energetically, and replacing it with a stronger, more assured presence. Clients frequently describe this as one of the most tangible results of glamour work.' },
      @{ q='How much does a glamour spell cost?'; a='Simple glamour candle work or beauty rituals can start around $40-$100. More involved multi-layer glamour crafting with personalised formulas and sustained work can cost $150-$350+. As with all spell casting services, be cautious of extremely high prices with vague justifications.' },
      @{ q='How long does a beauty spell take to work?'; a='Many clients report feeling more confident or receiving more positive attention within days to a couple of weeks of a glamour working. The effect is most noticeable in social situations, professional interactions, and romantic encounters. Maintaining the work with self-care practices the practitioner recommends helps sustain and build on the results.' }
    )
    relatedTiles = @('<a href="love-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Love Spell Casters</span><span class="lsc-related-tile-sub">Attraction, binding &amp; romance</span></a>','<a href="obsession-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Obsession Spell Casters</span><span class="lsc-related-tile-sub">Come to me &amp; domination work</span></a>','<a href="reconciliation-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Reconciliation Spell Casters</span><span class="lsc-related-tile-sub">Bring back ex &amp; relationship healing</span></a>','<a href="money-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Money Spell Casters</span><span class="lsc-related-tile-sub">Wealth, prosperity &amp; abundance</span></a>','<a href="protection-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Protection Spell Casters</span><span class="lsc-related-tile-sub">Warding &amp; psychic protection</span></a>','<a href="road-opener-spell-casters.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Road Opener Spell Casters</span><span class="lsc-related-tile-sub">Clear blocks &amp; open new paths</span></a>','<a href="cord-cutting-practitioners.html" class="lsc-related-tile"><span class="lsc-related-tile-label">Cord Cutting Practitioners</span><span class="lsc-related-tile-sub">Release toxic bonds &amp; attachments</span></a>','<a href="spellcasters.html" class="lsc-related-tile" style="background:var(--navy);"><span class="lsc-related-tile-label" style="color:var(--cream);">All Spell Casters</span><span class="lsc-related-tile-sub" style="color:rgba(232,224,204,.55);">Browse the full directory</span></a>')
  }
)

# ── HTML builder ──────────────────────────────────────────────────────────────
function Build-FAQSchemaAndHTML($faqs) {
    $schemaItems = @()
    $htmlItems   = @()
    foreach ($f in $faqs) {
        $escapedA = $f.a -replace '"', '\"'
        $schemaItems += @"
        {
          "@type": "Question",
          "name": "$($f.q)",
          "acceptedAnswer": { "@type": "Answer", "text": "$escapedA" }
        }
"@
        $htmlItems += @"
                <div class="lsc-faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                    <div class="lsc-faq-q" itemprop="name">$($f.q)</div>
                    <div class="lsc-faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                        <span itemprop="text">$($f.a)</span>
                    </div>
                </div>
"@
    }
    return @{
        schema = $schemaItems -join ","
        html   = $htmlItems -join "`n"
    }
}

foreach ($p in $pages) {
    $faqData = Build-FAQSchemaAndHTML $p.faqs

    # Personalise the shared JS
    $js = $JS_SHARED
    $js = $js -replace 'SUPA_URL_PLACEHOLDER',     $SUPA_URL
    $js = $js -replace 'SUPA_KEY_PLACEHOLDER',     $SUPA_KEY
    $js = $js -replace 'KEYWORDS_PLACEHOLDER',     $p.keywords_js
    $js = $js -replace 'EMPTY_LABEL_PLACEHOLDER',  $p.emptyLabel
    $js = $js -replace 'COUNT_LABEL_PLACEHOLDER',  $p.countLabel
    $js = $js -replace 'ALT_SUFFIX_PLACEHOLDER',   $p.altSuffix

    $chipsHTML = $p.chips -join "`n                    "
    $checkHTML = ($p.legitItems | ForEach-Object { "                    <li>$_</li>" }) -join "`n"
    $relHTML   = $p.relatedTiles -join "`n                "

    $html = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-8RKJDCW3DF"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-8RKJDCW3DF');</script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>$($p.titleFull)</title>
    <meta name="description" content="$($p.metaDesc)">
    <meta name="keywords" content="$($p.keywords)">
    <link rel="canonical" href="$($p.canonical)">
    <meta property="og:type" content="website">
    <meta property="og:url" content="$($p.canonical)">
    <meta property="og:site_name" content="The Star Catalog">
    <meta property="og:title" content="$($p.ogTitle)">
    <meta property="og:description" content="$($p.ogDesc)">
    <meta property="og:image" content="https://thestarcatalog.com/svgviewer-png-output.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="$($p.twTitle)">
    <meta name="twitter:description" content="$($p.twDesc)">
    <meta name="twitter:image" content="https://thestarcatalog.com/svgviewer-png-output.png">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <meta name="author" content="The Star Catalog">
    <meta name="theme-color" content="#1b2d3e">
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "$($p.ldName)",
      "description": "$($p.ldDesc)",
      "url": "$($p.canonical)",
      "isPartOf": { "@type": "WebSite", "name": "The Star Catalog", "url": "https://thestarcatalog.com/" },
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home",          "item": "https://thestarcatalog.com/" },
          { "@type": "ListItem", "position": 2, "name": "Spell Casters", "item": "https://thestarcatalog.com/spellcasters.html" },
          { "@type": "ListItem", "position": 3, "name": "$($p.ldBreadcrumb)", "item": "$($p.canonical)" }
        ]
      }
    }
    </script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
$($faqData.schema)
      ]
    }
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Cinzel:wght@400;600;700&family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
    <link rel="icon" href="svgviewer-png-output.png" type="image/png" />
    <style>
        .lsc-hero{background:var(--navy);border-bottom:1.5px solid #2c3f52;padding:72px max(24px,6vw) 56px;text-align:center}
        .lsc-eyebrow{display:inline-flex;align-items:center;gap:7px;font-family:'Source Code Pro',monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin-bottom:20px}
        .lsc-h1{font-family:'Cinzel',serif;font-size:clamp(1.6rem,4vw,2.8rem);font-weight:700;color:var(--cream);letter-spacing:.04em;line-height:1.25;margin:0 auto 16px;max-width:780px}
        .lsc-hero-desc{font-family:'IM Fell English',serif;color:rgba(232,224,204,.7);font-size:1rem;max-width:600px;margin:0 auto 28px;line-height:1.65}
        .lsc-cta-row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
        .lsc-breadcrumb{padding:12px max(24px,5vw);background:var(--cream2);border-bottom:1px solid var(--border);font-family:'Source Code Pro',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .lsc-breadcrumb a{color:var(--muted);text-decoration:underline;text-underline-offset:2px}
        .lsc-breadcrumb a:hover{color:var(--navy)}
        .lsc-breadcrumb-sep{color:var(--border)}
        .lsc-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px max(24px,5vw);background:var(--cream2);border-bottom:1.5px solid var(--border)}
        .lsc-count{font-family:'Source Code Pro',monospace;font-size:11px;letter-spacing:.07em;color:var(--muted)}
        .lsc-sort-wrap{display:flex;align-items:center;gap:8px}
        .lsc-sort-label{font-family:'Source Code Pro',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
        .lsc-sort-select{font-family:'Source Code Pro',monospace;font-size:11px;background:var(--cream);border:1.5px solid var(--border);color:var(--navy);padding:6px 10px;cursor:pointer}
        .lsc-sort-select:focus{outline:none;border-color:var(--accent)}
        .lsc-grid-section{padding:36px max(24px,5vw) 60px;background:var(--cream2);min-height:320px}
        .lsc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
        .lsc-load-more-wrap{text-align:center;margin-top:36px}
        .lsc-empty{grid-column:1/-1;text-align:center;padding:60px 20px;font-family:'Source Code Pro',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
        .lsc-card{background:var(--cream);border:1px solid var(--border);overflow:hidden;display:flex;flex-direction:column;transition:box-shadow .2s;text-decoration:none;color:inherit;cursor:pointer}
        .lsc-card:hover{box-shadow:0 4px 16px rgba(14,24,36,.18)}
        .lsc-content-section{padding:60px max(24px,6vw)}
        .lsc-section-eyebrow{display:flex;align-items:center;gap:7px;font-family:'Source Code Pro',monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-bottom:14px}
        .lsc-section-h2{font-family:'Cinzel',serif;font-size:clamp(1.2rem,3vw,1.9rem);font-weight:700;color:var(--navy);letter-spacing:.04em;margin-bottom:18px;line-height:1.3}
        .lsc-prose{font-family:'IM Fell English',serif;font-size:1rem;color:var(--muted);line-height:1.75;max-width:780px}
        .lsc-prose p{margin:0 0 18px}
        .lsc-prose p:last-child{margin-bottom:0}
        .lsc-two-col{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:start}
        .lsc-checklist{list-style:none;padding:0;margin:18px 0 0;display:flex;flex-direction:column;gap:12px}
        .lsc-checklist li{font-family:'IM Fell English',serif;font-size:1rem;color:var(--muted);line-height:1.6;display:flex;align-items:flex-start;gap:10px}
        .lsc-checklist li::before{content:'✓';color:var(--accent);font-family:'Source Code Pro',monospace;font-size:11px;flex-shrink:0;margin-top:4px}
        .lsc-sub-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:28px}
        .lsc-sub-chip{font-family:'Source Code Pro',monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;border:1.5px solid var(--border);color:var(--navy);background:var(--cream);padding:7px 14px;text-decoration:none;transition:border-color .18s,background .18s}
        .lsc-sub-chip:hover{border-color:var(--accent);background:var(--cream2)}
        .lsc-faq-list{max-width:820px;margin:0 auto;display:flex;flex-direction:column;gap:0}
        .lsc-faq-item{border-bottom:1px solid var(--border)}
        .lsc-faq-q{font-family:'Cinzel',serif;font-size:13px;font-weight:600;color:var(--navy);letter-spacing:.03em;padding:18px 0;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;user-select:none}
        .lsc-faq-q::after{content:'+';font-family:'Source Code Pro',monospace;font-size:16px;color:var(--accent);flex-shrink:0;line-height:1;transition:transform .2s}
        .lsc-faq-item.open .lsc-faq-q::after{transform:rotate(45deg)}
        .lsc-faq-a{font-family:'IM Fell English',serif;font-size:.97rem;color:var(--muted);line-height:1.7;max-height:0;overflow:hidden;transition:max-height .3s ease,padding .3s ease;padding-bottom:0}
        .lsc-faq-item.open .lsc-faq-a{max-height:500px;padding-bottom:20px}
        .lsc-related-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:32px}
        .lsc-related-tile{background:var(--cream);border:1px solid var(--border);padding:18px 16px;text-decoration:none;color:inherit;transition:box-shadow .18s;display:flex;flex-direction:column;gap:6px}
        .lsc-related-tile:hover{box-shadow:0 3px 14px rgba(14,24,36,.14)}
        .lsc-related-tile-label{font-family:'Cinzel',serif;font-size:11px;font-weight:600;color:var(--navy);letter-spacing:.04em}
        .lsc-related-tile-sub{font-family:'Source Code Pro',monospace;font-size:9.5px;color:var(--muted);letter-spacing:.04em}
        .visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
        @media(max-width:1024px){.lsc-grid{grid-template-columns:repeat(3,1fr)}.lsc-related-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:768px){.lsc-grid{grid-template-columns:repeat(2,1fr);gap:12px}.lsc-two-col{grid-template-columns:1fr;gap:32px}.lsc-related-grid{grid-template-columns:repeat(2,1fr)}.lsc-hero{padding:52px 20px 44px}}
        @media(max-width:480px){.lsc-grid{grid-template-columns:1fr}.lsc-controls{flex-direction:column;align-items:flex-start}.lsc-related-grid{grid-template-columns:1fr}}
    </style>
</head>
<body>
    <header class="site-header">
        <a class="logo-wrap" href="index.html">
            <div class="monogram"><svg width="24" height="24" viewBox="0 0 26 26" fill="none" aria-hidden="true"><polygon points="13,2 15,10 23,8 17,14 23,20 15,18 13,26 11,18 3,20 9,14 3,8 11,10" stroke="#c9b97a" stroke-width="1" fill="none"/><circle cx="13" cy="13" r="3" fill="none" stroke="#c9b97a" stroke-width="1"/><line x1="11.5" y1="13" x2="14.5" y2="13" stroke="#c9b97a" stroke-width="1"/><line x1="13" y1="11.5" x2="13" y2="14.5" stroke="#c9b97a" stroke-width="1"/></svg></div>
            <div class="logo-text"><span class="logo-main">The Star Catalog</span><span class="logo-sub">Est. MMXXVI — Seeker's Guide</span></div>
        </a>
        <nav class="site-nav" aria-label="Main navigation">
            <a href="spellcasters.html">Browse</a>
            <a href="about.html">About</a>
            <a href="faq.html">FAQ</a>
            <a href="saved.html">Saved</a>
            <span id="navAuthArea" class="nav-auth-area"></span>
        </nav>
        <a class="nav-cta" href="submit-practitioner.html" style="text-decoration:none;">Submit Practitioner</a>
        <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Open navigation menu"><span></span><span></span><span></span></button>
    </header>
    <div class="mobile-nav" id="mobileNav" aria-label="Mobile navigation">
        <a href="spellcasters.html" class="mobile-nav-item">Browse Directory</a>
        <a href="about.html" class="mobile-nav-item">About</a>
        <a href="faq.html" class="mobile-nav-item">FAQ</a>
        <a href="contact.html" class="mobile-nav-item">Contact</a>
        <a href="saved.html" class="mobile-nav-item">Saved Profiles</a>
        <a href="submit-practitioner.html" class="mobile-nav-item">Submit Practitioner</a>
    </div>

    <nav class="lsc-breadcrumb" aria-label="Breadcrumb">
        <a href="index.html">Home</a>
        <span class="lsc-breadcrumb-sep" aria-hidden="true">&rsaquo;</span>
        <a href="spellcasters.html">All Spell Casters</a>
        <span class="lsc-breadcrumb-sep" aria-hidden="true">&rsaquo;</span>
        <span aria-current="page">$($p.ldBreadcrumb)</span>
    </nav>

    <section class="lsc-hero" aria-labelledby="lscH1">
        <div class="lsc-eyebrow" aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><polygon points="7,1 8.5,5.5 13,5.5 9.5,8.5 11,13 7,10 3,13 4.5,8.5 1,5.5 5.5,5.5" stroke="#c9b97a" stroke-width="1" fill="none"/></svg>
            $($p.eyebrow)
        </div>
        <h1 id="lscH1" class="lsc-h1">$($p.h1)</h1>
        <p class="lsc-hero-desc">$($p.heroDesc)</p>
        <div class="lsc-cta-row">
            <a href="submit-practitioner.html" class="landing-btn-primary accent-bg">Submit a Practitioner</a>
            <a href="spellcasters.html" class="landing-btn-secondary light">Browse All Spell Casters</a>
        </div>
    </section>

    <div class="lsc-controls" role="toolbar" aria-label="Sort controls">
        <span class="lsc-count" id="lscCount">Loading practitioners…</span>
        <div class="lsc-sort-wrap">
            <span class="lsc-sort-label">Sort</span>
            <select class="lsc-sort-select" id="lscSort" aria-label="Sort $($p.sortLabel)">
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest First</option>
                <option value="reviews">Most Reviewed</option>
            </select>
        </div>
    </div>

    <section class="lsc-grid-section" aria-labelledby="gridHeading">
        <h2 id="gridHeading" class="visually-hidden">$($p.ldBreadcrumb) Directory</h2>
        <div class="lsc-grid" id="lscGrid" role="list" aria-label="$($p.gridLabel)">
            <div class="lsc-empty">Loading $($p.emptyLabel)…</div>
        </div>
        <div class="lsc-load-more-wrap" id="lscLoadMoreWrap" style="display:none;">
            <button id="lscLoadMore" class="landing-btn-secondary" style="min-width:200px;">Load More Practitioners</button>
        </div>
    </section>

    <section class="lsc-content-section" id="about" aria-labelledby="aboutH2" style="background:var(--cream);">
        <div class="lsc-two-col" style="max-width:1100px;margin:0 auto;">
            <div>
                <div class="lsc-section-eyebrow">
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true"><polygon points="7,1 8.5,5.5 13,5.5 9.5,8.5 11,13 7,10 3,13 4.5,8.5 1,5.5 5.5,5.5" stroke="#c9b97a" stroke-width="1" fill="none"/></svg>
                    What you need to know
                </div>
                <h2 id="aboutH2" class="lsc-section-h2">$($p.whoTitle)</h2>
                <div class="lsc-prose">
                    <p>$($p.whoP1)</p>
                    <p>$($p.whoP2)</p>
                    <p>$($p.whoP3)</p>
                </div>
                <h3 style="font-family:'Cinzel',serif;font-size:13px;font-weight:600;color:var(--navy);letter-spacing:.04em;margin:28px 0 12px;">$($p.chipsTitle)</h3>
                <nav class="lsc-sub-chips" aria-label="$($p.chipsTitle)">
                    $chipsHTML
                </nav>
            </div>
            <div>
                <div class="lsc-section-eyebrow">
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true"><polygon points="7,1 8.5,5.5 13,5.5 9.5,8.5 11,13 7,10 3,13 4.5,8.5 1,5.5 5.5,5.5" stroke="#c9b97a" stroke-width="1" fill="none"/></svg>
                    How to find a legit one
                </div>
                <h2 class="lsc-section-h2">$($p.legitTitle)</h2>
                <p class="lsc-prose" style="margin-bottom:16px;">$($p.legitIntro)</p>
                <ul class="lsc-checklist" aria-label="Signs of a legit practitioner">
$checkHTML
                </ul>
            </div>
        </div>
    </section>

    <section class="lsc-content-section" id="faq" aria-labelledby="faqH2" style="background:var(--cream2);">
        <div style="max-width:860px;margin:0 auto;">
            <div class="lsc-section-eyebrow" style="justify-content:center;">
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true"><polygon points="7,1 8.5,5.5 13,5.5 9.5,8.5 11,13 7,10 3,13 4.5,8.5 1,5.5 5.5,5.5" stroke="#c9b97a" stroke-width="1" fill="none"/></svg>
                Common questions
            </div>
            <h2 id="faqH2" class="lsc-section-h2" style="text-align:center;">$($p.faqTitle)</h2>
            <div class="lsc-faq-list" itemscope itemtype="https://schema.org/FAQPage">
$($faqData.html)
            </div>
        </div>
    </section>

    <section class="lsc-content-section" aria-labelledby="relatedH2" style="background:var(--cream);">
        <div style="max-width:1100px;margin:0 auto;">
            <div class="lsc-section-eyebrow">
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true"><polygon points="7,1 8.5,5.5 13,5.5 9.5,8.5 11,13 7,10 3,13 4.5,8.5 1,5.5 5.5,5.5" stroke="#c9b97a" stroke-width="1" fill="none"/></svg>
                Other specialties
            </div>
            <h2 id="relatedH2" class="lsc-section-h2">Browse Other Spell Caster Categories</h2>
            <nav class="lsc-related-grid" aria-label="Other spell caster specialties">
                $relHTML
            </nav>
        </div>
    </section>

    <footer class="site-footer" id="siteFooter" role="contentinfo"></footer>
    <script src="site-footer.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="auth.js"></script>
    <script>
$js
    </script>
</body>
</html>
"@

    $outPath = Join-Path $root $p.file
    [System.IO.File]::WriteAllText($outPath, $html, [System.Text.Encoding]::UTF8)
    Write-Host "Written: $($p.file)"
}

Write-Host "`nAll $($pages.Count) specialty pages generated."
