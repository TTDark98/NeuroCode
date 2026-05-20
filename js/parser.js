/* ======================================
   NeuroCode — Code Parser
   Lightweight code → algorithm mapper.
   Detects algorithm keywords and extracts input data.
   Not a full compiler — pattern matching only.
   ====================================== */

import { ALGORITHMS } from './algorithms.js';

const Parser = (() => {

    /**
     * Detect which algorithm is referenced in the code text.
     * Uses case-insensitive keyword matching.
     * Returns algorithm key or null.
     */
    function detectAlgorithm(codeText) {
        const lower = codeText.toLowerCase();

        // Priority order: most specific first
        const patterns = [
            { key: 'mergeSort', keywords: ['mergesort', 'merge_sort', 'merge sort', 'merge('] },
            { key: 'selectionSort', keywords: ['selectionsort', 'selection_sort', 'selection sort', 'minidx', 'minindex'] },
            { key: 'bubbleSort', keywords: ['bubblesort', 'bubble_sort', 'bubble sort', 'swapped'] },
            { key: 'binarySearch', keywords: ['binarysearch', 'binary_search', 'binary search', 'left <= right', 'left<=right'] },
            { key: 'bfs', keywords: ['bfs', 'breadth first', 'breadth_first', 'queue.push', 'q.push'] },
            { key: 'dfs', keywords: ['dfs', 'depth first', 'depth_first', 'dfsrecursive', 'dfs('] },
        ];

        for (const pattern of patterns) {
            for (const kw of pattern.keywords) {
                if (lower.includes(kw)) {
                    return pattern.key;
                }
            }
        }

        return null;
    }

    /**
     * Extract array data from code text.
     * Looks for patterns like:
     *   {5, 3, 8, 1}  or  [5, 3, 8, 1]  or  arr = 5,3,8,1
     */
    function extractArrayFromCode(codeText) {
        // Pattern 1: {5, 3, 8, 1} or [5, 3, 8, 1]
        const bracketMatch = codeText.match(/[{[\[]([\d\s,]+)[}\]]/);
        if (bracketMatch) {
            return parseNumberList(bracketMatch[1]);
        }

        // Pattern 2: arr[] = ... or array = ...
        const arrMatch = codeText.match(/arr(?:ay)?\s*(?:\[\])?\s*=\s*[{[\[]?([\d\s,]+)[}\]}/]?/i);
        if (arrMatch) {
            return parseNumberList(arrMatch[1]);
        }

        return null;
    }

    /**
     * Parse a comma-separated or space-separated list of numbers
     */
    function parseNumberList(text) {
        const nums = text
            .split(/[,\s]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .map(Number)
            .filter(n => !isNaN(n));

        return nums.length > 0 ? nums : null;
    }

    /**
     * Parse playground input text into data for the algorithm.
     * Handles arrays, graph edges, and search targets.
     */
    function parsePlaygroundInput(inputText, algorithmKey) {
        const algo = ALGORITHMS[algorithmKey];
        if (!algo) return null;

        const trimmed = inputText.trim();
        if (!trimmed) return null;

        if (algo.type === 'graph') {
            return parseGraphInput(trimmed);
        } else {
            return parseNumberList(trimmed);
        }
    }

    /**
     * Parse graph input.
     * Supports formats:
     *   0-1, 0-2, 1-3, 1-4, 2-5, 4-5   (edge list)
     *   0: 1 2\n 1: 0 3 4\n ...           (adjacency list)
     */
    function parseGraphInput(text) {
        // Try edge list format: 0-1, 0-2, ...
        if (text.includes('-')) {
            const adjacencyList = {};
            const edges = text.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);

            for (const edge of edges) {
                const parts = edge.split(/[-→>]+/).map(s => parseInt(s.trim()));
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    const [a, b] = parts;
                    if (!adjacencyList[a]) adjacencyList[a] = [];
                    if (!adjacencyList[b]) adjacencyList[b] = [];
                    if (!adjacencyList[a].includes(b)) adjacencyList[a].push(b);
                    if (!adjacencyList[b].includes(a)) adjacencyList[b].push(a);
                }
            }

            return Object.keys(adjacencyList).length > 0 ? adjacencyList : null;
        }

        // Try adjacency list format: 0: 1 2\n1: 0 3 4
        if (text.includes(':')) {
            const adjacencyList = {};
            const lines = text.split('\n').map(s => s.trim()).filter(Boolean);

            for (const line of lines) {
                const [nodeStr, neighborsStr] = line.split(':');
                const node = parseInt(nodeStr.trim());
                if (isNaN(node)) continue;

                const neighbors = (neighborsStr || '').split(/[,\s]+/)
                    .map(s => parseInt(s.trim()))
                    .filter(n => !isNaN(n));

                adjacencyList[node] = neighbors;
            }

            return Object.keys(adjacencyList).length > 0 ? adjacencyList : null;
        }

        return null;
    }

    /**
     * Generate basic syntax-highlighted HTML from code text.
     * Returns HTML string with span-wrapped tokens.
     */
    function highlightCode(codeText) {
        let html = escapeHtml(codeText);

        // Store protected spans (comments, strings) to prevent re-processing
        const protectedSpans = [];
        function protect(match, className) {
            const idx = protectedSpans.length;
            protectedSpans.push(`<span class="${className}">${match}</span>`);
            return `\x00PROTECTED_${idx}\x00`;
        }

        // Comments: // ... and /* ... */  (protect first)
        html = html.replace(/(\/\/.*?)$/gm, (m) => protect(m, 'code-comment'));
        html = html.replace(/(\/\*[\s\S]*?\*\/)/g, (m) => protect(m, 'code-comment'));

        // Strings (protect)
        html = html.replace(/(&quot;[^&]*?&quot;|"[^"]*?")/g, (m) => protect(m, 'code-string'));

        // #include / #define
        html = html.replace(/(#\w+)/g, '<span class="code-preprocessor">$1</span>');

        // Numbers (but not inside words)
        html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="code-number">$1</span>');

        // Control flow keywords
        ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return'].forEach(kw => {
            const regex = new RegExp(`\\b(${kw})\\b`, 'g');
            html = html.replace(regex, '<span class="code-keyword-control">$1</span>');
        });

        // Type keywords
        ['void', 'int', 'bool', 'float', 'double', 'char', 'string', 'vector', 'queue', 'stack'].forEach(kw => {
            const regex = new RegExp(`\\b(${kw})\\b`, 'g');
            html = html.replace(regex, '<span class="code-keyword-type">$1</span>');
        });

        // Function calls (word followed by parenthesis)
        html = html.replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="code-function">$1</span>');

        // Restore protected spans
        protectedSpans.forEach((span, idx) => {
            html = html.replace(`\x00PROTECTED_${idx}\x00`, span);
        });

        return html;
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Generate line numbers HTML for N lines
     */
    function generateLineNumbers(lineCount) {
        return Array.from({ length: lineCount }, (_, i) => i + 1).join('<br>');
    }

    return {
        detectAlgorithm,
        extractArrayFromCode,
        parseNumberList,
        parsePlaygroundInput,
        parseGraphInput,
        highlightCode,
        generateLineNumbers,
    };
})();

export default Parser;
