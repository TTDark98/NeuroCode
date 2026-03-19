/* ======================================
   NeuroCode — SPA Navigation & Theme Engine
   ====================================== */

document.addEventListener('DOMContentLoaded', () => {
    // ---- SPA Navigation ----
    const navLinks = document.querySelectorAll('[data-page]');
    const pageSections = document.querySelectorAll('.page-section');

    function navigateTo(pageName) {
        // Hide all page sections
        pageSections.forEach(section => {
            section.classList.remove('active');
        });

        // Show the target page
        const target = document.getElementById('page-' + pageName);
        if (target) {
            target.classList.add('active');
        }

        // Update nav link active states
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === pageName) {
                link.classList.add('active');
            }
        });
    }

    // Attach click handlers to all nav links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            if (page) {
                navigateTo(page);
            }
        });
    });

    // ---- Quick Action Links ----
    const quickActionLinks = document.querySelectorAll('[data-action-page]');
    quickActionLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-action-page');
            if (page) {
                navigateTo(page);
            }
        });
    });

    // ---- Theme Switching ----
    const themeSelector = document.getElementById('theme-selector');
    const html = document.documentElement;

    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);

        // Handle Dark/Light mode toggle for Tailwind
        if (theme === 'light-minimalist') {
            html.classList.remove('dark');
        } else {
            html.classList.add('dark');
        }

        // Custom style variations based on theme
        switch (theme) {
            case 'retro-pixel':
                html.style.setProperty('--primary-rgb', '51, 255, 0');
                html.style.setProperty('--bg-dark-rgb', '0, 0, 0');
                html.style.setProperty('--surface-dark-rgb', '17, 17, 17');
                html.style.setProperty('--border-dark-rgb', '51, 51, 51');
                break;
            case 'solarized-hacker':
                html.style.setProperty('--primary-rgb', '181, 137, 0');
                html.style.setProperty('--bg-dark-rgb', '0, 43, 54');
                html.style.setProperty('--surface-dark-rgb', '7, 54, 66');
                html.style.setProperty('--border-dark-rgb', '88, 110, 117');
                break;
            case 'light-minimalist':
                html.style.setProperty('--primary-rgb', '0, 122, 255');
                html.style.setProperty('--bg-dark-rgb', '245, 248, 248');
                html.style.setProperty('--surface-dark-rgb', '255, 255, 255');
                html.style.setProperty('--border-dark-rgb', '226, 232, 240');
                break;
            default:
                html.style.setProperty('--primary-rgb', '37, 244, 244');
                html.style.setProperty('--bg-dark-rgb', '10, 17, 17');
                html.style.setProperty('--surface-dark-rgb', '22, 37, 37');
                html.style.setProperty('--border-dark-rgb', '40, 57, 57');
        }
    }

    if (themeSelector) {
        const savedTheme = localStorage.getItem('neurocode-theme') || 'dark-futuristic';
        applyTheme(savedTheme);
        themeSelector.value = savedTheme;

        themeSelector.addEventListener('change', (e) => {
            const theme = e.target.value;
            applyTheme(theme);
            localStorage.setItem('neurocode-theme', theme);
        });
    }

    // ---- Default Page: Dashboard ----
    navigateTo('dashboard');
});
