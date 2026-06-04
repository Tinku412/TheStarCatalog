$pages = @(
    @{ File='money-spell-casters.html'; Title='Money Spell Casters'; H1='Money Spell Casters'; Desc='Find money and prosperity spell casters with verified community reviews. Wealth attraction, abundance rituals, and business success work.'; Kw='money spell casters, prosperity spell casters, wealth spells' },
    @{ File='protection-spell-casters.html'; Title='Protection Spell Casters'; H1='Protection Spell Casters'; Desc='Browse protection spell casters reviewed by real clients. Warding, cleansing, psychic protection, and spiritual defense.'; Kw='protection spell casters, warding spells, psychic protection' },
    @{ File='hex-and-curse-removal.html'; Title='Hex & Curse Removal'; H1='Hex & Curse Removal Specialists'; Desc='Find hex and curse removal practitioners with honest community reviews. Evil eye removal, curse breaking, and spiritual cleansing.'; Kw='hex removal, curse removal, evil eye removal' },
    @{ File='cord-cutting-practitioners.html'; Title='Cord Cutting Practitioners'; H1='Cord Cutting Practitioners'; Desc='Discover cord cutting practitioners with real reviews. Release emotional ties, energetic bonds, and past-connection work.'; Kw='cord cutting practitioners, energetic cord cutting' },
    @{ File='banishment-spell-casters.html'; Title='Banishment Spell Casters'; H1='Banishment Spell Casters'; Desc='Browse banishment spell casters with community reviews. Remove enemies, negative influences, and unwanted spiritual attachments.'; Kw='banishment spell casters, banishing spells' },
    @{ File='reconciliation-spell-casters.html'; Title='Reconciliation Spell Casters'; H1='Reconciliation Spell Casters'; Desc='Find reconciliation and bring-back-ex spell casters with verified reviews. Relationship healing and commitment work.'; Kw='reconciliation spell casters, bring back ex spell casters' },
    @{ File='court-case-spell-casters.html'; Title='Court Case Spell Casters'; H1='Court Case Spell Casters'; Desc='Browse court case spell casters reviewed by the community. Justice work, legal protection, and favorable outcomes.'; Kw='court case spell casters, legal spell work' },
    @{ File='fertility-spell-casters.html'; Title='Fertility Spell Casters'; H1='Fertility Spell Casters'; Desc='Find fertility spell casters with real client reviews. Pregnancy blessings, conception support, and family magic.'; Kw='fertility spell casters, pregnancy spells' },
    @{ File='road-opener-spell-casters.html'; Title='Road Opener Spell Casters'; H1='Road Opener Spell Casters'; Desc='Discover road opener spell casters with community reviews. Clear blocks, career opportunities, and new paths forward.'; Kw='road opener spell casters, career spell casters' },
    @{ File='obsession-spell-casters.html'; Title='Obsession Spell Casters'; H1='Obsession Spell Casters'; Desc='Browse obsession spell casters with verified reviews. Read experiences before hiring any practitioner.'; Kw='obsession spell casters' },
    @{ File='revenge-spell-casters.html'; Title='Revenge Spell Casters'; H1='Revenge & Justice Spell Casters'; Desc='Find revenge and justice spell casters with honest community reviews. Karma work and enemy spells.'; Kw='revenge spell casters, justice spells' },
    @{ File='beauty-spell-casters.html'; Title='Beauty Spell Casters'; H1='Beauty & Glamour Spell Casters'; Desc='Browse beauty and glamour spell casters with real reviews. Confidence, attraction, and self-image magic.'; Kw='beauty spell casters, glamour magic' }
)

$specialtyNav = @'
            <nav class="sc-specialty-cols" aria-label="Browse by spell casting specialty" style="margin-top:2rem;">
                <a href="love-spell-casters.html" class="sc-specialty-link">Love Spell Casters</a>
                <a href="money-spell-casters.html" class="sc-specialty-link">Money &amp; Prosperity</a>
                <a href="protection-spell-casters.html" class="sc-specialty-link">Protection</a>
                <a href="reconciliation-spell-casters.html" class="sc-specialty-link">Reconciliation</a>
                <a href="hex-and-curse-removal.html" class="sc-specialty-link">Hex &amp; Curse Removal</a>
                <a href="court-case-spell-casters.html" class="sc-specialty-link">Court Case</a>
                <a href="road-opener-spell-casters.html" class="sc-specialty-link">Road Opener</a>
                <a href="fertility-spell-casters.html" class="sc-specialty-link">Fertility</a>
                <a href="banishment-spell-casters.html" class="sc-specialty-link">Banishment</a>
                <a href="cord-cutting-practitioners.html" class="sc-specialty-link">Cord Cutting</a>
                <a href="obsession-spell-casters.html" class="sc-specialty-link">Obsession</a>
                <a href="revenge-spell-casters.html" class="sc-specialty-link">Revenge &amp; Justice</a>
                <a href="beauty-spell-casters.html" class="sc-specialty-link">Beauty &amp; Glamour</a>
                <a href="spellcasters.html" class="sc-specialty-link">All Spell Casters</a>
            </nav>
'@

$header = @'
<!DOCTYPE html>
<html lang="en">
<head>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-8RKJDCW3DF"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-8RKJDCW3DF');</script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>{TITLE} — Verified Reviews | The Star Catalog</title>
    <meta name="description" content="{DESC}">
    <meta name="keywords" content="{KW}">
    <link rel="canonical" href="https://thestarcatalog.com/{FILE}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://thestarcatalog.com/{FILE}">
    <meta property="og:title" content="{TITLE} — The Star Catalog">
    <meta property="og:description" content="{DESC}">
    <meta property="og:image" content="https://thestarcatalog.com/svgviewer-png-output.png">
    <meta name="robots" content="index, follow">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Cinzel:wght@400;600;700&family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
    <link rel="icon" href="svgviewer-png-output.png" type="image/png" />
    <style>
        .sc-specialty-cols { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px 20px; }
        .sc-specialty-link { font-family: 'Source Code Pro', monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--navy); text-decoration: none; padding: 6px 0; border-bottom: 1px solid var(--border); }
        .sc-specialty-link:hover { color: var(--accent); }
    </style>
</head>
<body>
    <header class="site-header">
        <a class="logo-wrap" href="index.html">
            <div class="monogram"><svg width="24" height="24" viewBox="0 0 26 26" fill="none"><polygon points="13,2 15,10 23,8 17,14 23,20 15,18 13,26 11,18 3,20 9,14 3,8 11,10" stroke="#c9b97a" stroke-width="1" fill="none"/></svg></div>
            <div class="logo-text"><span class="logo-main">The Star Catalog</span><span class="logo-sub">Est. MMXXVI — Seeker's Guide</span></div>
        </a>
        <nav class="site-nav">
            <a href="spellcasters.html" class="active">Browse</a>
            <a href="about.html">About</a>
            <a href="faq.html">FAQ</a>
            <a href="saved.html">Saved</a>
            <span id="navAuthArea" class="nav-auth-area"></span>
        </nav>
        <a class="nav-cta" href="submit-practitioner.html" style="text-decoration:none;">Submit Practitioner</a>
        <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Toggle menu"><span></span><span></span><span></span></button>
    </header>
    <div class="mobile-nav" id="mobileNav">
        <a href="spellcasters.html" class="mobile-nav-item">Browse Directory</a>
        <a href="about.html" class="mobile-nav-item">About</a>
        <a href="faq.html" class="mobile-nav-item">FAQ</a>
        <a href="contact.html" class="mobile-nav-item">Contact</a>
        <a href="saved.html" class="mobile-nav-item">Saved Profiles</a>
        <a href="submit-practitioner.html" class="mobile-nav-item">Submit Practitioner</a>
    </div>
    <div class="page-hero">
        <div class="page-hero-inner">
            <div class="page-eyebrow"><svg width="11" height="11" viewBox="0 0 14 14" fill="none"><polygon points="7,1 8.5,5.5 13,5.5 9.5,8.5 11,13 7,10 3,13 4.5,8.5 1,5.5 5.5,5.5" stroke="#c9b97a" stroke-width="1" fill="none"/></svg> Specialty Directory</div>
            <h1 class="page-title">{H1}</h1>
            <p class="page-subtitle">{DESC}</p>
        </div>
    </div>
    <div class="page-content">
        <div class="page-content-inner">
            <div class="content-section">
                <div class="section-body">
                    <p>This specialty page is part of The Star Catalog — a community-driven spell caster directory with verified reviews from real seekers. Browse practitioners below or explore related specialties.</p>
                    <p style="margin-top:1rem;"><a href="spellcasters.html" style="color:var(--accent);">Browse all spell casters</a> · <a href="love-spell-casters.html" style="color:var(--accent);">Love spell casters</a> · <a href="submit-practitioner.html" style="color:var(--accent);">Submit a practitioner</a></p>
                </div>
                <h2 class="section-heading" style="margin-top:2rem;">More Spell Casting Specialties</h2>
{SPECIALTY_NAV}
            </div>
        </div>
    </div>
    <footer class="site-footer" id="siteFooter" role="contentinfo"></footer>
    <script src="site-footer.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="auth.js"></script>
    <script>
    (function(){var b=document.getElementById('mobileMenuBtn'),n=document.getElementById('mobileNav');if(!b||!n)return;b.addEventListener('click',function(e){e.stopPropagation();b.classList.toggle('active');n.classList.toggle('active');});document.addEventListener('click',function(e){if(n.classList.contains('active')&&!n.contains(e.target)&&!b.contains(e.target)){b.classList.remove('active');n.classList.remove('active');}});})();
    </script>
</body>
</html>
'@

$root = Split-Path $PSScriptRoot -Parent
foreach ($p in $pages) {
    $html = $header -replace '\{TITLE\}', $p.Title -replace '\{H1\}', $p.H1 -replace '\{DESC\}', $p.Desc -replace '\{KW\}', $p.Kw -replace '\{FILE\}', $p.File -replace '\{SPECIALTY_NAV\}', $specialtyNav
    Set-Content -Path (Join-Path $root $p.File) -Value $html -Encoding UTF8 -NoNewline
    Write-Host "Wrote $($p.File)"
}
