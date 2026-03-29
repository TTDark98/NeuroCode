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

        if (theme === 'light-minimalist' || theme === 'pink-panther') {
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
            case 'pink-panther':
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
    const codeSelect = document.querySelector('.code-select');

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
            const ext = algo.type === 'graph' ? '.cpp' : '.cpp';
            codeSelect.value = algo.name.replace(/\s/g, '') + ext;
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
    // RUN / VISUALIZE BUTTON
    // ═══════════════════════════════════════
    const btnRun = document.getElementById('btn-run-algorithm');
    const btnSave = document.getElementById('btn-save-project');

    if (btnRun) {
        btnRun.addEventListener('click', () => {
            runCurrentAlgorithm();
        });
    }

    function runCurrentAlgorithm() {
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
});
