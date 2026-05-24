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
                    const username = currentUser.email.split('@')[0];
                    const capitalizedUser = username.charAt(0).toUpperCase() + username.slice(1);
                    welcomeTitle.textContent = `Welcome back, ${capitalizedUser}.`;
                }
            }
        } catch (e) {
            console.error('Error parsing user profile:', e);
        }
    }

    // Setup User Profile Logout trigger
    const userAvatar = document.querySelector('.user-avatar');
    if (userAvatar) {
        userAvatar.style.cursor = 'pointer';
        userAvatar.title = 'Click to Sign Out';
        userAvatar.addEventListener('click', () => {
            if (confirm('Are you sure you want to sign out?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = './login.html';
            }
        });
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
        const ollamaGroup = document.getElementById('settings-ollama-group');
        const geminiGroup = document.getElementById('settings-gemini-group');
        if (ollamaGroup) ollamaGroup.style.display = prov === 'ollama' ? 'block' : 'none';
        if (geminiGroup) geminiGroup.style.display = prov === 'gemini' ? 'block' : 'none';
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

        if (!codeText.trim()) {
            showToast('Code editor is empty. Please enter or select an algorithm.');
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
                    visualizationType: customAlgo.type === 'graph' ? 'graph' : 'bars'
                });

                updateVisualizerLegend(customAlgo.type);
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

            // Extra args for search algorithms
            let extraArgs;
            if (algo.type === 'searching' && searchTargetInput) {
                const target = parseInt(searchTargetInput.value);
                extraArgs = isNaN(target) ? undefined : target;
            }

            // Sync selector value
            const reverseMapping = {
                'bubbleSort': 'BubbleSort.cpp',
                'selectionSort': 'SelectionSort.cpp',
                'mergeSort': 'MergeSort.cpp',
                'binarySearch': 'BinarySearch.cpp',
                'bfs': 'BFS.cpp',
                'dfs': 'DFS.cpp',
            };
            if (codeSelect) {
                codeSelect.value = reverseMapping[algoKey] || 'new';
            }

            // Set visualization type & current algorithm key
            StateStore.set('visualizationType', algo.type === 'graph' ? 'graph' : 'bars');
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
                algorithm: algoKey,
                inputData: inputData,
                code: code,
            });

            if (success) {
                showToast('Project saved successfully!');
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

    // ═══════════════════════════════════════
    // INITIAL LOAD
    // ═══════════════════════════════════════
    navigateTo('dashboard');
    Storage.updateDashboardStats();

    // Load default algorithm in studio
    loadAlgorithmToEditor('bubbleSort');
});
