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
    let stepHistoryLogEl = null;

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
        stepHistoryLogEl = document.getElementById('step-history-log');

        // Subscribe to step changes
        StateStore.subscribe('currentStep', () => {
            renderCurrentStep();
            updateActiveStepHistoryItem();
        });
        StateStore.subscribe('steps', () => {
            graphPositions = {};
            populateStepHistoryLog();
            renderCurrentStep();
            updateActiveStepHistoryItem();
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
        } else if (vizType === 'linkedlist') {
            renderLinkedListStep(step);
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
        const maxHeight = Math.max((canvasEl.clientHeight * 0.55) - 40, 120); // shorter bars for better visualization visibility

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
                bar.style.width = `${Math.max(100 / arr.length - 0.2, 5)}%`;

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
    // LINKED LIST VISUALIZATION
    // ─────────────────────────────────────
    function renderLinkedListStep(step) {
        const arr = step.array;
        if (!arr) return;

        const svgNS = 'http://www.w3.org/2000/svg';
        canvasEl.innerHTML = '';

        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';

        const defs = document.createElementNS(svgNS, 'defs');
        
        const marker = document.createElementNS(svgNS, 'marker');
        marker.setAttribute('id', 'arrow');
        marker.setAttribute('viewBox', '0 0 10 10');
        marker.setAttribute('refX', '8');
        marker.setAttribute('refY', '5');
        marker.setAttribute('markerWidth', '6');
        marker.setAttribute('markerHeight', '6');
        marker.setAttribute('orient', 'auto-start-reverse');
        const markerPath = document.createElementNS(svgNS, 'path');
        markerPath.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
        markerPath.setAttribute('fill', '#64748b');
        marker.appendChild(markerPath);
        defs.appendChild(marker);

        const markerHi = document.createElementNS(svgNS, 'marker');
        markerHi.setAttribute('id', 'arrow-highlight');
        markerHi.setAttribute('viewBox', '0 0 10 10');
        markerHi.setAttribute('refX', '8');
        markerHi.setAttribute('refY', '5');
        markerHi.setAttribute('markerWidth', '6');
        markerHi.setAttribute('markerHeight', '6');
        markerHi.setAttribute('orient', 'auto-start-reverse');
        const markerHiPath = document.createElementNS(svgNS, 'path');
        markerHiPath.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
        markerHiPath.setAttribute('fill', '#06b6d4');
        markerHi.appendChild(markerHiPath);
        defs.appendChild(markerHi);

        svg.appendChild(defs);

        const highlightMap = {};
        if (step.highlights) {
            step.highlights.forEach(h => { highlightMap[h.index] = h.type; });
        }

        const nodeWidth = 70;
        const nodeHeight = 44;
        const spacing = 120;
        const canvasWidth = canvasEl.clientWidth || 800;
        const canvasHeight = canvasEl.clientHeight || 300;
        const centerY = canvasHeight / 2 - 10;

        const n = arr.length;
        const startX = Math.max(50, (canvasWidth - (n * spacing - (spacing - nodeWidth))) / 2);

        const nodePositions = [];
        for (let i = 0; i < n; i++) {
            nodePositions.push({
                x: startX + i * spacing,
                y: centerY
            });
        }

        for (let i = 0; i < n - 1; i++) {
            const fromPos = nodePositions[i];
            const toPos = nodePositions[i + 1];

            if (step.bypassConnection && step.bypassConnection.from === i) {
                if (step.bypassConnection.to === i + 2 && i + 2 < n) {
                    const bypassToPos = nodePositions[i + 2];
                    
                    const path = document.createElementNS(svgNS, 'path');
                    const x1 = fromPos.x + nodeWidth;
                    const y1 = fromPos.y + nodeHeight / 2;
                    const x2 = bypassToPos.x;
                    const y2 = bypassToPos.y + nodeHeight / 2;
                    const controlX = (x1 + x2) / 2;
                    const controlY = y1 - 60;
                    
                    path.setAttribute('d', `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2 - 8} ${y2}`);
                    path.setAttribute('fill', 'none');
                    path.setAttribute('stroke', '#ef4444');
                    path.setAttribute('stroke-width', '2.5');
                    path.setAttribute('marker-end', 'url(#arrow)');
                    svg.appendChild(path);
                    continue;
                }
            }

            const line = document.createElementNS(svgNS, 'line');
            const x1 = fromPos.x + nodeWidth;
            const y1 = fromPos.y + nodeHeight / 2;
            const x2 = toPos.x;
            const y2 = toPos.y + nodeHeight / 2;

            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2 - 8);
            line.setAttribute('y2', y2);
            line.setAttribute('class', 'list-arrow-line');

            if (highlightMap[i] === 'current') {
                line.classList.add('list-arrow-line-highlight');
                line.setAttribute('marker-end', 'url(#arrow-highlight)');
            } else {
                line.setAttribute('marker-end', 'url(#arrow)');
            }

            svg.appendChild(line);
        }

        if (n > 0) {
            const lastPos = nodePositions[n - 1];
            
            const nullLine = document.createElementNS(svgNS, 'line');
            nullLine.setAttribute('x1', lastPos.x + nodeWidth);
            nullLine.setAttribute('y1', lastPos.y + nodeHeight / 2);
            nullLine.setAttribute('x2', lastPos.x + nodeWidth + 30);
            nullLine.setAttribute('y2', lastPos.y + nodeHeight / 2);
            nullLine.setAttribute('class', 'list-arrow-line');
            nullLine.setAttribute('marker-end', 'url(#arrow)');
            svg.appendChild(nullLine);

            const nullText = document.createElementNS(svgNS, 'text');
            nullText.setAttribute('x', lastPos.x + nodeWidth + 38);
            nullText.setAttribute('y', lastPos.y + nodeHeight / 2 + 5);
            nullText.setAttribute('fill', '#64748b');
            nullText.setAttribute('font-family', 'monospace');
            nullText.setAttribute('font-size', '0.75rem');
            nullText.setAttribute('font-weight', 'bold');
            nullText.textContent = 'NULL';
            svg.appendChild(nullText);
        }

        arr.forEach((val, idx) => {
            const pos = nodePositions[idx];
            const group = document.createElementNS(svgNS, 'g');

            const indexText = document.createElementNS(svgNS, 'text');
            indexText.setAttribute('x', pos.x + nodeWidth / 2);
            indexText.setAttribute('y', pos.y - 8);
            indexText.setAttribute('text-anchor', 'middle');
            indexText.setAttribute('fill', '#94a3b8');
            indexText.setAttribute('font-size', '0.65rem');
            indexText.setAttribute('font-family', 'monospace');
            indexText.textContent = `[${idx}]`;
            group.appendChild(indexText);

            const rect = document.createElementNS(svgNS, 'rect');
            rect.setAttribute('x', pos.x);
            rect.setAttribute('y', pos.y);
            rect.setAttribute('width', nodeWidth);
            rect.setAttribute('height', nodeHeight);
            rect.setAttribute('class', 'list-node-rect');

            const hType = highlightMap[idx];
            if (hType === 'current') {
                rect.classList.add('list-node-rect-current');
            } else if (hType === 'compare') {
                rect.classList.add('list-node-rect-compare');
            } else if (hType === 'new') {
                rect.classList.add('list-node-rect-new');
            } else if (hType === 'target') {
                rect.classList.add('list-node-rect-target');
            }
            group.appendChild(rect);

            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', pos.x + nodeWidth / 2);
            text.setAttribute('y', pos.y + nodeHeight / 2 + 5);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', 'var(--text-slate-100)');
            text.setAttribute('font-size', '0.9rem');
            text.setAttribute('font-weight', '600');
            text.setAttribute('font-family', 'sans-serif');
            text.textContent = val;
            group.appendChild(text);

            svg.appendChild(group);
        });

        if (step.newNode) {
            const newNode = step.newNode;
            const newY = centerY + 80;
            
            let newX = startX + 2 * spacing;
            if (newNode.index >= 0) {
                newX = startX + newNode.index * spacing;
            }

            const group = document.createElementNS(svgNS, 'g');

            const labelText = document.createElementNS(svgNS, 'text');
            labelText.setAttribute('x', newX + nodeWidth / 2);
            labelText.setAttribute('y', newY - 8);
            labelText.setAttribute('text-anchor', 'middle');
            labelText.setAttribute('fill', '#10b981');
            labelText.setAttribute('font-size', '0.65rem');
            labelText.setAttribute('font-family', 'monospace');
            labelText.textContent = 'new node';
            group.appendChild(labelText);

            const rect = document.createElementNS(svgNS, 'rect');
            rect.setAttribute('x', newX);
            rect.setAttribute('y', newY);
            rect.setAttribute('width', nodeWidth);
            rect.setAttribute('height', nodeHeight);
            rect.setAttribute('class', 'list-node-rect list-node-rect-new');
            group.appendChild(rect);

            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', newX + nodeWidth / 2);
            text.setAttribute('y', newY + nodeHeight / 2 + 5);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', 'var(--text-slate-100)');
            text.setAttribute('font-size', '0.9rem');
            text.setAttribute('font-weight', '600');
            text.setAttribute('font-family', 'sans-serif');
            text.textContent = newNode.val;
            group.appendChild(text);

            svg.appendChild(group);

            if (newNode.state === 'pointing') {
                const pointerLine = document.createElementNS(svgNS, 'path');
                const x1 = newX + nodeWidth / 2;
                const y1 = newY;
                
                let targetX = newX;
                let targetY = centerY + nodeHeight;
                
                const cpX = (x1 + targetX) / 2;
                const cpY = (y1 + targetY) / 2 + 10;
                
                pointerLine.setAttribute('d', `M ${x1} ${y1} Q ${cpX} ${cpY} ${targetX + nodeWidth/2} ${targetY + 8}`);
                pointerLine.setAttribute('fill', 'none');
                pointerLine.setAttribute('stroke', '#10b981');
                pointerLine.setAttribute('stroke-width', '2');
                pointerLine.setAttribute('marker-end', 'url(#arrow-highlight)');
                svg.appendChild(pointerLine);
            }
        }

        if (step.pointers) {
            const pointersByIndex = {};
            step.pointers.forEach(p => {
                if (!pointersByIndex[p.index]) pointersByIndex[p.index] = [];
                pointersByIndex[p.index].push(p.name);
            });

            for (const [idxStr, names] of Object.entries(pointersByIndex)) {
                const idx = parseInt(idxStr);
                const pos = nodePositions[idx];
                if (!pos) continue;

                names.forEach((name, i) => {
                    const label = document.createElementNS(svgNS, 'text');
                    label.setAttribute('x', pos.x + nodeWidth / 2);
                    label.setAttribute('y', pos.y + nodeHeight + 20 + i * 15);
                    label.setAttribute('text-anchor', 'middle');
                    label.setAttribute('class', 'list-pointer-label');
                    label.textContent = `▲ ${name}`;
                    svg.appendChild(label);
                });
            }
        }

        canvasEl.appendChild(svg);
    }

    // ─────────────────────────────────────
    // GRAPH VISUALIZATION (BFS / DFS / MST / APSP)
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
        
        const edgeHighlightMap = step.edgeHighlights || {};
        const edgeWeights = step.graph.edgeWeights || {};
        const isDirected = step.graph.directed || false;

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
                const edgeKey = isDirected ? `${node}-${neighbor}` : `${Math.min(node, neighbor)}-${Math.max(node, neighbor)}`;
                if (!isDirected && drawnEdges.has(edgeKey)) continue;
                drawnEdges.add(edgeKey);

                const p1 = graphPositions[node];
                const p2 = graphPositions[neighbor];

                const group = document.createElementNS(svgNS, 'g');

                const line = document.createElementNS(svgNS, 'line');
                line.setAttribute('x1', p1.x);
                line.setAttribute('y1', p1.y);
                line.setAttribute('x2', p2.x);
                line.setAttribute('y2', p2.y);
                line.setAttribute('class', 'graph-edge');

                // Check edge highlights
                const hType = edgeHighlightMap[edgeKey] || edgeHighlightMap[`${node}-${neighbor}`] || edgeHighlightMap[`${neighbor}-${node}`];

                if (hType === 'mst') {
                    line.classList.add('graph-edge-mst');
                } else if (hType === 'compare') {
                    line.classList.add('graph-edge-compare');
                } else if (hType === 'discard') {
                    line.classList.add('graph-edge-discard');
                } else if (visited.has(node) && visited.has(neighbor)) {
                    line.classList.add('graph-edge-visited');
                }

                group.appendChild(line);

                // Check for weights
                const weight = edgeWeights[edgeKey] !== undefined ? edgeWeights[edgeKey] : 
                               edgeWeights[`${node}-${neighbor}`] !== undefined ? edgeWeights[`${node}-${neighbor}`] :
                               edgeWeights[`${neighbor}-${node}`] !== undefined ? edgeWeights[`${neighbor}-${node}`] : null;

                if (weight !== null) {
                    const text = document.createElementNS(svgNS, 'text');
                    
                    // Offset text slightly above the line to prevent overlap
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const len = Math.sqrt(dx*dx + dy*dy) || 1;
                    const nx = -dy / len;
                    const ny = dx / len;
                    
                    text.setAttribute('x', (p1.x + p2.x) / 2 + nx * 10);
                    text.setAttribute('y', (p1.y + p2.y) / 2 + ny * 10);
                    text.setAttribute('text-anchor', 'middle');
                    text.setAttribute('dominant-baseline', 'middle');
                    text.setAttribute('class', 'graph-edge-label');
                    
                    // Add background rect or text-shadow for readability (handled in CSS)
                    text.textContent = weight === Infinity || weight === 1e9 ? '∞' : weight;
                    group.appendChild(text);
                }

                svg.appendChild(group);
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
     * Populate Step History trace log sidebar list
     */
    function populateStepHistoryLog() {
        if (!stepHistoryLogEl) return;
        stepHistoryLogEl.innerHTML = '';
        const steps = StateStore.get('steps') || [];
        
        steps.forEach((step, idx) => {
            const item = document.createElement('div');
            item.className = 'step-history-item';
            item.dataset.index = idx;
            item.textContent = `${idx + 1}. ${step.description || 'Step execution'}`;
            
            item.addEventListener('click', () => {
                StateStore.set('currentStep', idx);
            });
            
            stepHistoryLogEl.appendChild(item);
        });
    }

    /**
     * Highlight active step trace item and scroll it into view
     */
    function updateActiveStepHistoryItem() {
        if (!stepHistoryLogEl) return;
        const currentStep = StateStore.get('currentStep') || 0;
        
        const items = stepHistoryLogEl.querySelectorAll('.step-history-item');
        items.forEach((item, idx) => {
            if (idx === currentStep) {
                item.classList.add('active');
                
                // Safely scroll only the stepHistoryLogEl container, preventing page viewport shifting
                const containerHeight = stepHistoryLogEl.clientHeight;
                const itemTop = item.offsetTop;
                const itemHeight = item.offsetHeight;
                
                stepHistoryLogEl.scrollTo({
                    top: itemTop - containerHeight / 2 + itemHeight / 2,
                    behavior: 'smooth'
                });
            } else {
                item.classList.remove('active');
            }
        });
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
