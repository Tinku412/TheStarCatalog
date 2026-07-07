/**
 * Shared site footer — keep specialty URLs in sync across the site.
 * Dedicated specialty pages (use these instead of ?specialty= query links):
 *   love-spell-casters.html, money-spell-casters.html, protection-spell-casters.html,
 *   hex-and-curse-removal.html, cord-cutting-spellcasters.html, banishment-spell-casters.html,
 *   reconciliation-spell-casters.html, court-case-spell-casters.html, fertility-spell-casters.html,
 *   road-opener-spell-casters.html, obsession-spell-casters.html, revenge-spell-casters.html,
 *   beauty-spell-casters.html
 */

/* Scrolling ticker below site header */
(function () {
    if (document.getElementById('siteTicker') || document.body.dataset.noTicker === 'true') return;

    const header = document.querySelector('header.site-header');
    if (!header) return;

    const items = [
        'Community-reviewed spellcasters — real reviews from real clients',
        'New practitioners added regularly — browse the directory',
        'Know a legit spellcaster? Submit them to help the community',
        'Read verified reviews before you hire — protect yourself from scams',
        'Love • Money • Protection • Reconciliation & more specialties live',
        'Sign in with Google to save profiles, recommend & write reviews',
        'Every review is tied to a verified Google account',
        'No paid rankings — community trust only',
    ];

    function buildItemsHtml() {
        return items.map(function (text) {
            return '<span class="site-ticker-item">' + text + '</span><span class="site-ticker-sep" aria-hidden="true">✦</span>';
        }).join('');
    }

    const ticker = document.createElement('div');
    ticker.id = 'siteTicker';
    ticker.className = 'site-ticker';
    ticker.setAttribute('aria-label', 'Site updates');
    ticker.innerHTML =
        '<div class="site-ticker-viewport">' +
            '<div class="site-ticker-track">' +
                '<div class="site-ticker-group">' + buildItemsHtml() + '</div>' +
                '<div class="site-ticker-group" aria-hidden="true">' + buildItemsHtml() + '</div>' +
            '</div>' +
        '</div>';

    header.insertAdjacentElement('afterend', ticker);
})();

(function () {
    const el = document.getElementById('siteFooter');
    if (!el) return;

    el.innerHTML = `
        <div class="footer-top">
            <div class="footer-col">
                <div class="footer-col-title">Witch Weekly</div>
                <div style="display:flex;align-items:center;gap:9px;margin-bottom:10px;">
                    <div class="monogram" style="border-color:#2c3f52;width:32px;height:32px;">
                        <svg width="20" height="20" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                            <polygon points="13,2 15,10 23,8 17,14 23,20 15,18 13,26 11,18 3,20 9,14 3,8 11,10" stroke="#c9b97a" stroke-width="1" fill="none"/>
                        </svg>
                    </div>
                    <span style="font-family:'Cinzel',serif;font-size:12px;color:var(--cream);letter-spacing:0.1em;">WitchWeekly</span>
                </div>
                <p class="footer-logo-desc">A community-run directory of spell casters and spiritual spellcasters. Real reviews from real people — built to protect seekers from fraud.</p>
                <div class="footer-social">
                    <a href="https://www.instagram.com/witchweeklyreviews" target="_blank" rel="noopener" aria-label="Instagram" class="footer-social-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                            <circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                            <circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>
                        </svg>
                    </a>
                    <a href="https://www.reddit.com/r/WitchWeekly/" target="_blank" rel="noopener" aria-label="Reddit" class="footer-social-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
                            <circle cx="8.5" cy="13" r="1.2" fill="currentColor"/>
                            <circle cx="15.5" cy="13" r="1.2" fill="currentColor"/>
                            <path d="M8.5 16.5c1 1 5.5 1 7 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>
                            <circle cx="18.5" cy="8" r="1.5" stroke="currentColor" stroke-width="1.3" fill="none"/>
                            <path d="M15 6.5c1-2 4.5-1 4 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>
                            <path d="M5.5 8.5C6.5 6 11 5.5 12 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>
                        </svg>
                    </a>
                    <a href="https://www.facebook.com/" target="_blank" rel="noopener" aria-label="Facebook" class="footer-social-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
                            <path d="M15 8h-2a1 1 0 0 0-1 1v2h3l-.5 3H12v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        </svg>
                    </a>
                    <a href="https://www.linkedin.com/" target="_blank" rel="noopener" aria-label="LinkedIn" class="footer-social-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect x="2" y="2" width="20" height="20" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
                            <path d="M7 10v7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <circle cx="7" cy="7.5" r="1" fill="currentColor"/>
                            <path d="M11 17v-4a2 2 0 0 1 4 0v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <path d="M11 10v7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                    </a>
                    <a href="https://x.com/" target="_blank" rel="noopener" aria-label="X / Twitter" class="footer-social-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M4 4l16 16M20 4 4 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        </svg>
                    </a>
                    <a href="https://www.tumblr.com/" target="_blank" rel="noopener" aria-label="Tumblr" class="footer-social-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M10 4v11a3 3 0 0 0 3 3h2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <path d="M7 9h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                    </a>
                </div>
            </div>
            <div class="footer-col">
                <div class="footer-col-title">Quick Links</div>
                <ul class="footer-links">
                    <li><a href="index.html">Home</a></li>
                    <li><a href="spellcasters.html">Browse Spell Casters</a></li>
                    <li><a href="about.html">About Us</a></li>
                    <li><a href="contact.html">Contact</a></li>
                    <li><a href="saved.html">Saved Profiles</a></li>
                    <li><a href="my-reviews.html">My Reviews</a></li>
                    <li><a href="submit-spellcaster.html">Submit a spellcaster</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <div class="footer-col-title">Legal</div>
                <ul class="footer-links">
                    <li><a href="privacy-policy.html">Privacy Policy</a></li>
                    <li><a href="terms.html">Terms of Service</a></li>
                    <li><a href="disclaimer.html">Disclaimer</a></li>
                    <li><a href="faq.html">FAQ</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <div class="footer-col-title">Directory</div>
                <ul class="footer-links">
                    <li><a href="spellcasters.html">All Spell Casters</a></li>
                    <li><a href="submit-spellcaster.html">Submit a spellcaster</a></li>
                    <li><a href="faq.html">FAQ</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <div class="footer-col-title">Browse by Specialty</div>
                <ul class="footer-links">
                    <li><a href="love-spell-casters.html">Love Spell Casters</a></li>
                    <li><a href="money-spell-casters.html">Money Spell Casters</a></li>
                    <li><a href="protection-spell-casters.html">Protection Spell Casters</a></li>
                    <li><a href="reconciliation-spell-casters.html">Reconciliation Spell Casters</a></li>
                    <li><a href="hex-and-curse-removal.html">Hex &amp; Curse Removal</a></li>
                    <li><a href="cord-cutting-spellcasters.html">Cord Cutting spellcasters</a></li>
                    <li><a href="banishment-spell-casters.html">Banishment Spell Casters</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <div class="footer-col-title">More Specialties</div>
                <ul class="footer-links">
                    <li><a href="court-case-spell-casters.html">Court Case Spell Casters</a></li>
                    <li><a href="fertility-spell-casters.html">Fertility Spell Casters</a></li>
                    <li><a href="road-opener-spell-casters.html">Road Opener Spell Casters</a></li>
                    <li><a href="obsession-spell-casters.html">Obsession Spell Casters</a></li>
                    <li><a href="revenge-spell-casters.html">Revenge Spell Casters</a></li>
                    <li><a href="beauty-spell-casters.html">Beauty Spell Casters</a></li>
                </ul>
            </div>
        </div>
        <div class="footer-bottom">
            <span class="footer-copy">© MMXXVI Witch Weekly. All rights reserved.</span>
            <div class="footer-bottom-links">
                <a href="privacy-policy.html">Privacy</a>
                <a href="terms.html">Terms</a>
                <a href="disclaimer.html">Disclaimer</a>
            </div>
        </div>
    `;
})();
