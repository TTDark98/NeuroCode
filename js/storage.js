/* ======================================
   NeuroCode — Database & LocalStorage Persistence
   Save/load algorithm projects and user data from MariaDB backend.
   ====================================== */

import StateStore from './state.js';

const STORAGE_KEY = 'neurocode-projects';
const MAX_STORAGE_MB = 5; // localStorage limit ~5MB

const Storage = (() => {

    /**
     * Get all saved projects (API backend with localStorage fallback)
     * Returns array of { id, name, algorithm, inputData, code, timestamp }
     */
    async function listProjects() {
        const token = localStorage.getItem('token');
        if (!token) {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                const parsedRaw = raw ? JSON.parse(raw) : [];
                return parsedRaw.map(p => {
                    let steps = null;
                    let complexity = null;
                    if (p.steps) {
                        if (Array.isArray(p.steps)) {
                            steps = p.steps;
                        } else if (p.steps && typeof p.steps === 'object') {
                            steps = p.steps.steps || null;
                            complexity = p.steps.complexity || null;
                        }
                    }
                    return {
                        id: p.id,
                        name: p.name,
                        algorithm: p.algorithm,
                        inputData: p.inputData,
                        code: p.code,
                        steps: steps,
                        complexity: complexity || p.complexity || null,
                        timestamp: p.timestamp
                    };
                });
            } catch {
                return [];
            }
        }

        try {
            const response = await fetch('/api/projects', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch projects from server');
            }
            const dbProjects = await response.json();
            return dbProjects.map(p => {
                let steps = null;
                let complexity = null;
                if (p.steps_json) {
                    try {
                        const parsed = JSON.parse(p.steps_json);
                        if (Array.isArray(parsed)) {
                            steps = parsed;
                        } else if (parsed && typeof parsed === 'object') {
                            steps = parsed.steps || null;
                            complexity = parsed.complexity || null;
                        }
                    } catch (e) {
                        console.error("Error parsing steps_json:", e);
                    }
                }
                return {
                    id: p.id,
                    name: p.name,
                    algorithm: p.visualization_type,
                    inputData: p.input_data,
                    code: p.code,
                    steps: steps,
                    complexity: complexity,
                    timestamp: new Date(p.updated_at || p.created_at).getTime()
                };
            });
        } catch (e) {
            console.warn('Failed to load projects from backend, falling back to localStorage:', e);
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                const parsedRaw = raw ? JSON.parse(raw) : [];
                return parsedRaw.map(p => {
                    let steps = null;
                    let complexity = null;
                    if (p.steps) {
                        if (Array.isArray(p.steps)) {
                            steps = p.steps;
                        } else if (p.steps && typeof p.steps === 'object') {
                            steps = p.steps.steps || null;
                            complexity = p.steps.complexity || null;
                        }
                    }
                    return {
                        id: p.id,
                        name: p.name,
                        algorithm: p.algorithm,
                        inputData: p.inputData,
                        code: p.code,
                        steps: steps,
                        complexity: complexity || p.complexity || null,
                        timestamp: p.timestamp
                    };
                });
            } catch {
                return [];
            }
        }
    }

    /**
     * Save a project (upsert by name)
     */
    async function saveProject(name, { algorithm, inputData, code, steps, complexity }) {
        const projects = await listProjects();
        const existing = projects.findIndex(p => p.name === name);

        const project = {
            name,
            algorithm,
            inputData,
            code,
            steps: { steps, complexity },
            timestamp: Date.now(),
        };

        if (existing !== -1) {
            projects[existing] = project;
        } else {
            projects.unshift(project); // newest first
        }

        // Keep max 50 projects in cache
        if (projects.length > 50) projects.length = 50;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        } catch (e) {
            console.warn('Storage cache write failed:', e);
        }

        const token = localStorage.getItem('token');
        if (!token) return true; // Offline/local mode

        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    code,
                    input_data: inputData,
                    visualization_type: algorithm,
                    steps_json: steps ? JSON.stringify({ steps, complexity }) : null
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Server rejected project save');
            }

            document.dispatchEvent(new CustomEvent('user-stats-updated'));
            return true;
        } catch (e) {
            console.error('Backend save failed:', e);
            return true; // Return true as local cache save succeeded
        }
    }

    /**
     * Load a project by name
     */
    async function loadProject(name) {
        const projects = await listProjects();
        return projects.find(p => p.name === name) || null;
    }

    /**
     * Delete a project by name
     */
    async function deleteProject(name) {
        const projects = (await listProjects()).filter(p => p.name !== name);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        } catch (e) {
            console.warn('Failed to update localStorage after delete:', e);
        }

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch('/api/projects', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const dbProjects = await response.json();
                const matched = dbProjects.find(p => p.name === name);
                if (matched) {
                    await fetch(`/api/projects/${matched.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                }
            }
        } catch (e) {
            console.warn('Failed to delete project on backend:', e);
        }
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
     * Update dashboard stats with storage and DB run counts
     */
    async function updateDashboardStats() {
        const projects = await listProjects();
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

        // Update "Visualizations Run" and "Time Spent" stat from user profile on MariaDB
        const statRunsCount = document.querySelector('#stat-runs-count');
        const statTimeSpent = document.querySelector('#stat-time-spent');
        if (statRunsCount || statTimeSpent) {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const response = await fetch('/api/auth/verify', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        const userData = await response.json();
                        if (statRunsCount && userData && typeof userData.visualizer_runs !== 'undefined') {
                            statRunsCount.textContent = userData.visualizer_runs;
                        }
                        if (statTimeSpent && userData && typeof userData.time_spent !== 'undefined') {
                            const stateTime = StateStore.get('timeSpent');
                            const displayTime = (typeof stateTime !== 'undefined' && stateTime > userData.time_spent) ? stateTime : userData.time_spent;
                            statTimeSpent.textContent = formatTimeSpent(displayTime);
                        }
                    }
                } catch (e) {
                    console.warn('Failed to fetch user stats from server:', e);
                }
            }
        }

        // Update recent algorithms grid
        updateRecentAlgorithms(projects);
    }

    /**
     * Render recent projects into the dashboard grid
     */
    function updateRecentAlgorithms(projects) {
        const grid = document.getElementById('recent-algorithms');
        if (!grid) return;

        if (projects.length === 0) {
            grid.innerHTML = '<div class="glass-card p-4 text-center text-muted" style="grid-column: 1/-1;">No saved algorithms yet. Draw or generate one in the Studio!</div>';
            return;
        }

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
     * Helper: format active seconds spent to Xh Ym
     */
    function formatTimeSpent(seconds) {
        if (!seconds || seconds <= 0) return '0m';
        const mins = Math.floor(seconds / 60);
        const hrs = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        
        if (hrs > 0) {
            return `${hrs}h ${remainingMins}m`;
        }
        return `${mins}m`;
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
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Increment visualizer runs on backend
     */
    async function incrementRuns() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch('/api/users/increment-runs', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                const statRunsCount = document.querySelector('#stat-runs-count');
                if (statRunsCount && typeof data.visualizer_runs !== 'undefined') {
                    statRunsCount.textContent = data.visualizer_runs;
                }
                document.dispatchEvent(new CustomEvent('user-stats-updated'));
            }
        } catch (e) {
            console.warn('Failed to increment runs on backend:', e);
        }
    }

    /**
     * Fetch user contributions from server
     */
    async function getContributions() {
        const token = localStorage.getItem('token');
        if (!token) return { activities: [], active_days: 0 };
        try {
            const response = await fetch('/api/users/contributions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                return await response.json();
            }
            return { activities: [], active_days: 0 };
        } catch (e) {
            console.warn('Failed to fetch contributions:', e);
            return { activities: [], active_days: 0 };
        }
    }

    /**
     * Fetch user badges/achievements from server
     */
    async function getBadges() {
        const token = localStorage.getItem('token');
        if (!token) return [];
        try {
            const response = await fetch('/api/users/badges', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (e) {
            console.warn('Failed to fetch badges:', e);
            return [];
        }
    }

    /**
     * Fetch user streak details from server
     */
    async function getStreak() {
        const token = localStorage.getItem('token');
        if (!token) return { current_streak: 0, longest_streak: 0, last_activity_date: null };
        try {
            const response = await fetch('/api/users/streak', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                return await response.json();
            }
            return { current_streak: 0, longest_streak: 0, last_activity_date: null };
        } catch (e) {
            console.warn('Failed to fetch streak:', e);
            return { current_streak: 0, longest_streak: 0, last_activity_date: null };
        }
    }

    return {
        listProjects,
        saveProject,
        loadProject,
        deleteProject,
        getStorageUsage,
        updateDashboardStats,
        incrementRuns,
        getContributions,
        getBadges,
        getStreak
    };
})();

export default Storage;
