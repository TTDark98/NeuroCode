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

        // Update visualization type
        if (algo.type === 'graph') {
            StateStore.set('visualizationType', 'graph');
        } else {
            StateStore.set('visualizationType', 'bars');
        }

        // Update code selector display
        if (codeSelect) {
            const reverseMapping = {
                'bubbleSort': 'BubbleSort.cpp',
                'selectionSort': 'SelectionSort.cpp',
                'mergeSort': 'MergeSort.cpp',
                'binarySearch': 'BinarySearch.cpp',
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
                
                const canvasEl = document.getElementById('visualizer-canvas');
                if (canvasEl) canvasEl.innerHTML = '';
                
                return;
            }

            // Map select options to algorithm keys
            const mapping = {
                'BubbleSort.cpp': 'bubbleSort',
                'SelectionSort.cpp': 'selectionSort',
                'MergeSort.cpp': 'mergeSort',
                'BinarySearch.cpp': 'binarySearch',
                'BFS.cpp': 'bfs',
                'DFS.cpp': 'dfs',
            };
            const algoKey = mapping[val];
            if (algoKey) loadAlgorithmToEditor(algoKey);
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
        } else {
            playgroundInput.placeholder = 'Enter array values: 45, 12, 56, 32, 8, 41';
            playgroundInput.value = algo.defaultData.join(', ');
            if (playgroundLabel) playgroundLabel.textContent = 'Array Values';
        }

        // Show/hide search target
        if (searchTargetGroup) {
            searchTargetGroup.style.display = algo.type === 'searching' ? 'flex' : 'none';
            if (searchTargetInput && algo.type === 'searching') {
                // Pick a random element as default target
                const data = algo.defaultData;
                searchTargetInput.value = data[Math.floor(Math.random() * data.length)];
            }
        }
    }

    // ═══════════════════════════════════════
    // AI MODEL SELECTOR
    // ═══════════════════════════════════════
    const aiModelSelect = document.getElementById('ai-model-select');
    const aiApiKeyInput = document.getElementById('ai-api-key');
    const aiProviderSelect = document.getElementById('ai-provider-select');
    const aiOllamaUrlInput = document.getElementById('ai-ollama-url');

    function updateProviderUI() {
        const prov = AIGenerator.getProvider();
        if (aiApiKeyInput) aiApiKeyInput.style.display = prov === 'gemini' ? 'block' : 'none';
        if (aiOllamaUrlInput) aiOllamaUrlInput.style.display = prov === 'ollama' ? 'block' : 'none';
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
    if (aiApiKeyInput) {
        aiApiKeyInput.value = AIGenerator.getApiKey() || '';
        aiApiKeyInput.addEventListener('change', () => {
            if (aiApiKeyInput.value.trim() !== '') {
                initAiModelDropdown();
            }
        });
    }

    async function initAiModelDropdown() {
        if (!aiModelSelect) return;

        const prov = AIGenerator.getProvider();
        if (prov === 'gemini' && !AIGenerator.getApiKey()) return;

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

    if (aiApiKeyInput) {
        // Save to backend on blur if logged in
        aiApiKeyInput.addEventListener('blur', async () => {
            const token = localStorage.getItem('neurocode-token');
            const prov = AIGenerator.getProvider();
            const key = aiApiKeyInput.value.trim();
            if (token && key && (prov === 'gemini' || prov === 'nvidia')) {
                try {
                    const res = await fetch('http://localhost:5000/api/keys', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ provider: prov, api_key: key })
                    });
                    if (res.ok) {
                        showToast(`${prov.toUpperCase()} API key saved securely!`);
                    }
                } catch (e) {
                    console.error("Failed to save key to backend", e);
                }
            }
        });
    }

    // Initialize on load
    updateProviderUI();
    initAiModelDropdown();

    // ═══════════════════════════════════════
    // RUN / VISUALIZE BUTTON
    // ═══════════════════════════════════════
    const btnRun = document.getElementById('btn-run-algorithm');
    const btnSave = document.getElementById('btn-save-project');
    const btnAiGenerate = document.getElementById('btn-ai-generate');

    if (btnRun) {
        btnRun.addEventListener('click', () => {
            runCurrentAlgorithm();
        });
    }

    if (btnAiGenerate) {
        btnAiGenerate.addEventListener('click', async () => {
            if (!codeTextarea || !codeTextarea.value.trim()) {
                showToast('Please enter some code first!');
                return;
            }

            const codeStr = codeTextarea.value;
            const inputStr = playgroundInput ? playgroundInput.value : '';

            // Loading state
            const originalHtml = btnAiGenerate.innerHTML;
            btnAiGenerate.innerHTML = `<span class="material-symbols-outlined spin" style="font-size: 0.875rem; animation: spin 1s linear infinite;">autorenew</span> Generating...`;
            btnAiGenerate.disabled = true;

            try {
                const algoKey = await AIGenerator.generateVisualization(codeStr, inputStr);
                StateStore.set('currentAlgorithm', algoKey);
                runCurrentAlgorithm();
                showToast('AI Visualization Generated Successfully!');
            } catch (err) {
                showToast(err.message || 'Error generating visualization.');
            } finally {
                btnAiGenerate.innerHTML = originalHtml;
                btnAiGenerate.disabled = false;
            }
        });
    }

    function runCurrentAlgorithm() {
        const token = localStorage.getItem('neurocode-token');
        if (!token) {
            showToast('⚠️ Please login to run algorithms!');
            return;
        }

        // Determine algorithm (from state or code detection)
        let algoKey = StateStore.get('currentAlgorithm');

        // Try detecting from code if no algo selected
        if (!algoKey && codeTextarea) {
            algoKey = Parser.detectAlgorithm(codeTextarea.value);
        }

        if (!algoKey) {
            algoKey = 'bubbleSort'; // fallback
        }

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

        // Extra args for search algorithms
        let extraArgs;
        if (algo.type === 'searching' && searchTargetInput) {
            const target = parseInt(searchTargetInput.value);
            extraArgs = isNaN(target) ? undefined : target;
        }

        // Set visualization type
        StateStore.set('visualizationType', algo.type === 'graph' ? 'graph' : 'bars');
        StateStore.set('currentAlgorithm', algoKey);

        // Run the algorithm
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

        // Update legend based on algorithm type
        updateVisualizerLegend(algo.type);
        
        // Save to backend history
        saveExecutionHistory(algoKey, codeTextarea ? codeTextarea.value : '', inputData ? inputData.toString() : '', result.complexity);
    }

    async function saveExecutionHistory(algo, code, input, complexity) {
        const token = localStorage.getItem('neurocode-token');
        if (!token) return; // Only save if logged in
        
        try {
            await fetch('http://localhost:5000/api/history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    algorithm: algo,
                    code_content: code,
                    input_data: input,
                    complexity_time: complexity.time,
                    complexity_space: complexity.space
                })
            });
        } catch (e) {
            console.error('Failed to save history', e);
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
        btnSave.addEventListener('click', () => {
            const algoKey = StateStore.get('currentAlgorithm');
            const algo = ALGORITHMS[algoKey];
            const name = algo ? algo.name : 'Custom Algorithm';
            const code = codeTextarea ? codeTextarea.value : '';
            const inputData = playgroundInput ? playgroundInput.value : '';

            const projectName = prompt('Project name:', name + ' — ' + new Date().toLocaleDateString());
            if (!projectName) return;

            const success = Storage.saveProject(projectName, {
                algorithm: algoKey,
                inputData: inputData,
                code: code,
            });

            if (success) {
                showToast('Project saved successfully!');
            }
        });
    }

    // Load project event
    document.addEventListener('load-project', (e) => {
        const project = e.detail;
        if (!project) return;

        navigateTo('studio');

        setTimeout(() => {
            if (project.algorithm) {
                loadAlgorithmToEditor(project.algorithm);
            }
            if (project.code && codeTextarea) {
                codeTextarea.value = project.code;
                updateCodeDisplay();
            }
            if (project.inputData && playgroundInput) {
                playgroundInput.value = project.inputData;
            }
        }, 400);
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

    // ═══════════════════════════════════════
    // INITIAL LOAD
    // ═══════════════════════════════════════
    navigateTo('dashboard');
    Storage.updateDashboardStats();

    // Load default algorithm in studio
    loadAlgorithmToEditor('bubbleSort');
    // ═══════════════════════════════════════
    // AUTHENTICATION & BACKEND INTEGRATION
    // ═══════════════════════════════════════
    const btnShowLogin = document.getElementById('btn-show-login');
    const authModal = document.getElementById('auth-modal');
    const btnCloseAuth = document.getElementById('btn-close-auth');
    const btnSubmitAuth = document.getElementById('btn-submit-auth');
    const btnSwitchAuth = document.getElementById('btn-switch-auth');
    const authModalTitle = document.getElementById('auth-modal-title');
    const authSwitchText = document.getElementById('auth-switch-text');
    const authEmailInput = document.getElementById('auth-email');
    const authPasswordInput = document.getElementById('auth-password');
    const authErrorMsg = document.getElementById('auth-error-msg');
    const btnLogout = document.getElementById('btn-logout');
    const userProfileMenu = document.getElementById('user-profile-menu');
    const loggedInUsername = document.getElementById('logged-in-username');
    const btnRefreshHistory = document.getElementById('btn-refresh-history');
    const profileDropdown = document.getElementById('profile-dropdown');
    const profileAvatarBtn = document.getElementById('profile-avatar-btn');

    let isLoginMode = true;

    // Toggle profile dropdown
    if (profileAvatarBtn) {
        // Click on the avatar or the username
        const profileMenuDiv = document.getElementById('user-profile-menu');
        if (profileMenuDiv) {
            profileMenuDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                if (profileDropdown) {
                    profileDropdown.style.display = profileDropdown.style.display === 'none' ? 'block' : 'none';
                }
            });
        }
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (profileDropdown && profileDropdown.style.display !== 'none') {
            const authContainer = document.getElementById('auth-container');
            if (authContainer && !authContainer.contains(e.target)) {
                profileDropdown.style.display = 'none';
            }
        }
    });

    // Prevent dropdown clicks from closing it
    if (profileDropdown) {
        profileDropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    if (btnShowLogin) {
        btnShowLogin.addEventListener('click', () => {
            authModal.style.display = 'flex';
        });
    }

    if (btnCloseAuth) {
        btnCloseAuth.addEventListener('click', () => {
            authModal.style.display = 'none';
            authErrorMsg.style.display = 'none';
        });
    }

    if (btnSwitchAuth) {
        btnSwitchAuth.addEventListener('click', () => {
            isLoginMode = !isLoginMode;
            authModalTitle.textContent = isLoginMode ? 'Login' : 'Register';
            btnSubmitAuth.textContent = isLoginMode ? 'Login' : 'Register';
            authSwitchText.textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
            btnSwitchAuth.textContent = isLoginMode ? 'Register' : 'Login';
            authErrorMsg.style.display = 'none';
        });
    }

    if (btnSubmitAuth) {
        btnSubmitAuth.addEventListener('click', async () => {
            const email = authEmailInput.value.trim();
            const password = authPasswordInput.value;
            
            if (!email || !password) {
                authErrorMsg.textContent = 'Please enter email and password.';
                authErrorMsg.style.display = 'block';
                return;
            }

            const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
            const originalHtml = btnSubmitAuth.innerHTML;
            btnSubmitAuth.innerHTML = 'Processing...';
            btnSubmitAuth.disabled = true;

            try {
                const res = await fetch(`http://localhost:5000${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await res.json();
                
                if (!res.ok) {
                    throw new Error(data.message || 'Authentication failed');
                }
                
                if (isLoginMode) {
                    localStorage.setItem('neurocode-token', data.token);
                    localStorage.setItem('neurocode-email', data.email);
                    authModal.style.display = 'none';
                    showToast('Logged in successfully!');
                    updateUIForLoginState();
                    fetchUserApiKeys();
                    fetchExecutionHistory();
                } else {
                    showToast('Registered successfully! Please log in.');
                    btnSwitchAuth.click(); // switch to login mode
                }
            } catch (err) {
                authErrorMsg.textContent = err.message;
                authErrorMsg.style.display = 'block';
            } finally {
                btnSubmitAuth.innerHTML = originalHtml;
                btnSubmitAuth.disabled = false;
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('neurocode-token');
            localStorage.removeItem('neurocode-email');
            AIGenerator.setApiKeyFromBackend('gemini', '');
            AIGenerator.setApiKeyFromBackend('nvidia', '');
            updateUIForLoginState();
            showToast('Logged out');
            document.getElementById('execution-history-list').innerHTML = 'Please login to view your execution history.';
            // Clear all key inputs
            ['dash-gemini-key', 'dash-nvidia-key', 'dropdown-gemini-key', 'dropdown-nvidia-key'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            if (profileDropdown) profileDropdown.style.display = 'none';
        });
    }

    if (btnRefreshHistory) {
        btnRefreshHistory.addEventListener('click', fetchExecutionHistory);
    }

    function updateUIForLoginState() {
        const token = localStorage.getItem('neurocode-token');
        const email = localStorage.getItem('neurocode-email');
        const apiKeysLoginMsg = document.getElementById('api-keys-login-msg');
        const apiKeysForm = document.getElementById('api-keys-form');
        
        if (token && email) {
            if (btnShowLogin) btnShowLogin.style.display = 'none';
            if (userProfileMenu) {
                userProfileMenu.style.display = 'flex';
                loggedInUsername.textContent = email.split('@')[0];
                const loggedInInitial = document.getElementById('logged-in-initial');
                if (loggedInInitial) loggedInInitial.textContent = email.charAt(0).toUpperCase();
            }
            // Update dropdown profile info
            const dropdownEmail = document.getElementById('dropdown-user-email');
            const dropdownInitial = document.getElementById('dropdown-user-initial');
            if (dropdownEmail) dropdownEmail.textContent = email;
            if (dropdownInitial) dropdownInitial.textContent = email.charAt(0).toUpperCase();
            // Show API keys form on dashboard
            if (apiKeysLoginMsg) apiKeysLoginMsg.style.display = 'none';
            if (apiKeysForm) apiKeysForm.style.display = 'block';
        } else {
            if (btnShowLogin) btnShowLogin.style.display = 'block';
            if (userProfileMenu) userProfileMenu.style.display = 'none';
            if (apiKeysLoginMsg) apiKeysLoginMsg.style.display = 'block';
            if (apiKeysForm) apiKeysForm.style.display = 'none';
        }
    }

    async function fetchUserApiKeys() {
        const token = localStorage.getItem('neurocode-token');
        if (!token) return;
        
        try {
            const res = await fetch('http://localhost:5000/api/keys', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const keys = await res.json();
                keys.forEach(k => {
                    AIGenerator.setApiKeyFromBackend(k.provider, k.api_key);
                    // Populate BOTH dashboard and dropdown inputs
                    ['dash', 'dropdown'].forEach(prefix => {
                        const input = document.getElementById(`${prefix}-${k.provider}-key`);
                        const status = document.getElementById(`${prefix === 'dash' ? '' : 'dropdown-'}${k.provider}-key-status`) 
                                    || document.getElementById(`${k.provider}-key-status`);
                        if (input) input.value = k.api_key;
                    });
                    // Update status indicators
                    [`${k.provider}-key-status`, `dropdown-${k.provider}-status`].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) { el.textContent = '✓ Saved'; el.style.color = '#22c55e'; }
                    });
                });
            }
        } catch (e) {
            console.error('Failed to fetch API keys', e);
        }
    }

    async function fetchExecutionHistory() {
        const token = localStorage.getItem('neurocode-token');
        const historyList = document.getElementById('execution-history-list');
        if (!token || !historyList) return;
        
        historyList.innerHTML = '<span class="material-symbols-outlined spin" style="animation: spin 1s linear infinite;">autorenew</span> Loading...';
        
        try {
            const res = await fetch('http://localhost:5000/api/history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const history = await res.json();
                if (history.length === 0) {
                    historyList.innerHTML = 'No execution history found.';
                    return;
                }
                
                historyList.innerHTML = history.map(h => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
                        <div>
                            <span style="color: var(--primary); font-weight: 600;">${h.algorithm}</span>
                            <div style="font-size: 0.75rem; color: var(--text-slate-600); margin-top: 0.25rem;">
                                Time: ${h.complexity_time || '?'} | Space: ${h.complexity_space || '?'}
                            </div>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-slate-600);">
                            ${new Date(h.executed_at).toLocaleString()}
                        </div>
                    </div>
                `).join('');
            }
        } catch (e) {
            console.error('Failed to fetch history', e);
            historyList.innerHTML = 'Error loading history.';
        }
    }

    // ═══════════════════════════════════════
    // API KEY SAVE BUTTONS (Dashboard + Dropdown)
    // ═══════════════════════════════════════
    async function saveApiKey(provider, inputId, statusId) {
        const token = localStorage.getItem('neurocode-token');
        if (!token) { showToast('Please login first!'); return; }
        
        const input = document.getElementById(inputId);
        const key = input ? input.value.trim() : '';
        
        if (!key) {
            showToast('Please enter an API key.');
            return;
        }
        
        try {
            const res = await fetch('http://localhost:5000/api/keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ provider, api_key: key })
            });
            if (res.ok) {
                AIGenerator.setApiKeyFromBackend(provider, key);
                // Sync both dashboard and dropdown inputs
                ['dash', 'dropdown'].forEach(prefix => {
                    const otherInput = document.getElementById(`${prefix}-${provider}-key`);
                    if (otherInput && otherInput !== input) otherInput.value = key;
                });
                // Update all status indicators
                [`${provider}-key-status`, `dropdown-${provider}-status`].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) { el.textContent = '✓ Saved'; el.style.color = '#22c55e'; }
                });
                showToast(`${provider.toUpperCase()} API key saved securely!`);
            } else {
                showToast('Failed to save key. Try again.');
            }
        } catch (e) {
            console.error('Failed to save key', e);
            showToast('Error saving API key.');
        }
    }

    // Dashboard save buttons
    const btnSaveGemini = document.getElementById('btn-save-gemini-key');
    const btnSaveNvidia = document.getElementById('btn-save-nvidia-key');
    if (btnSaveGemini) btnSaveGemini.addEventListener('click', () => saveApiKey('gemini', 'dash-gemini-key', 'gemini-key-status'));
    if (btnSaveNvidia) btnSaveNvidia.addEventListener('click', () => saveApiKey('nvidia', 'dash-nvidia-key', 'nvidia-key-status'));

    // Dropdown save buttons
    const btnDropdownSaveGemini = document.getElementById('btn-dropdown-save-gemini');
    const btnDropdownSaveNvidia = document.getElementById('btn-dropdown-save-nvidia');
    if (btnDropdownSaveGemini) btnDropdownSaveGemini.addEventListener('click', () => saveApiKey('gemini', 'dropdown-gemini-key', 'dropdown-gemini-status'));
    if (btnDropdownSaveNvidia) btnDropdownSaveNvidia.addEventListener('click', () => saveApiKey('nvidia', 'dropdown-nvidia-key', 'dropdown-nvidia-status'));

    // Initialize Auth state on load
    updateUIForLoginState();
    fetchUserApiKeys();
    fetchExecutionHistory();

});
