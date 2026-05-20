/* ======================================
   NeuroCode — Visualization Renderer
   Renders algorithm steps into the canvas area.
   Supports: bars (sorting/search), graph (BFS/DFS)
   ====================================== */

import StateStore from './state.js';

const Visualizer = (() => {
    let canvasEl = null;
    let infoSwapsEl = null;
    let infoComparisonsEl = null;
    let infoComplexityEl = null;
    let infoSpaceEl = null;
    let stepDescEl = null;

    // Graph layout positions (cached)
    let graphPositions = {};

    /**
     * Initialize DOM references
     */
    function init() {
        canvasEl = document.getElementById('visualizer-canvas');
        infoSwapsEl = document.getElementById('info-swaps');
        infoComparisonsEl = document.getElementById('info-comparisons');
        infoComplexityEl = document.getElementById('info-complexity');
        infoSpaceEl = document.getElementById('info-space');
        stepDescEl = document.getElementById('step-description');

        // Subscribe to step changes
        StateStore.subscribe('currentStep', () => renderCurrentStep());
        StateStore.subscribe('steps', () => {
            graphPositions = {};
            renderCurrentStep();
        });
    }

    /**
     * Render the current step based on visualization type
     */
    function renderCurrentStep() {
        const steps = StateStore.get('steps');
        const currentStep = StateStore.get('currentStep');
        const vizType = StateStore.get('visualizationType');

        if (!steps || steps.length === 0 || !canvasEl) return;

        const step = steps[Math.min(currentStep, steps.length - 1)];

        if (vizType === 'graph') {
            renderGraphStep(step);
        } else {
            renderBarStep(step);
        }

        updateInfoCard(step);
        updateStepDescription(step);
    }

    // ─────────────────────────────────────
    // BAR VISUALIZATION (Sorting & Search)
    // ─────────────────────────────────────
    function renderBarStep(step) {
        const arr = step.array;
        if (!arr || arr.length === 0) return;

        const maxVal = Math.max(...arr);
        const maxHeight = (canvasEl.clientHeight * 0.6) - 40; // scale down so it doesn't eat up the whole screen

        // Build highlight map: index → type
        const highlightMap = {};
        if (step.highlights) {
            step.highlights.forEach(h => { highlightMap[h.index] = h.type; });
        }

        // Check if we can update existing bars or need to rebuild
        const existingBars = canvasEl.querySelectorAll('.vis-bar');
        const needsRebuild = existingBars.length !== arr.length;

        if (needsRebuild) {
            canvasEl.innerHTML = '';

            arr.forEach((val, idx) => {
                const bar = document.createElement('div');
                bar.className = 'vis-bar';
                bar.style.height = `${(val / maxVal) * maxHeight}px`;
                bar.style.width = `${Math.max(100 / arr.length - 1, 2)}%`;
                bar.dataset.index = idx;

                // Apply highlight class
                applyBarHighlight(bar, highlightMap[idx]);

                // Value label
                const label = document.createElement('div');
                label.className = 'vis-label';
                label.textContent = val;
                bar.appendChild(label);

                canvasEl.appendChild(bar);
            });
        } else {
            // Update existing bars with transitions
            existingBars.forEach((bar, idx) => {
                const val = arr[idx];
                bar.style.height = `${(val / maxVal) * maxHeight}px`;
                bar.dataset.index = idx;

                // Reset classes, keep base
                applyBarHighlight(bar, highlightMap[idx]);

                // Update label
                const label = bar.querySelector('.vis-label');
                if (label) label.textContent = val;
            });
        }
    }

    /**
     * Apply appropriate CSS class to a bar based on highlight type
     */
    function applyBarHighlight(bar, highlightType) {
        // Remove all highlight classes
        bar.classList.remove(
            'vis-bar-primary', 'vis-bar-compare',
            'vis-bar-highlight-swap', 'vis-bar-highlight-sorted',
            'vis-bar-highlight-current', 'vis-bar-highlight-found',
            'vis-bar-highlight-left', 'vis-bar-highlight-right', 'vis-bar-highlight-mid'
        );

        switch (highlightType) {
            case 'compare':
                bar.classList.add('vis-bar-compare');
                break;
            case 'swap':
                bar.classList.add('vis-bar-highlight-swap');
                break;
            case 'sorted':
                bar.classList.add('vis-bar-highlight-sorted');
                break;
            case 'current':
                bar.classList.add('vis-bar-highlight-current');
                break;
            case 'found':
                bar.classList.add('vis-bar-highlight-found');
                break;
            case 'left':
                bar.classList.add('vis-bar-highlight-left');
                break;
            case 'right':
                bar.classList.add('vis-bar-highlight-right');
                break;
            case 'mid':
                bar.classList.add('vis-bar-highlight-mid');
                break;
            default:
                bar.classList.add('vis-bar-primary');
        }
    }

    // ─────────────────────────────────────
    // GRAPH VISUALIZATION (BFS / DFS)
    // ─────────────────────────────────────
    function renderGraphStep(step) {
        if (!step.graph) return;

        const { adjacencyList, nodes } = step.graph;
        const visited = step.visited || new Set();
        const currentNode = step.currentNode;

        // Build highlight map: node → type
        const highlightMap = {};
        if (step.highlights) {
            step.highlights.forEach(h => { highlightMap[h.node] = h.type; });
        }

        // Calculate positions (circle layout)
        if (Object.keys(graphPositions).length === 0) {
            const centerX = canvasEl.clientWidth / 2;
            const centerY = (canvasEl.clientHeight - 60) / 2;
            const radius = Math.min(centerX, centerY) * 0.65;

            nodes.forEach((node, i) => {
                const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
                graphPositions[node] = {
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle),
                };
            });
        }

        // Build SVG
        const svgNS = 'http://www.w3.org/2000/svg';
        canvasEl.innerHTML = '';

        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';

        // Draw edges first
        const drawnEdges = new Set();
        for (const node of nodes) {
            const neighbors = adjacencyList[node] || [];
            for (const neighbor of neighbors) {
                const edgeKey = [Math.min(node, neighbor), Math.max(node, neighbor)].join('-');
                if (drawnEdges.has(edgeKey)) continue;
                drawnEdges.add(edgeKey);

                const p1 = graphPositions[node];
                const p2 = graphPositions[neighbor];

                const line = document.createElementNS(svgNS, 'line');
                line.setAttribute('x1', p1.x);
                line.setAttribute('y1', p1.y);
                line.setAttribute('x2', p2.x);
                line.setAttribute('y2', p2.y);
                line.setAttribute('class', 'graph-edge');

                // Highlight edge if both endpoints are visited
                if (visited.has(node) && visited.has(neighbor)) {
                    line.classList.add('graph-edge-visited');
                }

                svg.appendChild(line);
            }
        }

        // Draw nodes
        for (const node of nodes) {
            const pos = graphPositions[node];

            const group = document.createElementNS(svgNS, 'g');
            group.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);

            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('r', '24');
            circle.setAttribute('class', 'graph-node');

            // Apply state
            if (highlightMap[node] === 'current') {
                circle.classList.add('graph-node-current');
            } else if (highlightMap[node] === 'compare') {
                circle.classList.add('graph-node-discovered');
            } else if (visited.has(node)) {
                circle.classList.add('graph-node-visited');
            }

            group.appendChild(circle);

            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dy', '0.35em');
            text.setAttribute('class', 'graph-node-label');
            text.textContent = node;
            group.appendChild(text);

            svg.appendChild(group);
        }

        canvasEl.appendChild(svg);
    }

    // ─────────────────────────────────────
    // INFO CARD UPDATES
    // ─────────────────────────────────────
    function updateInfoCard(step) {
        const complexity = StateStore.get('complexity');

        if (infoSwapsEl && step.swaps !== undefined) {
            infoSwapsEl.textContent = step.swaps;
        }
        if (infoComparisonsEl && step.comparisons !== undefined) {
            infoComparisonsEl.textContent = step.comparisons;
        }
        if (infoComplexityEl && complexity.time) {
            infoComplexityEl.textContent = complexity.time;
        }
        if (infoSpaceEl && complexity.space) {
            infoSpaceEl.textContent = complexity.space;
        }
    }

    function updateStepDescription(step) {
        if (stepDescEl) {
            stepDescEl.textContent = step.description || '';
        }
    }

    /**
     * Force a full re-render (e.g. on window resize)
     */
    function refresh() {
        graphPositions = {};
        renderCurrentStep();
    }

    return { init, renderCurrentStep, refresh };
})();

export default Visualizer;
