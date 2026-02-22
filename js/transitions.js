/**
 * MCS Page Transition System
 * Provides smooth SPA-like page transitions with a gold progress bar
 */
(function () {
    // Create overlay + progress bar elements
    const overlay = document.createElement('div');
    overlay.id = 'page-transition';
    overlay.style.cssText = `
        position:fixed;inset:0;z-index:99999;pointer-events:none;
        background:#F6F1E8;opacity:0;
        transition:opacity 0.35s cubic-bezier(0.4,0,0.2,1);
    `;

    const bar = document.createElement('div');
    bar.id = 'page-progress';
    bar.style.cssText = `
        position:fixed;top:0;left:0;width:0%;height:3px;
        background:linear-gradient(90deg,#0F3D3E,#C6A75E);
        z-index:100000;border-radius:0 2px 2px 0;
        transition:width 0.4s cubic-bezier(0.4,0,0.2,1);
        box-shadow:0 0 10px rgba(198,167,94,0.5);
    `;

    // Inject into body on DOM ready
    function inject() {
        if (!document.getElementById('page-transition')) document.body.appendChild(overlay);
        if (!document.getElementById('page-progress')) document.body.appendChild(bar);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }

    // Intercept all internal link clicks
    document.addEventListener('click', function (e) {
        const a = e.target.closest('a');
        if (!a) return;
        const href = a.getAttribute('href');
        // Skip: anchors, external links, mailto/tel, new tab links
        if (!href ||
            href.startsWith('#') ||
            href.startsWith('http') ||
            href.startsWith('//') ||
            href.startsWith('mailto') ||
            href.startsWith('tel') ||
            a.target === '_blank') return;

        e.preventDefault();
        bar.style.width = '70%';
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'all';

        setTimeout(function () {
            bar.style.width = '100%';
            setTimeout(function () {
                window.location.href = href;
            }, 120);
        }, 280);
    });

    // Reset bar/overlay on page show (handles back/forward cache)
    window.addEventListener('pageshow', function () {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        bar.style.transition = 'none';
        bar.style.width = '0%';
        setTimeout(function () {
            bar.style.transition = 'width 0.4s cubic-bezier(0.4,0,0.2,1)';
        }, 50);
    });
})();
