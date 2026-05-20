/* ======================================
   NeuroCode — localStorage Persistence
   Save/load algorithm projects and user data.
   ====================================== */

const STORAGE_KEY = 'neurocode-projects';
const MAX_STORAGE_MB = 5; // localStorage limit ~5MB

const Storage = (() => {

    /**
     * Get all saved projects
     * Returns array of { name, algorithm, inputData, code, timestamp }
     */
    function listProjects() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    /**
     * Save a project (upsert by name)
     */
    function saveProject(name, { algorithm, inputData, code }) {
        const projects = listProjects();
        const existing = projects.findIndex(p => p.name === name);

        const project = {
            name,
            algorithm,
            inputData,
            code,
            timestamp: Date.now(),
        };

        if (existing !== -1) {
            projects[existing] = project;
        } else {
            projects.unshift(project); // newest first
        }

        // Keep max 50 projects
        if (projects.length > 50) projects.length = 50;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
            return true;
        } catch (e) {
            console.warn('Storage save failed:', e);
            return false;
        }
    }

    /**
     * Load a project by name
     */
    function loadProject(name) {
        const projects = listProjects();
        return projects.find(p => p.name === name) || null;
    }

    /**
     * Delete a project by name
     */
    function deleteProject(name) {
        const projects = listProjects().filter(p => p.name !== name);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }

    /**
     * Get storage usage info
     */
    function getStorageUsage() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage.getItem(key).length * 2; // UTF-16 = 2 bytes per char
            }
        }
        const usedMB = total / (1024 * 1024);
        const percentage = Math.min(100, Math.round((usedMB / MAX_STORAGE_MB) * 100));
        return { usedMB: usedMB.toFixed(2), percentage };
    }

    /**
     * Update dashboard stats with storage info
     */
    function updateDashboardStats() {
        const projects = listProjects();
        const usage = getStorageUsage();

        // Update "Algorithms Created" stat
        const statAlgoCount = document.querySelector('#stat-algo-count');
        if (statAlgoCount) {
            statAlgoCount.textContent = projects.length;
        }

        // Update "Storage Used" stat
        const statStorage = document.querySelector('#stat-storage-value');
        if (statStorage) {
            statStorage.textContent = usage.percentage + '%';
        }

        const storageBar = document.querySelector('#stat-storage-bar');
        if (storageBar) {
            storageBar.style.width = usage.percentage + '%';
        }

        // Update recent algorithms grid
        updateRecentAlgorithms(projects);
    }

    /**
     * Render recent projects into the dashboard grid
     */
    function updateRecentAlgorithms(projects) {
        const grid = document.getElementById('recent-algorithms');
        if (!grid || projects.length === 0) return;

        // Clear existing cards and rebuild with real data
        grid.innerHTML = '';

        const gradients = ['card-gradient-primary', 'card-gradient-purple', 'card-gradient-orange', 'card-gradient-blue'];
        const icons = ['neurology', 'auto_awesome', 'shield', 'rocket_launch'];

        projects.slice(0, 4).forEach((project, i) => {
            const timeAgo = getTimeAgo(project.timestamp);
            const card = document.createElement('div');
            card.className = 'glass-card algorithm-card';
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <div class="card-image-wrapper">
                    <div class="${gradients[i % gradients.length]}" style="position: absolute; inset: 0;"></div>
                    <div class="card-icon-bg">
                        <span class="material-symbols-outlined text-primary">${icons[i % icons.length]}</span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="card-title-row">
                        <h5 class="card-title">${escapeHtml(project.name)}</h5>
                        <span class="badge badge-stable">Saved</span>
                    </div>
                    <p class="card-desc">${escapeHtml(project.algorithm || 'Custom Algorithm')}</p>
                    <div class="card-footer">
                        <span class="card-time">${timeAgo}</span>
                        <div class="avatar-group">
                            <div class="avatar-sm"></div>
                        </div>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                // Navigate to studio and load project
                const event = new CustomEvent('load-project', { detail: project });
                document.dispatchEvent(event);
            });

            grid.appendChild(card);
        });
    }

    /**
     * Helper: time ago string
     */
    function getTimeAgo(timestamp) {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return {
        listProjects,
        saveProject,
        loadProject,
        deleteProject,
        getStorageUsage,
        updateDashboardStats,
    };
})();

export default Storage;
