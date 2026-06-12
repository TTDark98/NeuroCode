/* ======================================
   NeuroCode — Main Orchestrator
   Imports all modules, manages SPA navigation,
   theme switching, and wires everything together.
   ====================================== */

import StateStore from './state.js';
import { ALGORITHMS, runAlgorithm } from './algorithms.js';
import Visualizer from './visualizer.js';
import Player from './player.js';
import Parser from './parser.js';
import Storage from './storage.js';
import Assistant from './assistant.js';
import AIGenerator from './ai-generator.js';

document.addEventListener('DOMContentLoaded', () => {
    // ═══════════════════════════════════════
    // SESSION & AUTHENTICATION GUARD
    // ═══════════════════════════════════════
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = './login.html';
        return; // stop execution
    }

    // Verify token validity with backend
    fetch('/api/auth/verify', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = './login.html';
        } else {
            loadDeveloperStats().catch(err => console.error(err));
        }
    })
    .catch(err => {
        console.error('Session verification connection error:', err);
    });

    // Display user profile in UI
    const userJson = localStorage.getItem('user');
    if (userJson) {
        try {
            const currentUser = JSON.parse(userJson);
            if (currentUser && currentUser.email) {
                const welcomeTitle = document.querySelector('.welcome-title');
                if (welcomeTitle) {
                    const displayName = currentUser.name || currentUser.email.split('@')[0];
                    const capitalizedUser = displayName.charAt(0).toUpperCase() + displayName.slice(1);
                    welcomeTitle.textContent = `Welcome back, ${capitalizedUser}.`;
                }
            }
        } catch (e) {
            console.error('Error parsing user profile:', e);
        }
    }

    // Setup User Profile dropdown menu toggle
    const avatarTrigger = document.getElementById('user-avatar-trigger');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    if (avatarTrigger && profileDropdown) {
        avatarTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const visible = profileDropdown.style.display === 'flex';
            profileDropdown.style.display = visible ? 'none' : 'flex';
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            profileDropdown.style.display = 'none';
        });
    }

    // Logout via dropdown item
    const btnLogoutDropdown = document.getElementById('btn-logout-dropdown');
    if (btnLogoutDropdown) {
        btnLogoutDropdown.style.cursor = 'pointer';
        btnLogoutDropdown.addEventListener('click', () => {
            if (confirm('Are you sure you want to sign out?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = './login.html';
            }
        });
    }

    // Sync header avatar and user details on load
    if (token) {
        fetch('/api/auth/verify', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.ok ? res.json() : null)
        .then(userData => {
            if (userData) {
                localStorage.setItem('user', JSON.stringify(userData));
                
                const welcomeTitle = document.querySelector('.welcome-title');
                if (welcomeTitle) {
                    const displayName = userData.name || userData.email.split('@')[0];
                    const capitalizedUser = displayName.charAt(0).toUpperCase() + displayName.slice(1);
                    welcomeTitle.textContent = `Welcome back, ${capitalizedUser}.`;
                }

                if (userData.avatar) {
                    const headerAvatarImg = document.getElementById('header-avatar-img');
                    if (headerAvatarImg) headerAvatarImg.src = userData.avatar;
                }
            }
        })
        .catch(err => console.warn('Header avatar sync failed:', err));
    }

    // ═══════════════════════════════════════
    // SPA NAVIGATION (preserved from app.js)
    // ═══════════════════════════════════════
    const navLinks = document.querySelectorAll('[data-page]');
    const pageSections = document.querySelectorAll('.page-section');

    function navigateTo(pageName) {
        const current = document.querySelector('.page-section.active');
        const target = document.getElementById('page-' + pageName);

        if (!target || target === current) return;

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === pageName) {
                link.classList.add('active');
            }
        });

        if (current) {
            current.classList.remove('active');
            current.classList.add('is-leaving');

            const onLeaveEnd = () => {
                current.removeEventListener('animationend', onLeaveEnd);
                current.classList.remove('is-leaving');
                current.style.display = 'none';

                target.style.display = '';
                target.classList.add('active');
            };

            current.addEventListener('animationend', onLeaveEnd);
        } else {
            target.classList.add('active');
        }

        // Update dashboard stats when navigating to dashboard
        if (pageName === 'dashboard') {
            Storage.updateDashboardStats();
        }
    }

    // Nav link click handlers
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            if (page) navigateTo(page);
        });
    });

    // Quick action links
    document.querySelectorAll('[data-action-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-action-page');
            if (page) navigateTo(page);
        });
    });

    // ═══════════════════════════════════════
    // THEME SWITCHING (preserved from app.js)
    // ═══════════════════════════════════════
    const themeSelector = document.getElementById('theme-selector');
    const html = document.documentElement;

    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);

        if (theme === 'light-minimalist' || theme === 'neuro-blush') {
            html.classList.remove('dark');
        } else {
            html.classList.add('dark');
        }

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
            case 'neuro-blush':
                html.style.setProperty('--primary-rgb', '236, 72, 153');
                html.style.setProperty('--bg-dark-rgb', '255, 245, 250');
                html.style.setProperty('--surface-dark-rgb', '255, 228, 240');
                html.style.setProperty('--border-dark-rgb', '251, 182, 213');
                html.style.setProperty('--background-light', '#fff5fa');
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

    // ═══════════════════════════════════════
    // ACTIVE TIME SPENT TRACKING
    // ═══════════════════════════════════════
    let totalSecondsSpent = 0;
    
    // Fetch initial time_spent on load
    const initialToken = localStorage.getItem('token');
    if (initialToken) {
        fetch('/api/auth/verify', {
            headers: { 'Authorization': `Bearer ${initialToken}` }
        })
        .then(res => res.ok ? res.json() : null)
        .then(userData => {
            if (userData && typeof userData.time_spent !== 'undefined') {
                totalSecondsSpent = userData.time_spent;
                StateStore.set('timeSpent', totalSecondsSpent);
                updateTimeSpentUI();
            }
        })
        .catch(err => console.warn('Failed to get initial time spent:', err));
    }

    function updateTimeSpentUI() {
        const statTimeSpent = document.querySelector('#stat-time-spent');
        if (statTimeSpent) {
            const mins = Math.floor(totalSecondsSpent / 60);
            const hrs = Math.floor(mins / 60);
            const remainingMins = mins % 60;
            if (hrs > 0) {
                statTimeSpent.textContent = `${hrs}h ${remainingMins}m`;
            } else {
                statTimeSpent.textContent = `${mins}m`;
            }
        }
    }

    // Local ticker: Increment locally every second and update UI
    setInterval(() => {
        totalSecondsSpent += 1;
        StateStore.set('timeSpent', totalSecondsSpent);
        // Only update UI if the page is currently active and it's the dashboard
        const activePage = document.querySelector('.page-section.active');
        if (activePage && activePage.id === 'page-dashboard') {
            updateTimeSpentUI();
        }
    }, 1000);

    // Sync ticker: Send interval increments to backend database every 30 seconds
    setInterval(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        fetch('/api/users/increment-time', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ seconds: 30 })
        })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            if (data && typeof data.time_spent !== 'undefined') {
                // Sync local count with server count to prevent drifts
                totalSecondsSpent = data.time_spent;
                StateStore.set('timeSpent', totalSecondsSpent);
            }
        })
        .catch(err => console.warn('Time heartbeat sync failed:', err));
    }, 30000);

    // ═══════════════════════════════════════
    // INITIALIZE MODULES
    // ═══════════════════════════════════════
    Visualizer.init();
    Player.init();
    Assistant.init();

    // ═══════════════════════════════════════
    // CODE EDITOR
    // ═══════════════════════════════════════
    const codeTextarea = document.getElementById('code-editor');
    const codeHighlight = document.getElementById('code-highlight');
    const lineNumbersEl = document.getElementById('line-numbers');
    const codeSelect = document.getElementById('code-file-select');

    async function rebuildSavedAlgorithmsSelect() {
        if (!codeSelect) return;

        // Remove any existing saved project options
        const toRemove = [];
        for (let i = 0; i < codeSelect.options.length; i++) {
            const opt = codeSelect.options[i];
            if (opt.value.startsWith('saved:') || opt.classList.contains('saved-projects-header')) {
                toRemove.push(opt);
            }
        }
        toRemove.forEach(opt => opt.remove());

        // Get saved projects
        try {
            const projects = await Storage.listProjects();
            if (projects && projects.length > 0) {
                // Add a divider option
                const optGroup = document.createElement('option');
                optGroup.disabled = true;
                optGroup.value = "";
                optGroup.textContent = "── Saved Algorithms ──";
                optGroup.className = "saved-projects-header";
                codeSelect.appendChild(optGroup);

                projects.forEach(proj => {
                    const opt = document.createElement('option');
                    opt.value = `saved:${proj.name}`;
                    opt.textContent = `${proj.name} (${proj.algorithm || 'custom'})`;
                    codeSelect.appendChild(opt);
                });
            }
        } catch (e) {
            console.error('Error rebuilding saved algorithms select:', e);
        }
    }

    // Initial rebuild on load
    rebuildSavedAlgorithmsSelect();

    /**
     * Update syntax highlighting and line numbers
     */
    function updateCodeDisplay() {
        if (!codeTextarea || !codeHighlight) return;

        const code = codeTextarea.value;
        codeHighlight.innerHTML = Parser.highlightCode(code);
        StateStore.set('editorCode', code);

        // Update line numbers
        const lineCount = code.split('\n').length;
        if (lineNumbersEl) {
            lineNumbersEl.innerHTML = Parser.generateLineNumbers(lineCount);
        }
    }

    /**
     * Load algorithm code into editor
     */
    function loadAlgorithmToEditor(algorithmKey) {
        const algo = ALGORITHMS[algorithmKey];
        if (!algo || !codeTextarea) return;

        codeTextarea.value = algo.code;
        updateCodeDisplay();

        StateStore.set('currentAlgorithm', algorithmKey);
        StateStore.set('loadedProject', null);

        // Update visualization type
        if (algo.type === 'graph') {
            StateStore.set('visualizationType', 'graph');
        } else if (algo.type === 'linkedlist') {
            StateStore.set('visualizationType', 'linkedlist');
        } else {
            StateStore.set('visualizationType', 'bars');
        }

        // Update code selector display
        if (codeSelect) {
            const reverseMapping = {
                'bubbleSort': 'BubbleSort.cpp',
                'selectionSort': 'SelectionSort.cpp',
                'mergeSort': 'MergeSort.cpp',
                'quickSort': 'QuickSort.cpp',
                'binarySearch': 'BinarySearch.cpp',
                'linkedListInsert': 'LinkedListInsert.cpp',
                'linkedListDelete': 'LinkedListDelete.cpp',
                'bfs': 'BFS.cpp',
                'dfs': 'DFS.cpp',
            };
            codeSelect.value = reverseMapping[algorithmKey] || 'new';
        }

        // Load default data into playground
        updatePlaygroundForAlgorithm(algorithmKey);
    }

    if (codeTextarea) {
        codeTextarea.addEventListener('input', updateCodeDisplay);

        // Sync scrolling between textarea and highlight overlay
        codeTextarea.addEventListener('scroll', () => {
            if (codeHighlight) {
                codeHighlight.scrollTop = codeTextarea.scrollTop;
                codeHighlight.scrollLeft = codeTextarea.scrollLeft;
            }
            if (lineNumbersEl) {
                lineNumbersEl.scrollTop = codeTextarea.scrollTop;
            }
        });

        // Tab key support in textarea
        codeTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = codeTextarea.selectionStart;
                const end = codeTextarea.selectionEnd;
                codeTextarea.value = codeTextarea.value.substring(0, start) + '    ' + codeTextarea.value.substring(end);
                codeTextarea.selectionStart = codeTextarea.selectionEnd = start + 4;
                updateCodeDisplay();
            }
        });
    }

    function updateDeleteButtonVisibility() {
        const btnDelete = document.getElementById('btn-delete-project');
        if (!btnDelete) return;
        if (codeSelect && codeSelect.value && codeSelect.value.startsWith('saved:')) {
            btnDelete.style.display = 'inline-flex';
        } else {
            btnDelete.style.display = 'none';
        }
    }

    // Code file selector change
    if (codeSelect) {
        codeSelect.addEventListener('change', () => {
            const val = codeSelect.value;
            
            if (val === 'new') {
                if (codeTextarea) {
                    codeTextarea.value = '';
                    updateCodeDisplay();
                }
                if (playgroundInput) {
                    playgroundInput.value = '';
                    if (playgroundLabel) playgroundLabel.textContent = 'Custom Input';
                }
                const searchTargetGroup = document.getElementById('search-target-group');
                if (searchTargetGroup) searchTargetGroup.style.display = 'none';
                
                StateStore.set('currentAlgorithm', null);
                StateStore.set('steps', []);
                StateStore.set('loadedProject', null);
                
                const canvasEl = document.getElementById('visualizer-canvas');
                if (canvasEl) canvasEl.innerHTML = '';
                
                updateDeleteButtonVisibility();
                return;
            }

            if (val && val.startsWith('saved:')) {
                const projectName = val.substring(6);
                Storage.loadProject(projectName).then(proj => {
                    if (!proj) return;
                    if (codeTextarea) {
                        codeTextarea.value = proj.code || '';
                        updateCodeDisplay();
                    }
                    if (playgroundInput) {
                        playgroundInput.value = proj.inputData || '';
                        const playgroundLabel = document.getElementById('playground-input-label');
                        if (playgroundLabel) playgroundLabel.textContent = proj.algorithm || 'Custom Algorithm';
                    }
                    
                    StateStore.set('currentAlgorithm', proj.algorithm || 'custom');
                    StateStore.set('loadedProject', proj);
                    
                    if (proj.complexity) {
                        StateStore.set('complexity', proj.complexity);
                    } else {
                        const complexityMapping = {
                            'bubbleSort': { time: 'O(N^2)', space: 'O(1)' },
                            'selectionSort': { time: 'O(N^2)', space: 'O(1)' },
                            'mergeSort': { time: 'O(N log N)', space: 'O(N)' },
                            'quickSort': { time: 'O(N log N)', space: 'O(log N)' },
                            'binarySearch': { time: 'O(log N)', space: 'O(1)' },
                            'linkedListInsert': { time: 'O(N)', space: 'O(1)' },
                            'linkedListDelete': { time: 'O(N)', space: 'O(1)' },
                            'bfs': { time: 'O(V + E)', space: 'O(V)' },
                            'dfs': { time: 'O(V + E)', space: 'O(V)' },
                        };
                        const complexity = complexityMapping[proj.algorithm] || { time: '—', space: '—' };
                        StateStore.set('complexity', complexity);
                    }

                    const isLinkedList = proj.algorithm === 'linkedlist' || ['linkedListInsert', 'linkedListDelete'].includes(proj.algorithm);
                    StateStore.set('visualizationType', proj.algorithm === 'graph' ? 'graph' : (isLinkedList ? 'linkedlist' : 'bars'));
                    
                    if (proj.steps && proj.steps.length > 0) {
                        StateStore.set('steps', proj.steps);
                        StateStore.set('currentStep', 0);
                    } else {
                        StateStore.set('steps', []);
                        StateStore.set('currentStep', 0);
                        const canvasEl = document.getElementById('visualizer-canvas');
                        if (canvasEl) canvasEl.innerHTML = '';
                    }
                    updateDeleteButtonVisibility();
                });
                return;
            }

            // Map select options to algorithm keys
            const mapping = {
                'BubbleSort.cpp': 'bubbleSort',
                'SelectionSort.cpp': 'selectionSort',
                'MergeSort.cpp': 'mergeSort',
                'QuickSort.cpp': 'quickSort',
                'BinarySearch.cpp': 'binarySearch',
                'LinkedListInsert.cpp': 'linkedListInsert',
                'LinkedListDelete.cpp': 'linkedListDelete',
                'BFS.cpp': 'bfs',
                'DFS.cpp': 'dfs',
            };
            const algoKey = mapping[val];
            if (algoKey) loadAlgorithmToEditor(algoKey);
            updateDeleteButtonVisibility();
        });
    }

    // Delete project button listener
    const btnDeleteProject = document.getElementById('btn-delete-project');
    if (btnDeleteProject) {
        btnDeleteProject.addEventListener('click', async () => {
            const val = codeSelect.value;
            if (!val || !val.startsWith('saved:')) return;
            const projectName = val.substring(6);

            if (confirm(`Are you sure you want to delete the saved algorithm "${projectName}"?`)) {
                await Storage.deleteProject(projectName);
                showToast(`Saved algorithm "${projectName}" deleted!`);
                
                if (codeSelect) codeSelect.value = 'new';
                if (codeTextarea) codeTextarea.value = '';
                updateCodeDisplay();
                if (playgroundInput) playgroundInput.value = '';
                
                StateStore.setMany({
                    currentAlgorithm: null,
                    steps: [],
                    loadedProject: null,
                    currentStep: 0
                });
                const canvasEl = document.getElementById('visualizer-canvas');
                if (canvasEl) canvasEl.innerHTML = '';

                await rebuildSavedAlgorithmsSelect();
                await Storage.updateDashboardStats();
                updateDeleteButtonVisibility();
            }
        });
    }

    // ═══════════════════════════════════════
    // PLAYGROUND INPUT
    // ═══════════════════════════════════════
    const playgroundInput = document.getElementById('playground-input');
    const playgroundLabel = document.getElementById('playground-label');
    const searchTargetInput = document.getElementById('search-target-input');
    const searchTargetGroup = document.getElementById('search-target-group');

    function updatePlaygroundForAlgorithm(algorithmKey) {
        const algo = ALGORITHMS[algorithmKey];
        if (!algo || !playgroundInput) return;

        if (algo.type === 'graph') {
            playgroundInput.placeholder = 'Enter edges: 0-1, 0-2, 1-3, 1-4, 2-5, 4-5';
            const edges = [];
            const adj = algo.defaultData;
            const seen = new Set();
            for (const [node, neighbors] of Object.entries(adj)) {
                for (const n of neighbors) {
                    const key = [Math.min(+node, n), Math.max(+node, n)].join('-');
                    if (!seen.has(key)) {
                        seen.add(key);
                        edges.push(key);
                    }
                }
            }
            playgroundInput.value = edges.join(', ');
            if (playgroundLabel) playgroundLabel.textContent = 'Graph Edges';
        } else if (algo.type === 'searching') {
            playgroundInput.placeholder = 'Enter sorted array: 3, 8, 12, 18, 25, 32';
            playgroundInput.value = algo.defaultData.join(', ');
            if (playgroundLabel) playgroundLabel.textContent = 'Sorted Array';
        } else if (algo.type === 'linkedlist') {
            playgroundInput.placeholder = 'Enter node values: 10, 20, 30, 40';
            playgroundInput.value = algo.defaultData.join(', ');
            if (playgroundLabel) playgroundLabel.textContent = 'Linked List Nodes';
        } else {
            playgroundInput.placeholder = 'Enter array values: 45, 12, 56, 32, 8, 41';
            playgroundInput.value = algo.defaultData.join(', ');
            if (playgroundLabel) playgroundLabel.textContent = 'Array Values';
        }

        // Show/hide search target
        if (searchTargetGroup) {
            const isTargetNeeded = algo.type === 'searching' || algo.type === 'linkedlist';
            searchTargetGroup.style.display = isTargetNeeded ? 'flex' : 'none';
            if (searchTargetInput && isTargetNeeded) {
                const targetLabel = searchTargetGroup.querySelector('.playground-input-label');
                if (algorithmKey === 'linkedListInsert') {
                    if (targetLabel) targetLabel.textContent = 'Val, Index';
                    searchTargetInput.type = 'text';
                    searchTargetInput.placeholder = 'val, idx';
                    searchTargetInput.value = '25, 2';
                } else if (algorithmKey === 'linkedListDelete') {
                    if (targetLabel) targetLabel.textContent = 'Delete Index';
                    searchTargetInput.type = 'number';
                    searchTargetInput.placeholder = 'index';
                    searchTargetInput.value = '2';
                } else {
                    if (targetLabel) targetLabel.textContent = 'Target';
                    searchTargetInput.type = 'number';
                    searchTargetInput.placeholder = 'Target value';
                    const data = algo.defaultData;
                    searchTargetInput.value = data[Math.floor(Math.random() * data.length)];
                }
            }
        }
    }

    // ═══════════════════════════════════════
    // AI MODEL SELECTOR
    // ═══════════════════════════════════════
    const aiModelSelect = document.getElementById('ai-model-select');
    const aiApiKeyInput = document.getElementById('ai-api-key');
    const aiNvidiaKeyInput = document.getElementById('ai-nvidia-key');
    const aiProviderSelect = document.getElementById('ai-provider-select');
    const aiOllamaUrlInput = document.getElementById('ai-ollama-url');

    function updateProviderUI() {
        const prov = AIGenerator.getProvider();
        const ollamaGroup = document.getElementById('settings-ollama-group');
        const geminiGroup = document.getElementById('settings-gemini-group');
        const nvidiaGroup = document.getElementById('settings-nvidia-group');
        if (ollamaGroup) ollamaGroup.style.display = prov === 'ollama' ? 'block' : 'none';
        if (geminiGroup) geminiGroup.style.display = prov === 'gemini' ? 'block' : 'none';
        if (nvidiaGroup) nvidiaGroup.style.display = prov === 'nvidia' ? 'block' : 'none';
    }

    // Provider toggle
    if (aiProviderSelect) {
        aiProviderSelect.value = AIGenerator.getProvider();
        aiProviderSelect.addEventListener('change', () => {
            AIGenerator.setProvider(aiProviderSelect.value);
            updateProviderUI();
            initAiModelDropdown();
        });
    }

    // Ollama URL
    if (aiOllamaUrlInput) {
        aiOllamaUrlInput.value = AIGenerator.getOllamaUrl();
        aiOllamaUrlInput.addEventListener('change', () => {
            AIGenerator.setOllamaUrl(aiOllamaUrlInput.value.trim());
            initAiModelDropdown();
        });
    }

    // Gemini API key
    let geminiKeyTimeout;
    if (aiApiKeyInput) {
        aiApiKeyInput.value = AIGenerator.getApiKey() || '';
        aiApiKeyInput.addEventListener('input', () => {
            clearTimeout(geminiKeyTimeout);
            geminiKeyTimeout = setTimeout(() => {
                if (aiApiKeyInput.value.trim() !== '') {
                    initAiModelDropdown();
                }
            }, 800);
        });
    }

    // NVIDIA API key
    let nvidiaKeyTimeout;
    if (aiNvidiaKeyInput) {
        aiNvidiaKeyInput.value = AIGenerator.getNvidiaApiKey() || '';
        aiNvidiaKeyInput.addEventListener('input', () => {
            clearTimeout(nvidiaKeyTimeout);
            nvidiaKeyTimeout = setTimeout(() => {
                if (aiNvidiaKeyInput.value.trim() !== '') {
                    initAiModelDropdown();
                }
            }, 800);
        });
    }

    async function initAiModelDropdown() {
        if (!aiModelSelect) return;

        const prov = AIGenerator.getProvider();
        if (prov === 'gemini' && !AIGenerator.getApiKey()) return;
        if (prov === 'nvidia' && !AIGenerator.getNvidiaApiKey()) return;

        aiModelSelect.innerHTML = '<option value="">Loading...</option>';

        try {
            const models = await AIGenerator.fetchAvailableModels();
            if (models.length > 0) {
                aiModelSelect.innerHTML = '';
                const currentModel = AIGenerator.getModel();

                models.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m;
                    opt.textContent = m;
                    if (m === currentModel) opt.selected = true;
                    aiModelSelect.appendChild(opt);
                });

                // If current model wasn't in the list, select the first one
                if (!models.includes(currentModel) && models.length > 0) {
                    AIGenerator.setModel(models[0]);
                }
            } else {
                aiModelSelect.innerHTML = '<option value="">No models found</option>';
            }
        } catch (e) {
            console.error("Failed to init AI models:", e);
            aiModelSelect.innerHTML = '<option value="">Error loading</option>';
        }
    }

    if (aiModelSelect) {
        aiModelSelect.addEventListener('change', () => {
            AIGenerator.setModel(aiModelSelect.value);
            showToast(`AI Model set to ${aiModelSelect.value}`);
        });
    }

    // Initialize on load
    updateProviderUI();
    initAiModelDropdown();

    // ═══════════════════════════════════════
    // SETTINGS MODAL INTERACTION
    // ═══════════════════════════════════════
    const settingsModal = document.getElementById('settings-modal');
    const btnSettingsToggle = document.getElementById('btn-settings-toggle');
    const btnSettingsClose = document.getElementById('btn-settings-close');
    const btnSettingsSave = document.getElementById('btn-settings-save');

    function openSettingsModal() {
        if (settingsModal) {
            settingsModal.style.display = 'flex';
            requestAnimationFrame(() => {
                settingsModal.classList.add('open');
            });
        }
    }

    function closeSettingsModal() {
        if (settingsModal) {
            settingsModal.classList.remove('open');
            const onTransitionEnd = (e) => {
                if (e.target === settingsModal) {
                    settingsModal.style.display = 'none';
                    settingsModal.removeEventListener('transitionend', onTransitionEnd);
                }
            };
            settingsModal.addEventListener('transitionend', onTransitionEnd);
        }
    }

    if (btnSettingsToggle) {
        btnSettingsToggle.addEventListener('click', openSettingsModal);
    }

    if (btnSettingsClose) {
        btnSettingsClose.addEventListener('click', closeSettingsModal);
    }

    if (btnSettingsSave) {
        btnSettingsSave.addEventListener('click', () => {
            // Save settings explicitly (the inputs already trigger changes, but this forces it)
            if (aiApiKeyInput) {
                const key = aiApiKeyInput.value.trim();
                if (key) {
                    localStorage.setItem('neurocode-gemini-key', key);
                } else {
                    localStorage.removeItem('neurocode-gemini-key');
                }
            }
            if (aiNvidiaKeyInput) {
                const key = aiNvidiaKeyInput.value.trim();
                if (key) {
                    localStorage.setItem('neurocode-nvidia-key', key);
                } else {
                    localStorage.removeItem('neurocode-nvidia-key');
                }
            }
            initAiModelDropdown();
            showToast('Settings saved!');
            closeSettingsModal();
        });
    }

    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                closeSettingsModal();
            }
        });
    }

    // ═══════════════════════════════════════
    // AI ARCHITECT LOGIC
    // ═══════════════════════════════════════
    const architectPrompt = document.getElementById('architect-prompt');
    const btnArchitectGenerate = document.getElementById('btn-architect-generate');
    const btnArchitectExplain = document.getElementById('btn-architect-explain');
    const btnArchitectSend = document.getElementById('btn-architect-send');
    const architectCodePreview = document.getElementById('architect-code-preview');
    const architectCodeHighlight = document.getElementById('architect-code-highlight');
    const architectLineNumbers = document.getElementById('architect-line-numbers');

    function updateArchitectCodeDisplay() {
        if (!architectCodePreview || !architectCodeHighlight) return;

        const code = architectCodePreview.value;
        architectCodeHighlight.innerHTML = Parser.highlightCode(code);

        // Update line numbers
        const lineCount = code.split('\n').length;
        if (architectLineNumbers) {
            architectLineNumbers.innerHTML = Parser.generateLineNumbers(lineCount);
        }
    }

    if (architectCodePreview) {
        // Sync scrolling
        architectCodePreview.addEventListener('scroll', () => {
            if (architectCodeHighlight) {
                architectCodeHighlight.scrollTop = architectCodePreview.scrollTop;
                architectCodeHighlight.scrollLeft = architectCodePreview.scrollLeft;
            }
            if (architectLineNumbers) {
                architectLineNumbers.scrollTop = architectCodePreview.scrollTop;
            }
        });

        // Update highlight and toggle send button on typing/pasting
        architectCodePreview.addEventListener('input', () => {
            updateArchitectCodeDisplay();
            if (btnArchitectSend) {
                btnArchitectSend.disabled = !architectCodePreview.value.trim();
            }
        });
    }

    if (btnArchitectGenerate) {
        btnArchitectGenerate.addEventListener('click', async () => {
            if (!architectPrompt || !architectPrompt.value.trim()) {
                showToast('Please enter pseudocode or description first!');
                return;
            }

            const promptStr = architectPrompt.value;
            const originalHtml = btnArchitectGenerate.innerHTML;

            // Loading state
            btnArchitectGenerate.innerHTML = `<span class="material-symbols-outlined spin" style="font-size: 0.875rem; animation: spin 1s linear infinite;">autorenew</span> Generating...`;
            btnArchitectGenerate.disabled = true;
            if (btnArchitectSend) btnArchitectSend.disabled = true;

            try {
                const generatedCode = await AIGenerator.generateCodeFromPrompt(promptStr);
                if (architectCodePreview) {
                    architectCodePreview.value = generatedCode;
                    updateArchitectCodeDisplay();
                }
                if (btnArchitectSend) {
                    btnArchitectSend.disabled = false;
                }
                showToast('Code generated successfully!');
            } catch (err) {
                showToast(err.message || 'Error generating code.');
            } finally {
                btnArchitectGenerate.innerHTML = originalHtml;
                btnArchitectGenerate.disabled = false;
            }
        });
    }

    if (btnArchitectExplain) {
        btnArchitectExplain.addEventListener('click', async () => {
            if (!architectCodePreview || !architectCodePreview.value.trim()) {
                showToast('Please enter some code to reverse first!');
                return;
            }

            const codeStr = architectCodePreview.value;
            const originalHtml = btnArchitectExplain.innerHTML;

            // Loading state
            btnArchitectExplain.innerHTML = `<span class="material-symbols-outlined spin" style="font-size: 0.875rem; animation: spin 1s linear infinite;">autorenew</span> Reversing...`;
            btnArchitectExplain.disabled = true;

            try {
                const generatedPseudocode = await AIGenerator.generatePseudocodeFromCode(codeStr);
                if (architectPrompt) {
                    architectPrompt.value = generatedPseudocode;
                }
                showToast('Algorithm reversed successfully!');
            } catch (err) {
                showToast(err.message || 'Error reversing code.');
            } finally {
                btnArchitectExplain.innerHTML = originalHtml;
                btnArchitectExplain.disabled = false;
            }
        });
    }

    if (btnArchitectSend) {
        btnArchitectSend.addEventListener('click', () => {
            if (!architectCodePreview || !architectCodePreview.value.trim()) return;

            const codeVal = architectCodePreview.value;
            if (codeTextarea) {
                codeTextarea.value = codeVal;
                updateCodeDisplay();
            }

            if (codeSelect) {
                codeSelect.value = 'new';
            }

            StateStore.set('currentAlgorithm', null);

            navigateTo('studio');

            setTimeout(() => {
                runCurrentAlgorithm();
                showToast('Algorithm loaded and visualizing!');
            }, 500);
        });
    }

    // ═══════════════════════════════════════
    // RUN / VISUALIZE BUTTON
    // ═══════════════════════════════════════
    const btnRun = document.getElementById('btn-run-algorithm');
    const btnSave = document.getElementById('btn-save-project');

    if (btnRun) {
        btnRun.addEventListener('click', () => {
            runCurrentAlgorithm();
        });
    }

    async function runCurrentAlgorithm() {
        const codeText = codeTextarea ? codeTextarea.value : '';
        const inputVal = playgroundInput ? playgroundInput.value : '';

        if (!codeText.trim()) {
            showToast('Code editor is empty. Please enter or select an algorithm.');
            return;
        }

        // Check if it matches the currently loaded saved project code and input exactly
        const loadedProj = StateStore.get('loadedProject');
        if (loadedProj && loadedProj.code && loadedProj.code.trim() === codeText.trim() && 
            (loadedProj.inputData || '').trim() === inputVal.trim() && loadedProj.steps && loadedProj.steps.length > 0) {
            
            showToast('Using saved visualization steps (Instant playback).');
            Player.reset();
            StateStore.setMany({
                steps: loadedProj.steps,
                totalSteps: loadedProj.steps.length,
                currentStep: 0,
                complexity: loadedProj.complexity || { time: '—', space: '—' },
                inputData: inputVal,
                currentAlgorithm: loadedProj.algorithm || 'custom',
                visualizationType: loadedProj.algorithm === 'graph' ? 'graph' : (['linkedlist', 'linkedListInsert', 'linkedListDelete'].includes(loadedProj.algorithm) ? 'linkedlist' : 'bars')
            });
            const loadedViz = loadedProj.algorithm === 'graph' ? 'graph' : (['linkedlist', 'linkedListInsert', 'linkedListDelete'].includes(loadedProj.algorithm) ? 'linkedlist' : 'bars');
            updateVisualizerLegend(loadedViz);
            return;
        }

        // Check if the editor code matches any standard library algorithm code exactly
        let matchesLibrary = false;
        let matchedAlgoKey = null;
        for (const [key, libraryAlgo] of Object.entries(ALGORITHMS)) {
            if (key === 'custom_ai') continue;
            if (libraryAlgo.code && codeText.trim() === libraryAlgo.code.trim()) {
                matchesLibrary = true;
                matchedAlgoKey = key;
                break;
            }
        }

        if (!matchesLibrary) {
            // ROUTE TO AI SYNTHESIS ENGINE (Custom/Modified Code)
            const btnRun = document.getElementById('btn-run-algorithm');
            const originalBtnHtml = btnRun ? btnRun.innerHTML : 'Run';
            
            if (btnRun) {
                btnRun.innerHTML = `<span class="material-symbols-outlined spin" style="font-size: 0.875rem; animation: spin 1s linear infinite;">autorenew</span> AI Running...`;
                btnRun.disabled = true;
            }
            
            showToast('AI is synthesizing visualization steps...');

            try {
                const inputVal = playgroundInput ? playgroundInput.value : '';
                const customAlgoKey = await AIGenerator.generateVisualization(codeText, inputVal);
                
                if (codeSelect) {
                    codeSelect.value = 'new';
                }
                
                const customAlgo = ALGORITHMS[customAlgoKey];
                if (!customAlgo) throw new Error('Failed to register AI synthesized algorithm.');

                let inputData;
                if (playgroundInput && playgroundInput.value.trim()) {
                    inputData = Parser.parsePlaygroundInput(playgroundInput.value, customAlgoKey);
                }

                if (!inputData) {
                    inputData = customAlgo.defaultData;
                }

                const result = runAlgorithm(customAlgoKey, inputData);
                if (!result) return;

                Player.reset();
                StateStore.setMany({
                    steps: result.steps,
                    totalSteps: result.steps.length,
                    currentStep: 0,
                    complexity: result.complexity,
                    inputData: inputData,
                    currentAlgorithm: customAlgoKey,
                    visualizationType: customAlgo.type === 'graph' ? 'graph' : (customAlgo.type === 'linkedlist' ? 'linkedlist' : 'bars')
                });

                updateVisualizerLegend(customAlgo.type === 'linkedlist' ? 'linkedlist' : (customAlgo.type === 'graph' ? 'graph' : 'bars'));
                showToast('Visualization generated by AI!');
                
                // Track execution run count in MariaDB
                Storage.incrementRuns();
                
            } catch (err) {
                console.error(err);
                showToast(`AI generation failed: ${err.message}`);
            } finally {
                if (btnRun) {
                    btnRun.innerHTML = originalBtnHtml;
                    btnRun.disabled = false;
                }
            }
        } else {
            // ROUTE TO LOCAL DETERMINISTIC ENGINE (Standard library algorithms)
            const algoKey = matchedAlgoKey;
            const algo = ALGORITHMS[algoKey];
            if (!algo) return;

            // Parse input data
            let inputData;
            if (playgroundInput && playgroundInput.value.trim()) {
                inputData = Parser.parsePlaygroundInput(playgroundInput.value, algoKey);
            }

            if (!inputData) {
                inputData = algo.defaultData;
            }

            // Extra args for search and linked list algorithms
            let extraArgs;
            if (algo.type === 'searching' && searchTargetInput) {
                const target = parseInt(searchTargetInput.value);
                extraArgs = isNaN(target) ? undefined : target;
            } else if (algoKey === 'linkedListInsert' && searchTargetInput) {
                extraArgs = searchTargetInput.value;
            } else if (algoKey === 'linkedListDelete' && searchTargetInput) {
                extraArgs = parseInt(searchTargetInput.value);
            }

            // Sync selector value
            const reverseMapping = {
                'bubbleSort': 'BubbleSort.cpp',
                'selectionSort': 'SelectionSort.cpp',
                'mergeSort': 'MergeSort.cpp',
                'quickSort': 'QuickSort.cpp',
                'binarySearch': 'BinarySearch.cpp',
                'linkedListInsert': 'LinkedListInsert.cpp',
                'linkedListDelete': 'LinkedListDelete.cpp',
                'bfs': 'BFS.cpp',
                'dfs': 'DFS.cpp',
            };
            if (codeSelect) {
                codeSelect.value = reverseMapping[algoKey] || 'new';
            }

            // Set visualization type & current algorithm key
            const isLinkedList = algo.type === 'linkedlist' || ['linkedListInsert', 'linkedListDelete'].includes(algoKey);
            StateStore.set('visualizationType', algo.type === 'graph' ? 'graph' : (isLinkedList ? 'linkedlist' : 'bars'));
            StateStore.set('currentAlgorithm', algoKey);

            // Run the algorithm locally
            const result = runAlgorithm(algoKey, inputData, extraArgs);
            if (!result) return;

            // Update state with results
            Player.reset();
            StateStore.setMany({
                steps: result.steps,
                totalSteps: result.steps.length,
                currentStep: 0,
                complexity: result.complexity,
                inputData: inputData,
            });

            // Update legend
            updateVisualizerLegend(algo.type);

            // Track execution run count in MariaDB
            Storage.incrementRuns();
        }
    }

    /**
     * Update the visualizer legend based on algorithm type
     */
    function updateVisualizerLegend(type) {
        const legend = document.querySelector('.visualizer-legend');
        if (!legend) return;

        if (type === 'graph') {
            legend.innerHTML = `
                <div class="legend-box" style="background-color: var(--primary);"></div> Current
                <div class="legend-box" style="background-color: #a855f7; margin-left: 0.5rem;"></div> Discovered
                <div class="legend-box" style="background-color: #34d399; margin-left: 0.5rem;"></div> Visited
            `;
        } else if (type === 'linkedlist') {
            legend.innerHTML = `
                <div class="legend-box" style="background-color: #06b6d4;"></div> Traversal Pointer
                <div class="legend-box" style="background-color: #f59e0b; margin-left: 0.5rem;"></div> Predecessor
                <div class="legend-box" style="background-color: #10b981; margin-left: 0.5rem;"></div> New/Inserted
                <div class="legend-box" style="background-color: #ef4444; margin-left: 0.5rem;"></div> Target/Deleted
            `;
        } else if (type === 'searching') {
            legend.innerHTML = `
                <div class="legend-box" style="background-color: #3b82f6;"></div> Left
                <div class="legend-box" style="background-color: #f59e0b; margin-left: 0.5rem;"></div> Mid
                <div class="legend-box" style="background-color: #ef4444; margin-left: 0.5rem;"></div> Right
                <div class="legend-box" style="background-color: #34d399; margin-left: 0.5rem;"></div> Found
            `;
        } else {
            legend.innerHTML = `
                <div class="legend-box legend-primary"></div> Current
                <div class="legend-box legend-purple"></div> Comparing
                <div class="legend-box" style="background-color: #f59e0b; margin-left: 0.5rem;"></div> Swapping
                <div class="legend-box" style="background-color: #34d399; margin-left: 0.5rem;"></div> Sorted
            `;
        }
    }

    // ═══════════════════════════════════════
    // SAVE / LOAD PROJECTS
    // ═══════════════════════════════════════
    if (btnSave) {
        btnSave.addEventListener('click', async () => {
            const algoKey = StateStore.get('currentAlgorithm');
            const algo = ALGORITHMS[algoKey];
            const name = algo ? algo.name : 'Custom Algorithm';
            const code = codeTextarea ? codeTextarea.value : '';
            const inputData = playgroundInput ? playgroundInput.value : '';

            const projectName = prompt('Project name:', name + ' — ' + new Date().toLocaleDateString());
            if (!projectName) return;

            const success = await Storage.saveProject(projectName, {
                algorithm: algoKey || StateStore.get('visualizationType') || 'bars',
                inputData: inputData,
                code: code,
                steps: StateStore.get('steps') || [],
                complexity: StateStore.get('complexity') || null
            });

            if (success) {
                showToast('Project saved successfully!');
                rebuildSavedAlgorithmsSelect();
                // Refresh dashboard stats
                Storage.updateDashboardStats();
            } else {
                showToast('Failed to save project.');
            }
        });
    }

    // Load project event
    document.addEventListener('load-project', (e) => {
        const project = e.detail;
        if (!project) return;

        navigateTo('studio');

        setTimeout(() => {
            if (project.code && codeTextarea) {
                codeTextarea.value = project.code;
                updateCodeDisplay();
            }
            if (project.inputData && playgroundInput) {
                playgroundInput.value = project.inputData;
            }
            if (codeSelect) {
                const savedValue = `saved:${project.name}`;
                let optionExists = Array.from(codeSelect.options).some(opt => opt.value === savedValue);
                if (!optionExists) {
                    rebuildSavedAlgorithmsSelect().then(() => {
                        codeSelect.value = savedValue;
                    });
                } else {
                    codeSelect.value = savedValue;
                }
            }
            if (project.algorithm) {
                StateStore.set('currentAlgorithm', project.algorithm);
                StateStore.set('visualizationType', project.algorithm === 'graph' ? 'graph' : 'bars');
            }
            if (project.complexity) {
                StateStore.set('complexity', project.complexity);
            }
            if (project.steps && project.steps.length > 0) {
                StateStore.set('steps', project.steps);
                StateStore.set('currentStep', 0);
            } else {
                StateStore.set('steps', []);
                StateStore.set('currentStep', 0);
                const canvasEl = document.getElementById('visualizer-canvas');
                if (canvasEl) canvasEl.innerHTML = '';
            }
            StateStore.set('loadedProject', project);
        }, 400);
    });

    // Show toast event
    document.addEventListener('show-toast', (e) => {
        if (e.detail) {
            showToast(e.detail);
        }
    });

    // ═══════════════════════════════════════
    // ALGORITHM LIBRARY CARDS
    // ═══════════════════════════════════════
    document.querySelectorAll('[data-algorithm]').forEach(card => {
        const algoKey = card.getAttribute('data-algorithm');

        // "Open Implementation" button
        const openBtn = card.querySelector('.library-link');
        if (openBtn) {
            openBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                navigateTo('studio');
                setTimeout(() => {
                    loadAlgorithmToEditor(algoKey);
                }, 400);
            });
        }

        // Clicking the card itself opens in studio and auto-runs
        card.addEventListener('click', (e) => {
            if (e.target.closest('.library-link')) return; // don't double-fire

            navigateTo('studio');
            setTimeout(() => {
                loadAlgorithmToEditor(algoKey);
                setTimeout(() => runCurrentAlgorithm(), 200);
            }, 400);
        });
    });

    // ═══════════════════════════════════════
    // ALGORITHM LIBRARY TAB FILTERING
    // ═══════════════════════════════════════
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.textContent.trim();
            filterAlgorithmCards(category);
        });
    });

    function filterAlgorithmCards(category) {
        const cards = document.querySelectorAll('#page-algorithms [data-algorithm]');
        cards.forEach(card => {
            if (category === 'All') {
                card.style.display = '';
            } else {
                const algoKey = card.getAttribute('data-algorithm');
                const algo = ALGORITHMS[algoKey];
                if (algo && algo.category === category) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            }
        });
    }

    // ═══════════════════════════════════════
    // COPY CODE BUTTON
    // ═══════════════════════════════════════
    const btnCopy = document.getElementById('btn-copy-code');
    if (btnCopy) {
        btnCopy.addEventListener('click', () => {
            if (codeTextarea) {
                navigator.clipboard.writeText(codeTextarea.value).then(() => {
                    showToast('Code copied to clipboard!');
                });
            }
        });
    }

    // ═══════════════════════════════════════
    // EXPORT BUTTON
    // ═══════════════════════════════════════
    const btnExport = document.querySelector('.btn-export');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const code = codeTextarea ? codeTextarea.value : '';
            const algoKey = StateStore.get('currentAlgorithm');
            const algo = ALGORITHMS[algoKey];
            const data = {
                algorithm: algoKey,
                name: algo ? algo.name : 'Custom',
                code: code,
                input: playgroundInput ? playgroundInput.value : '',
                complexity: StateStore.get('complexity'),
                exportDate: new Date().toISOString(),
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `neurocode-${algoKey || 'algorithm'}.json`;
            a.click();
            URL.revokeObjectURL(url);

            showToast('Algorithm exported!');
        });
    }

    // ═══════════════════════════════════════
    // SEARCH BAR
    // ═══════════════════════════════════════
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim().toLowerCase();
                if (!query) return;

                // Try to find matching algorithm
                for (const [key, algo] of Object.entries(ALGORITHMS)) {
                    if (algo.name.toLowerCase().includes(query) || key.toLowerCase().includes(query)) {
                        navigateTo('studio');
                        setTimeout(() => loadAlgorithmToEditor(key), 400);
                        searchInput.value = '';
                        return;
                    }
                }

                // No match — go to algorithms page
                navigateTo('algorithms');
                searchInput.value = '';
            }
        });
    }

    // ═══════════════════════════════════════
    // TOAST NOTIFICATION
    // ═══════════════════════════════════════
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'neurocode-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('toast-show'));

        setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // ═══════════════════════════════════════
    // STATS SIDEBAR TOGGLE
    // ═══════════════════════════════════════
    const btnStatsToggle = document.getElementById('btn-stats-toggle');
    const statsSidebar = document.getElementById('stats-sidebar');
    if (btnStatsToggle && statsSidebar) {
        btnStatsToggle.addEventListener('click', () => {
            statsSidebar.classList.toggle('sidebar-open');
        });
    }

    // ═══════════════════════════════════════
    // WINDOW RESIZE HANDLER
    // ═══════════════════════════════════════
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => Visualizer.refresh(), 250);
    });

    // Helper to fetch and render developer stats (streak, badges, calendar)
    async function loadDeveloperStats() {
        try {
            const [streak, badges, contributions] = await Promise.all([
                Storage.getStreak(),
                Storage.getBadges(),
                Storage.getContributions()
            ]);

            // 1. Render Streaks
            const streakCountEl = document.getElementById('profile-streak-count');
            const longestStreakEl = document.getElementById('profile-longest-streak');
            const headerStreakBadge = document.getElementById('header-streak-badge');
            const headerStreakCount = document.getElementById('header-streak-count');

            if (streakCountEl) streakCountEl.textContent = `🔥 ${streak.current_streak}-Day Streak`;
            if (longestStreakEl) longestStreakEl.textContent = `${streak.longest_streak} days`;
            
            if (headerStreakBadge && headerStreakCount) {
                if (streak.current_streak > 0) {
                    headerStreakCount.textContent = streak.current_streak;
                    headerStreakBadge.style.display = 'flex';
                } else {
                    headerStreakBadge.style.display = 'none';
                }
            }

            // 2. Render Badges Cabinet
            const badgesGrid = document.getElementById('profile-badges-grid');
            if (badgesGrid) {
                badgesGrid.innerHTML = '';
                badges.forEach(badge => {
                    const badgeCard = document.createElement('div');
                    badgeCard.title = `${badge.name}: ${badge.description} (Requires ${badge.rule_threshold} ${badge.rule_type.replace('total_', '')})`;
                    badgeCard.style.cssText = `
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        padding: 0.5rem;
                        text-align: center;
                        border-radius: 0.35rem;
                        background: ${badge.unlocked ? 'rgba(var(--primary-rgb), 0.08)' : 'rgba(255,255,255,0.02)'};
                        border: 1px solid ${badge.unlocked ? 'var(--primary)' : 'var(--border-color)'};
                        opacity: ${badge.unlocked ? '1' : '0.45'};
                        box-shadow: ${badge.unlocked ? '0 0 10px rgba(var(--primary-rgb), 0.15)' : 'none'};
                        position: relative;
                        cursor: help;
                    `;
                    
                    const badgeIcon = document.createElement('span');
                    badgeIcon.className = 'material-symbols-outlined';
                    badgeIcon.style.cssText = `font-size: 1.75rem; margin-bottom: 0.25rem; color: ${badge.unlocked ? 'var(--primary)' : 'var(--text-slate-400)'};`;
                    badgeIcon.textContent = badge.unlocked ? badge.icon : 'lock';
                    
                    const badgeTitle = document.createElement('span');
                    badgeTitle.style.cssText = 'font-size: 0.7rem; font-weight: 600; color: var(--text-light); word-break: break-word;';
                    badgeTitle.textContent = badge.name;

                    badgeCard.appendChild(badgeIcon);
                    badgeCard.appendChild(badgeTitle);
                    badgesGrid.appendChild(badgeCard);
                });
            }

            // 3. Render Practice Streak Heatmap
            const heatmapGrid = document.getElementById('heatmap-grid');
            const heatmapContainer = document.getElementById('heatmap-container');
            const heatmapEmpty = document.getElementById('heatmap-empty');
            const heatmapStats = document.getElementById('heatmap-stats');
            const heatmapYearEl = document.getElementById('heatmap-year');
            const heatmapMonths = document.getElementById('heatmap-months');
            const heatmapDayLabels = document.getElementById('heatmap-day-labels');
            const heatmapTooltip = document.getElementById('heatmap-tooltip');

            if (heatmapGrid) {
                const currentYear = new Date().getFullYear();
                if (heatmapYearEl) heatmapYearEl.textContent = currentYear;

                // Build activity map: { 'YYYY-MM-DD': { score, types: { type: count } } }
                const activityMap = {};
                const activities = contributions.activities || [];

                activities.forEach(row => {
                    const dateStr = new Date(row.activity_date).toISOString().slice(0, 10);
                    if (!activityMap[dateStr]) {
                        activityMap[dateStr] = { score: 0, types: {} };
                    }
                    activityMap[dateStr].types[row.activity_type] = (activityMap[dateStr].types[row.activity_type] || 0) + row.count;
                });

                // Compute activity scores
                const typeWeights = {
                    save_project: 3,
                    run_visualizer: 1,
                    share_project: 2,
                    upvote_project: 1,
                    bootstrap_generated: 2
                };
                Object.keys(activityMap).forEach(dateStr => {
                    const entry = activityMap[dateStr];
                    let score = 0;
                    Object.entries(entry.types).forEach(([type, count]) => {
                        score += (typeWeights[type] || 1) * count;
                    });
                    entry.score = score;
                });

                const activeDays = contributions.active_days || 0;
                const hasActivity = activeDays > 0;

                // Show/hide states
                if (hasActivity) {
                    if (heatmapContainer) heatmapContainer.style.display = '';
                    if (heatmapEmpty) heatmapEmpty.style.display = 'none';
                } else {
                    if (heatmapContainer) heatmapContainer.style.display = 'none';
                    if (heatmapEmpty) heatmapEmpty.style.display = '';
                    if (heatmapStats) heatmapStats.innerHTML = '';
                }

                // Stats
                if (heatmapStats && hasActivity) {
                    heatmapStats.innerHTML = `
                        <span>Current Streak: <strong style="color: var(--text-light);">${streak.current_streak} days</strong></span>
                        <span>Longest Streak: <strong style="color: var(--text-light);">${streak.longest_streak} days</strong></span>
                        <span>Active Days: <strong style="color: var(--text-light);">${activeDays}</strong></span>
                    `;
                }

                if (!hasActivity) return; // Don't render grid

                // Calendar geometry: Jan 1 to Dec 31 of current year
                const jan1 = new Date(currentYear, 0, 1);
                const dec31 = new Date(currentYear, 11, 31);
                const startOffset = jan1.getDay(); // 0=Sun
                const totalCalendarDays = startOffset + Math.ceil((dec31 - jan1) / (1000 * 60 * 60 * 24)) + 1;
                const totalWeeks = Math.ceil(totalCalendarDays / 7);

                // Month labels
                if (heatmapMonths) {
                    heatmapMonths.innerHTML = '';
                    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                    const monthWeekStarts = [];
                    for (let m = 0; m < 12; m++) {
                        const firstOfMonth = new Date(currentYear, m, 1);
                        const dayOfYear = Math.floor((firstOfMonth - jan1) / (1000 * 60 * 60 * 24));
                        const weekIndex = Math.floor((dayOfYear + startOffset) / 7);
                        monthWeekStarts.push(weekIndex);
                    }
                    for (let m = 0; m < 12; m++) {
                        const span = document.createElement('span');
                        span.textContent = monthNames[m];
                        const nextWeek = m < 11 ? monthWeekStarts[m + 1] : totalWeeks;
                        const colSpan = nextWeek - monthWeekStarts[m];
                        span.style.cssText = `flex: ${colSpan}; min-width: 0;`;
                        heatmapMonths.appendChild(span);
                    }
                }

                // Day labels (7 rows: Sun-Sat, show Mon/Wed/Fri)
                if (heatmapDayLabels) {
                    heatmapDayLabels.innerHTML = '';
                    const dayNames = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
                    dayNames.forEach(name => {
                        const label = document.createElement('span');
                        label.textContent = name;
                        label.style.cssText = `height: 12px; line-height: 12px; font-size: 0.65rem; color: var(--text-slate-400); margin-bottom: 3px;`;
                        heatmapDayLabels.appendChild(label);
                    });
                }

                // Grid setup
                heatmapGrid.style.gridTemplateColumns = `repeat(${totalWeeks}, 12px)`;
                heatmapGrid.style.gridTemplateRows = 'repeat(7, 12px)';
                heatmapGrid.style.gap = '3px';
                heatmapGrid.style.gridAutoFlow = 'column';
                heatmapGrid.style.justifyContent = 'space-between';
                heatmapGrid.innerHTML = '';

                const colorScale = ['#161b22', '#0f3d3a', '#136f63', '#1ca58f', '#2dd4bf'];
                const typeLabels = {
                    save_project: 'Saved Algorithm',
                    run_visualizer: 'Ran Visualizer',
                    share_project: 'Shared Project',
                    upvote_project: 'Upvoted Project',
                    bootstrap_generated: 'Practice Session'
                };

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Build DocumentFragment for performance
                const fragment = document.createDocumentFragment();

                for (let week = 0; week < totalWeeks; week++) {
                    for (let dow = 0; dow < 7; dow++) {
                        const dayIndex = week * 7 + dow - startOffset;
                        const cell = document.createElement('div');
                        cell.style.width = '12px';
                        cell.style.height = '12px';
                        cell.style.borderRadius = '2px';

                        if (dayIndex < 0 || dayIndex > 365) {
                            // Out-of-year padding
                            cell.style.background = 'transparent';
                        } else {
                            const cellDate = new Date(currentYear, 0, 1 + dayIndex);
                            const dateStr = `${currentYear}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;

                            // Future dates
                            if (cellDate > today) {
                                cell.style.background = 'transparent';
                            } else {
                                const entry = activityMap[dateStr];
                                const score = entry ? entry.score : 0;

                                let level;
                                if (score === 0) level = 0;
                                else if (score <= 2) level = 1;
                                else if (score <= 5) level = 2;
                                else if (score <= 10) level = 3;
                                else level = 4;

                                cell.style.background = colorScale[level];
                                cell.style.cursor = 'default';

                                // Store data for tooltip
                                cell.dataset.date = dateStr;
                                cell.dataset.score = score;
                                if (entry) {
                                    cell.dataset.types = JSON.stringify(entry.types);
                                }
                            }
                        }

                        fragment.appendChild(cell);
                    }
                }

                heatmapGrid.appendChild(fragment);

                // Tooltip handlers (event delegation)
                heatmapGrid.addEventListener('mouseenter', (e) => {
                    if (e.target.dataset.date && heatmapTooltip) {
                        const dateStr = e.target.dataset.date;
                        const score = parseInt(e.target.dataset.score);
                        const d = new Date(dateStr + 'T00:00:00');
                        const formattedDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

                        let html = `<div style="font-weight: 600; margin-bottom: 3px;">${formattedDate}</div>`;

                        if (score === 0) {
                            html += `<div style="color: #8b949e;">No activity</div>`;
                        } else {
                            const types = JSON.parse(e.target.dataset.types || '{}');
                            const totalActivities = Object.values(types).reduce((a, b) => a + b, 0);
                            html += `<div style="color: #2dd4bf; margin-bottom: 4px;">${totalActivities} ${totalActivities === 1 ? 'activity' : 'activities'}</div>`;
                            Object.entries(types).forEach(([type, count]) => {
                                const label = typeLabels[type] || type;
                                html += `<div style="color: #8b949e;">• ${label}${count > 1 ? ' ×' + count : ''}</div>`;
                            });
                        }

                        heatmapTooltip.innerHTML = html;
                        heatmapTooltip.style.display = 'block';

                        const rect = e.target.getBoundingClientRect();
                        heatmapTooltip.style.left = (rect.left + rect.width / 2 - heatmapTooltip.offsetWidth / 2) + 'px';
                        heatmapTooltip.style.top = (rect.top - heatmapTooltip.offsetHeight - 8) + 'px';
                    }
                }, true);

                heatmapGrid.addEventListener('mouseleave', (e) => {
                    if (e.target.dataset.date && heatmapTooltip) {
                        heatmapTooltip.style.display = 'none';
                    }
                }, true);
            }
        } catch (e) {
            console.warn('Failed to load developer stats:', e);
        }
    }

    // Bind custom event listener
    document.addEventListener('user-stats-updated', () => {
        loadDeveloperStats().catch(err => console.error(err));
    });

    // ═══════════════════════════════════════
    // PROFILE MODAL HANDLERS
    // ═══════════════════════════════════════
    const pageProfile = document.getElementById('page-profile');
    const btnOpenProfile = document.getElementById('btn-open-profile');
    const btnProfileSave = document.getElementById('btn-profile-save');
    const profileAvatarUpload = document.getElementById('profile-avatar-upload');
    const profileAvatarPreview = document.getElementById('profile-avatar-preview');
    const btnDeleteAccount = document.getElementById('btn-delete-account');

    // Make header streak badge click open the profile page
    const headerStreakBadge = document.getElementById('header-streak-badge');
    if (headerStreakBadge) {
        headerStreakBadge.addEventListener('click', () => {
            openProfilePage();
        });
    }

    function openProfilePage() {
        navigateTo('profile');
        loadDeveloperStats().catch(err => console.error(err));
        
        const token = localStorage.getItem('token');
        if (token) {
            fetch('/api/auth/verify', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.ok ? res.json() : null)
            .then(userData => {
                if (userData) {
                    document.getElementById('profile-name').value = userData.name || '';
                    document.getElementById('profile-username').value = userData.email || '';
                    if (userData.avatar) {
                        profileAvatarPreview.src = userData.avatar;
                    }
                }
            })
            .catch(err => console.error('Failed to load profile details:', err));
        }
    }

    if (btnOpenProfile) {
        btnOpenProfile.addEventListener('click', openProfilePage);
    }

    if (profileAvatarUpload && profileAvatarPreview) {
        profileAvatarUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 1024 * 1024) {
                showToast('Avatar image must be smaller than 1MB.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                profileAvatarPreview.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    if (btnProfileSave) {
        btnProfileSave.addEventListener('click', () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            const name = document.getElementById('profile-name').value;
            const password = document.getElementById('profile-password').value;
            const avatar = profileAvatarPreview.src;

            const originalHtml = btnProfileSave.innerHTML;
            btnProfileSave.disabled = true;
            btnProfileSave.innerHTML = `<span class="material-symbols-outlined spin" style="font-size: 0.875rem;">autorenew</span> Saving...`;

            fetch('/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, password, avatar })
            })
            .then(async res => {
                if (res.ok) {
                    const data = await res.json();
                    showToast('Profile updated successfully!');
                    
                    const headerAvatarImg = document.getElementById('header-avatar-img');
                    if (headerAvatarImg && data.user.avatar) {
                        headerAvatarImg.src = data.user.avatar;
                    }
                    
                    document.getElementById('profile-password').value = '';
                    closeProfileModal();
                } else {
                    const errData = await res.json();
                    showToast(errData.error || 'Failed to update profile.');
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Network error updating profile.');
            })
            .finally(() => {
                btnProfileSave.disabled = false;
                btnProfileSave.innerHTML = originalHtml;
            });
        });
    }

    if (btnDeleteAccount) {
        btnDeleteAccount.addEventListener('click', () => {
            const confirm1 = confirm('WARNING: Deleting your account will permanently delete all your projects and stats. This is irreversible. Are you sure you want to proceed?');
            if (!confirm1) return;

            const confirm2 = prompt("Please type 'DELETE' to permanently delete your account:");
            if (confirm2 !== 'DELETE') {
                showToast('Account deletion cancelled.');
                return;
            }

            const token = localStorage.getItem('token');
            if (!token) return;

            fetch('/api/auth/profile', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(async res => {
                if (res.ok) {
                    showToast('Account successfully deleted. Redirecting...');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setTimeout(() => {
                        window.location.href = './login.html';
                    }, 1500);
                } else {
                    const errData = await res.json();
                    showToast(errData.error || 'Failed to delete account.');
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Error deleting account.');
            });
        });
    }

    // ═══════════════════════════════════════
    // INITIAL LOAD
    // ═══════════════════════════════════════
    navigateTo('dashboard');
    Storage.updateDashboardStats();

    // Load default algorithm in studio
    loadAlgorithmToEditor('bubbleSort');
});
