/**
 * MCS Mobile Sidebar System
 * Injects the mobile sidebar HTML and handles its open/close logic.
 */
(function () {
    // 1. Define the Sidebar HTML
    const sidebarHTML = `
        <!-- Mobile Sidebar Backdrop -->
        <div id="menu-backdrop" class="xl:hidden"
            style="position:fixed;inset:0;z-index:58;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity 0.4s ease;">
        </div>

        <!-- Mobile Sidebar Panel -->
        <div id="mobile-sidebar" class="xl:hidden flex flex-col"
            style="position:fixed;top:0;right:0;bottom:0;z-index:59;width:min(340px,88vw);background:linear-gradient(165deg,#0a2d2e 0%,#0F3D3E 40%,#0a2535 100%);transform:translateX(100%);transition:transform 0.45s cubic-bezier(0.4,0,0.2,1);overflow:hidden;overflow-y:auto;box-shadow:-10px 0 60px rgba(0,0,0,0.4);">
            
            <!-- Decorative orbs -->
            <div style="position:absolute;top:-60px;right:-60px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(198,167,94,0.12),transparent);pointer-events:none;"></div>
            <div style="position:absolute;bottom:-40px;left:-40px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,rgba(198,167,94,0.08),transparent);pointer-events:none;"></div>

            <!-- Sidebar Header: Logo + Close -->
            <div style="padding:1.5rem 1rem 1rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(198,167,94,0.15);position:relative;z-index:1;flex-shrink:0;">
                <a href="/index.html" style="display:flex;align-items:center;gap:0.5rem;text-decoration:none;">
                    <img src="/assets/transparent-logo.png" alt="Modern Calcutta School Patna Logo" style="height:2.25rem;width:auto;filter:brightness(1.2);">
                    <div style="min-width:0;">
                        <p style="font-family:'Cormorant Garamond',serif;font-size:0.75rem;font-weight:700;color:#fff;letter-spacing:0.05em;line-height:1.1;white-space:normal;word-break:break-word;">MODERN CALCUTTA</p>
                        <p style="font-size:0.5rem;color:#C6A75E;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px;">Foundation of Ilm-o-Adab</p>
                    </div>
                </a>
                <button id="mobile-menu-close" style="width:2.25rem;height:2.25rem;border-radius:50%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background 0.2s;flex-shrink:0;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>

            <!-- Nav Links -->
            <nav style="flex:1;padding:1rem 1rem;display:flex;flex-direction:column;gap:0.25rem;position:relative;z-index:1;overflow-y:auto;">
                <!-- Moving CTA near the top for better visibility -->
                <a href="/admissions.html" id="sidebar-cta-btn" class="sidebar-link"
                    style="display:flex;align-items:center;justify-content:center;gap:0.625rem;padding:0.875rem;border-radius:0.875rem;margin-bottom:0.75rem;background:linear-gradient(135deg,#C6A75E,#d4b76e);color:#0F3D3E;font-weight:700;font-size:0.85rem;text-decoration:none;letter-spacing:0.05em;text-transform:uppercase;opacity:0;transform:translateY(15px);box-shadow:0 8px 20px rgba(198,167,94,0.3);">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    ADMISSION NOW
                </a>
                
                <a href="/index.html" class="sidebar-link" style="display:flex;align-items:center;gap:0.875rem;padding:0.875rem 1rem;border-radius:0.875rem;color:rgba(255,255,255,0.8);text-decoration:none;transition:background 0.2s,color 0.2s;opacity:0;transform:translateX(30px);">
                    <div class="sidebar-icon" style="width:2.25rem;height:2.25rem;border-radius:0.625rem;background:rgba(198,167,94,0.12);border:1px solid rgba(198,167,94,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C6A75E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                    </div>
                    <span style="font-family:'Outfit',sans-serif;font-size:0.9rem;font-weight:600;letter-spacing:0.03em;">Home</span>
                </a>

                <a href="/about.html" class="sidebar-link" style="display:flex;align-items:center;gap:0.875rem;padding:0.875rem 1rem;border-radius:0.875rem;color:rgba(255,255,255,0.8);text-decoration:none;transition:background 0.2s,color 0.2s;opacity:0;transform:translateX(30px);">
                    <div class="sidebar-icon" style="width:2.25rem;height:2.25rem;border-radius:0.625rem;background:rgba(198,167,94,0.12);border:1px solid rgba(198,167,94,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C6A75E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                    </div>
                    <span style="font-family:'Outfit',sans-serif;font-size:0.9rem;font-weight:600;letter-spacing:0.03em;">About Us</span>
                </a>

                <a href="/academics.html" class="sidebar-link" style="display:flex;align-items:center;gap:0.875rem;padding:0.875rem 1rem;border-radius:0.875rem;color:rgba(255,255,255,0.8);text-decoration:none;transition:background 0.2s,color 0.2s;opacity:0;transform:translateX(30px);">
                    <div class="sidebar-icon" style="width:2.25rem;height:2.25rem;border-radius:0.625rem;background:rgba(198,167,94,0.12);border:1px solid rgba(198,167,94,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C6A75E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                    </div>
                    <span style="font-family:'Outfit',sans-serif;font-size:0.9rem;font-weight:600;letter-spacing:0.03em;">Academics</span>
                </a>

                <a href="/faith-values.html" class="sidebar-link" style="display:flex;align-items:center;gap:0.875rem;padding:0.875rem 1rem;border-radius:0.875rem;color:rgba(255,255,255,0.8);text-decoration:none;transition:background 0.2s,color 0.2s;opacity:0;transform:translateX(30px);">
                    <div class="sidebar-icon" style="width:2.25rem;height:2.25rem;border-radius:0.625rem;background:rgba(198,167,94,0.12);border:1px solid rgba(198,167,94,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C6A75E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                    </div>
                    <span style="font-family:'Outfit',sans-serif;font-size:0.9rem;font-weight:600;letter-spacing:0.03em;">Faith & Values</span>
                </a>

                <a href="/gallery.html" class="sidebar-link" style="display:flex;align-items:center;gap:0.875rem;padding:0.875rem 1rem;border-radius:0.875rem;color:rgba(255,255,255,0.8);text-decoration:none;transition:background 0.2s,color 0.2s;opacity:0;transform:translateX(30px);">
                    <div class="sidebar-icon" style="width:2.25rem;height:2.25rem;border-radius:0.625rem;background:rgba(198,167,94,0.12);border:1px solid rgba(198,167,94,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C6A75E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    </div>
                    <span style="font-family:'Outfit',sans-serif;font-size:0.9rem;font-weight:600;letter-spacing:0.03em;">Gallery</span>
                </a>

                <a href="/student-portal.html" class="sidebar-link" style="display:flex;align-items:center;gap:0.875rem;padding:0.875rem 1rem;border-radius:0.875rem;color:rgba(255,255,255,0.8);text-decoration:none;transition:background 0.2s,color 0.2s;opacity:0;transform:translateX(30px);">
                    <div class="sidebar-icon" style="width:2.25rem;height:2.25rem;border-radius:0.625rem;background:rgba(198,167,94,0.12);border:1px solid rgba(198,167,94,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C6A75E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    </div>
                    <span style="font-family:'Outfit',sans-serif;font-size:0.85rem;font-weight:600;letter-spacing:0.02em;">Students Portal</span>
                </a>
            </nav>

            <!-- Bottom Location Info -->
            <div style="padding:1rem 1.5rem;border-top:1px solid rgba(198,167,94,0.15);position:relative;z-index:1;flex-shrink:0;">
                <p style="text-align:center;font-size:0.65rem;color:rgba(255,255,255,0.3);letter-spacing:0.1em;text-transform:uppercase;">
                    Phulwarisharif, Patna
                </p>
            </div>
        </div>
    `;

    // 2. Inject HTML
    function injectSidebar() {
        if (!document.getElementById('mobile-sidebar')) {
            const container = document.createElement('div');
            container.innerHTML = sidebarHTML;
            document.body.appendChild(container);
            bindEvents();
        }
    }

    // 3. Logic
    function bindEvents() {
        const mobileMenu = document.getElementById('mobile-sidebar');
        const menuBackdrop = document.getElementById('menu-backdrop');
        const mobileMenuClose = document.getElementById('mobile-menu-close');
        const mobileNavLinks = document.querySelectorAll('.sidebar-link');

        // Find hamburger buttons across different pages (by ID or class depending on page)
        const menuButtons = document.querySelectorAll('#mobile-menu-button, .mobile-menu-toggle, header button.md\\:hidden');

        function openSidebar() {
            if (!mobileMenu) return;
            mobileMenu.style.transform = 'translateX(0)';
            if (menuBackdrop) { menuBackdrop.style.opacity = '1'; menuBackdrop.style.pointerEvents = 'auto'; }
            document.body.style.overflow = 'hidden';

            // Stagger links
            mobileNavLinks.forEach((link, i) => {
                setTimeout(() => {
                    link.style.transition = 'all 0.35s cubic-bezier(0.4,0,0.2,1)';
                    link.style.opacity = '1';
                    if (link.id === 'sidebar-cta-btn') {
                        link.style.transform = 'translateY(0)';
                    } else {
                        link.style.transform = 'translateX(0)';
                    }
                }, 100 + i * 50);
            });
        }

        function closeSidebar() {
            if (!mobileMenu) return;
            mobileMenu.style.transform = 'translateX(100%)';
            if (menuBackdrop) { menuBackdrop.style.opacity = '0'; menuBackdrop.style.pointerEvents = 'none'; }
            document.body.style.overflow = '';

            setTimeout(() => {
                mobileNavLinks.forEach(link => {
                    link.style.transition = 'none';
                    link.style.opacity = '0';
                    if (link.id === 'sidebar-cta-btn') {
                        link.style.transform = 'translateY(15px)';
                    } else {
                        link.style.transform = 'translateX(30px)';
                    }
                });
            }, 450);
        }

        menuButtons.forEach(btn => btn.addEventListener('click', (e) => {
            e.preventDefault();
            // If the header has its own basic dropdown, prevent it from opening
            const nextEl = btn.nextElementSibling;
            if (nextEl && nextEl.classList.contains('md:hidden') && !nextEl.id) {
                nextEl.classList.add('hidden'); // Hide simple inline mobile nav if exists
            }
            openSidebar();
        }));

        if (mobileMenuClose) mobileMenuClose.addEventListener('click', closeSidebar);
        if (menuBackdrop) menuBackdrop.addEventListener('click', closeSidebar);
        // Do not auto-close on CTA click unless we are navigating internally (already handled by transition system mostly, but safe to close)
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectSidebar);
    } else {
        injectSidebar();
    }
})();
