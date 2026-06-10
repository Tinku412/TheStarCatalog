/**
 * Shared site footer — keep specialty URLs in sync across the site.
 * Dedicated specialty pages (use these instead of ?specialty= query links):
 *   love-spell-casters.html, money-spell-casters.html, protection-spell-casters.html,
 *   hex-and-curse-removal.html, cord-cutting-spellcasters.html, banishment-spell-casters.html,
 *   reconciliation-spell-casters.html, court-case-spell-casters.html, fertility-spell-casters.html,
 *   road-opener-spell-casters.html, obsession-spell-casters.html, revenge-spell-casters.html,
 *   beauty-spell-casters.html
 */
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
