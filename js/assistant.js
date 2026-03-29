/* ======================================
   NeuroCode — AI Assistant (Simulated)
   Slide-out panel with algorithm explanations
   and contextual help. Uses pre-built knowledge base.
   ====================================== */

import StateStore from './state.js';
import { ALGORITHMS } from './algorithms.js';

const Assistant = (() => {
    let panelEl = null;
    let chatBody = null;
    let chatInput = null;
    let isOpen = false;

    // Pre-built knowledge base
    const KNOWLEDGE = {
        bubbleSort: {
            explanation: `**Bubble Sort** is the simplest sorting algorithm. It works by repeatedly comparing adjacent elements and swapping them if they're in the wrong order.\n\n**How it works:**\n1. Start from the first element\n2. Compare each pair of adjacent elements\n3. If they're in the wrong order, swap them\n4. After each pass, the largest unsorted element "bubbles" to its correct position\n5. Repeat until no swaps are needed\n\n**Best case:** O(n) — when array is already sorted\n**Worst case:** O(n²) — when array is reverse sorted`,
            tips: [
                'Add an early-exit flag — if no swaps occur in a pass, the array is sorted.',
                'Bubble Sort is stable — equal elements maintain their relative order.',
                'For small datasets (< 50 elements), Bubble Sort can outperform more complex algorithms due to low overhead.',
            ],
        },
        selectionSort: {
            explanation: `**Selection Sort** divides the array into sorted and unsorted regions. In each iteration, it finds the minimum element from the unsorted region and moves it to the end of the sorted region.\n\n**How it works:**\n1. Find the minimum element in the unsorted portion\n2. Swap it with the first unsorted element\n3. Move the boundary of the sorted portion one element forward\n4. Repeat until the entire array is sorted\n\n**Time:** O(n²) always\n**Space:** O(1)`,
            tips: [
                'Selection Sort makes the minimum number of swaps — O(n) swaps vs O(n²) for Bubble Sort.',
                'It\'s not stable — equal elements may change relative order.',
                'Useful when memory writes are costly (e.g., flash memory).',
            ],
        },
        mergeSort: {
            explanation: `**Merge Sort** is an efficient, stable, divide-and-conquer algorithm.\n\n**How it works:**\n1. Divide the array into two halves\n2. Recursively sort each half\n3. Merge the two sorted halves into one sorted array\n\nThe key operation is the **merge** step, which combines two sorted arrays in O(n) time.\n\n**Time:** O(n log n) — always\n**Space:** O(n) — needs extra array for merging`,
            tips: [
                'Merge Sort guarantees O(n log n) performance — unlike QuickSort which degrades to O(n²).',
                'It\'s the algorithm of choice for linked lists (no random access needed).',
                'The extra O(n) space is the main downside — consider in-place merge sort variants for memory-constrained environments.',
            ],
        },
        binarySearch: {
            explanation: `**Binary Search** finds a target value in a **sorted** array by repeatedly halving the search space.\n\n**How it works:**\n1. Compare target with the middle element\n2. If target equals middle — found!\n3. If target < middle — search the left half\n4. If target > middle — search the right half\n5. Repeat until found or search space is empty\n\n**Time:** O(log n)\n**Space:** O(1) iterative, O(log n) recursive`,
            tips: [
                'Array MUST be sorted first — unsorted arrays give incorrect results.',
                'Use `mid = left + (right - left) / 2` to prevent integer overflow.',
                'Binary Search can be extended to find first/last occurrence, insertion point, etc.',
            ],
        },
        bfs: {
            explanation: `**Breadth-First Search** explores a graph level by level, visiting all neighbors before going deeper.\n\n**How it works:**\n1. Start at the source node and add it to a queue\n2. While queue is not empty:\n   a. Dequeue a node\n   b. Visit all its unvisited neighbors\n   c. Add each unvisited neighbor to the queue\n3. Continue until queue is empty\n\n**Time:** O(V + E)\n**Space:** O(V) for the queue`,
            tips: [
                'BFS finds the shortest path in unweighted graphs.',
                'It uses a FIFO queue — this is what gives it the "level-by-level" behavior.',
                'BFS can detect cycles and find connected components.',
            ],
        },
        dfs: {
            explanation: `**Depth-First Search** explores as deep as possible along each branch before backtracking.\n\n**How it works:**\n1. Start at the source node\n2. Visit the node and mark as visited\n3. For each unvisited neighbor, recursively perform DFS\n4. Backtrack when no unvisited neighbors remain\n\n**Time:** O(V + E)\n**Space:** O(V) for the recursion stack`,
            tips: [
                'DFS uses a stack (or recursion) — this is what gives it the "go deep" behavior.',
                'It\'s great for: topological sorting, finding strongly connected components, maze solving.',
                'DFS does NOT guarantee the shortest path (unlike BFS).',
            ],
        },
    };

    // General knowledge for keyword matching
    const GENERAL_KNOWLEDGE = {
        'time complexity': 'Time complexity measures how the runtime grows as input size increases. Common complexities in order: O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ)',
        'space complexity': 'Space complexity measures the extra memory an algorithm uses. In-place algorithms use O(1) extra space. Merge Sort uses O(n). Recursive algorithms use O(depth) stack space.',
        'big o': 'Big O notation describes the upper bound of an algorithm\'s growth rate. O(n²) means the runtime grows quadratically with input size. We drop constants and lower-order terms.',
        'stable': 'A stable sorting algorithm preserves the relative order of equal elements. Bubble Sort and Merge Sort are stable. Selection Sort and Quick Sort are not.',
        'in-place': 'An in-place algorithm uses O(1) extra memory (modifies the array directly). Bubble Sort and Selection Sort are in-place. Merge Sort is NOT in-place.',
        'divide and conquer': 'Divide and Conquer breaks a problem into smaller subproblems, solves them recursively, and combines the results. Examples: Merge Sort, Quick Sort, Binary Search.',
        'recursion': 'Recursion is when a function calls itself with a smaller input. Every recursive algorithm needs a base case to stop. Recursion uses stack memory — deep recursion can cause stack overflow.',
        'graph': 'A graph is a collection of nodes (vertices) connected by edges. Graphs can be directed or undirected, weighted or unweighted. Common representations: adjacency list, adjacency matrix.',
    };

    /**
     * Initialize the assistant panel
     */
    function init() {
        panelEl = document.getElementById('ai-assistant-panel');
        chatBody = document.getElementById('assistant-chat-body');
        chatInput = document.getElementById('assistant-input');

        if (!panelEl) return;

        // Toggle button
        const toggleBtn = document.getElementById('btn-assistant-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggle);
        }

        // Close button inside panel
        const closeBtn = document.getElementById('btn-assistant-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', close);
        }

        // Send button
        const sendBtn = document.getElementById('btn-assistant-send');
        if (sendBtn) {
            sendBtn.addEventListener('click', handleUserMessage);
        }

        // Enter key in input
        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleUserMessage();
                }
            });
        }

        // Auto-show welcome message
        addAssistantMessage('👋 Hi! I\'m your NeuroCode AI assistant. Ask me about algorithms, time complexity, or click "Explain" on any algorithm to learn more!');
    }

    function toggle() {
        isOpen ? close() : open();
    }

    function open() {
        if (!panelEl) return;
        panelEl.classList.add('assistant-open');
        isOpen = true;
    }

    function close() {
        if (!panelEl) return;
        panelEl.classList.remove('assistant-open');
        isOpen = false;
    }

    /**
     * Handle user message from input
     */
    function handleUserMessage() {
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (!text) return;

        addUserMessage(text);
        chatInput.value = '';

        // Simulate thinking delay
        setTimeout(() => {
            const response = generateResponse(text);
            addAssistantMessage(response);
        }, 400 + Math.random() * 600);
    }

    /**
     * Generate a response based on keyword matching
     */
    function generateResponse(query) {
        const lower = query.toLowerCase();

        // Check if asking about a specific algorithm
        for (const [key, algo] of Object.entries(ALGORITHMS)) {
            if (lower.includes(algo.name.toLowerCase()) || lower.includes(key.toLowerCase())) {
                const knowledge = KNOWLEDGE[key];
                if (knowledge) {
                    if (lower.includes('tip') || lower.includes('improve') || lower.includes('optim')) {
                        return '💡 **Tips for ' + algo.name + ':**\n\n' +
                            knowledge.tips.map((t, i) => `${i + 1}. ${t}`).join('\n\n');
                    }
                    return knowledge.explanation;
                }
            }
        }

        // Check general knowledge
        for (const [keyword, answer] of Object.entries(GENERAL_KNOWLEDGE)) {
            if (lower.includes(keyword)) {
                return answer;
            }
        }

        // Check for current algorithm context
        const currentAlgo = StateStore.get('currentAlgorithm');
        if (currentAlgo && KNOWLEDGE[currentAlgo]) {
            if (lower.includes('explain') || lower.includes('how') || lower.includes('what')) {
                return KNOWLEDGE[currentAlgo].explanation;
            }
            if (lower.includes('tip') || lower.includes('improve') || lower.includes('better')) {
                const k = KNOWLEDGE[currentAlgo];
                return '💡 **Tips:**\n\n' + k.tips.map((t, i) => `${i + 1}. ${t}`).join('\n\n');
            }
        }

        // Fallback responses
        const fallbacks = [
            'I can help you understand algorithms! Try asking:\n• "Explain Bubble Sort"\n• "What is time complexity?"\n• "Tips for Merge Sort"\n• "What is Big O notation?"',
            'Hmm, I\'m not sure about that. I specialize in algorithm explanations. Try asking about sorting, searching, or graph algorithms!',
            'That\'s a great question! While I can\'t answer that specifically, I can explain any of the algorithms in the library. What would you like to learn about?',
        ];

        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    /**
     * Explain a specific algorithm (called from library cards)
     */
    function explainAlgorithm(algorithmKey) {
        open();
        const knowledge = KNOWLEDGE[algorithmKey];
        const algo = ALGORITHMS[algorithmKey];

        if (knowledge && algo) {
            addAssistantMessage(`📚 **${algo.name}**\n\n${knowledge.explanation}`);

            setTimeout(() => {
                addAssistantMessage('💡 **Tips:**\n\n' +
                    knowledge.tips.map((t, i) => `${i + 1}. ${t}`).join('\n\n'));
            }, 800);
        }
    }

    // ── Chat UI helpers ──

    function addUserMessage(text) {
        if (!chatBody) return;
        const msg = document.createElement('div');
        msg.className = 'chat-message chat-user';
        msg.innerHTML = `<div class="chat-bubble chat-bubble-user">${escapeHtml(text)}</div>`;
        chatBody.appendChild(msg);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function addAssistantMessage(text) {
        if (!chatBody) return;
        const msg = document.createElement('div');
        msg.className = 'chat-message chat-assistant';
        msg.innerHTML = `<div class="chat-bubble chat-bubble-assistant">${formatMarkdown(text)}</div>`;
        chatBody.appendChild(msg);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function formatMarkdown(text) {
        // Simple markdown: **bold**, line breaks, numbered lists
        return escapeHtml(text)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/• /g, '&bull; ');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return { init, toggle, open, close, explainAlgorithm };
})();

export default Assistant;
