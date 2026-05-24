/* ======================================
   NeuroCode — Algorithm Implementations
   Each algorithm generates step-by-step snapshots
   for the visualizer to render.
   ====================================== */

/**
 * Step shape:
 * {
 *   array: number[],              // current state of array
 *   highlights: { index: number, type: 'compare'|'swap'|'sorted'|'current'|'found'|'left'|'right'|'mid' }[],
 *   action: 'comparing'|'swapping'|'sorted'|'done'|'searching'|'visiting'|'found',
 *   description: string,          // human-readable step explanation
 *   comparisons: number,          // running total
 *   swaps: number,                // running total
 * }
 */

// ─────────────────────────────────────────
// BUBBLE SORT
// ─────────────────────────────────────────
export function bubbleSort(inputArray) {
    const arr = [...inputArray];
    const n = arr.length;
    const steps = [];
    let comparisons = 0;
    let swaps = 0;

    // Initial state
    steps.push({
        array: [...arr],
        highlights: [],
        action: 'start',
        description: 'Starting Bubble Sort — will compare adjacent elements and swap if needed.',
        comparisons: 0,
        swaps: 0,
    });

    for (let i = 0; i < n - 1; i++) {
        let swapped = false;

        for (let j = 0; j < n - i - 1; j++) {
            comparisons++;

            // Show comparison
            steps.push({
                array: [...arr],
                highlights: [
                    { index: j, type: 'compare' },
                    { index: j + 1, type: 'compare' },
                ],
                action: 'comparing',
                description: `Comparing arr[${j}] = ${arr[j]} with arr[${j + 1}] = ${arr[j + 1]}`,
                comparisons,
                swaps,
            });

            if (arr[j] > arr[j + 1]) {
                // Swap
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                swaps++;
                swapped = true;

                steps.push({
                    array: [...arr],
                    highlights: [
                        { index: j, type: 'swap' },
                        { index: j + 1, type: 'swap' },
                    ],
                    action: 'swapping',
                    description: `Swapped ${arr[j + 1]} and ${arr[j]} — ${arr[j + 1]} > ${arr[j]}`,
                    comparisons,
                    swaps,
                });
            }
        }

        // Mark the last element of this pass as sorted
        steps.push({
            array: [...arr],
            highlights: [{ index: n - i - 1, type: 'sorted' }],
            action: 'sorted',
            description: `Pass ${i + 1} complete — element ${arr[n - i - 1]} is in its final position.`,
            comparisons,
            swaps,
        });

        if (!swapped) break;
    }

    // Final sorted state
    const allSorted = arr.map((_, idx) => ({ index: idx, type: 'sorted' }));
    steps.push({
        array: [...arr],
        highlights: allSorted,
        action: 'done',
        description: `Bubble Sort complete! ${comparisons} comparisons, ${swaps} swaps.`,
        comparisons,
        swaps,
    });

    return {
        steps,
        complexity: { time: 'O(n²)', space: 'O(1)' },
    };
}

// ─────────────────────────────────────────
// SELECTION SORT
// ─────────────────────────────────────────
export function selectionSort(inputArray) {
    const arr = [...inputArray];
    const n = arr.length;
    const steps = [];
    let comparisons = 0;
    let swaps = 0;

    steps.push({
        array: [...arr],
        highlights: [],
        action: 'start',
        description: 'Starting Selection Sort — find the minimum element in each pass and place it at the beginning.',
        comparisons: 0,
        swaps: 0,
    });

    for (let i = 0; i < n - 1; i++) {
        let minIdx = i;

        steps.push({
            array: [...arr],
            highlights: [{ index: i, type: 'current' }],
            action: 'searching',
            description: `Pass ${i + 1}: Looking for the minimum element starting from index ${i}.`,
            comparisons,
            swaps,
        });

        for (let j = i + 1; j < n; j++) {
            comparisons++;

            steps.push({
                array: [...arr],
                highlights: [
                    { index: minIdx, type: 'current' },
                    { index: j, type: 'compare' },
                ],
                action: 'comparing',
                description: `Comparing current min arr[${minIdx}] = ${arr[minIdx]} with arr[${j}] = ${arr[j]}`,
                comparisons,
                swaps,
            });

            if (arr[j] < arr[minIdx]) {
                minIdx = j;
            }
        }

        if (minIdx !== i) {
            [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
            swaps++;

            steps.push({
                array: [...arr],
                highlights: [
                    { index: i, type: 'swap' },
                    { index: minIdx, type: 'swap' },
                ],
                action: 'swapping',
                description: `Swapping arr[${i}] and arr[${minIdx}] — placing ${arr[i]} at position ${i}.`,
                comparisons,
                swaps,
            });
        }

        steps.push({
            array: [...arr],
            highlights: [{ index: i, type: 'sorted' }],
            action: 'sorted',
            description: `Element ${arr[i]} is now in its final position at index ${i}.`,
            comparisons,
            swaps,
        });
    }

    const allSorted = arr.map((_, idx) => ({ index: idx, type: 'sorted' }));
    steps.push({
        array: [...arr],
        highlights: allSorted,
        action: 'done',
        description: `Selection Sort complete! ${comparisons} comparisons, ${swaps} swaps.`,
        comparisons,
        swaps,
    });

    return {
        steps,
        complexity: { time: 'O(n²)', space: 'O(1)' },
    };
}

// ─────────────────────────────────────────
// MERGE SORT
// ─────────────────────────────────────────
export function mergeSort(inputArray) {
    const arr = [...inputArray];
    const n = arr.length;
    const steps = [];
    let comparisons = 0;
    let swaps = 0; // merge-moves count

    steps.push({
        array: [...arr],
        highlights: [],
        action: 'start',
        description: 'Starting Merge Sort — divide array into halves, sort, then merge.',
        comparisons: 0,
        swaps: 0,
    });

    function mergeSortRecursive(arr, left, right) {
        if (left >= right) return;

        const mid = Math.floor((left + right) / 2);

        // Show divide step
        const divideHighlights = [];
        for (let i = left; i <= mid; i++) divideHighlights.push({ index: i, type: 'left' });
        for (let i = mid + 1; i <= right; i++) divideHighlights.push({ index: i, type: 'right' });

        steps.push({
            array: [...arr],
            highlights: divideHighlights,
            action: 'searching',
            description: `Dividing: left[${left}..${mid}] and right[${mid + 1}..${right}]`,
            comparisons,
            swaps,
        });

        mergeSortRecursive(arr, left, mid);
        mergeSortRecursive(arr, mid + 1, right);
        merge(arr, left, mid, right);
    }

    function merge(arr, left, mid, right) {
        const leftArr = arr.slice(left, mid + 1);
        const rightArr = arr.slice(mid + 1, right + 1);
        let i = 0, j = 0, k = left;

        while (i < leftArr.length && j < rightArr.length) {
            comparisons++;

            steps.push({
                array: [...arr],
                highlights: [
                    { index: left + i, type: 'compare' },
                    { index: mid + 1 + j, type: 'compare' },
                ],
                action: 'comparing',
                description: `Merging: comparing ${leftArr[i]} and ${rightArr[j]}`,
                comparisons,
                swaps,
            });

            if (leftArr[i] <= rightArr[j]) {
                arr[k] = leftArr[i];
                i++;
            } else {
                arr[k] = rightArr[j];
                j++;
            }
            swaps++;
            k++;

            steps.push({
                array: [...arr],
                highlights: [{ index: k - 1, type: 'swap' }],
                action: 'swapping',
                description: `Placed ${arr[k - 1]} at position ${k - 1}`,
                comparisons,
                swaps,
            });
        }

        while (i < leftArr.length) {
            arr[k] = leftArr[i];
            swaps++;
            i++;
            k++;
        }

        while (j < rightArr.length) {
            arr[k] = rightArr[j];
            swaps++;
            j++;
            k++;
        }

        // Show merged section
        const mergedHighlights = [];
        for (let x = left; x <= right; x++) mergedHighlights.push({ index: x, type: 'sorted' });

        steps.push({
            array: [...arr],
            highlights: mergedHighlights,
            action: 'sorted',
            description: `Merged section [${left}..${right}]: [${arr.slice(left, right + 1).join(', ')}]`,
            comparisons,
            swaps,
        });
    }

    mergeSortRecursive(arr, 0, n - 1);

    const allSorted = arr.map((_, idx) => ({ index: idx, type: 'sorted' }));
    steps.push({
        array: [...arr],
        highlights: allSorted,
        action: 'done',
        description: `Merge Sort complete! ${comparisons} comparisons, ${swaps} moves.`,
        comparisons,
        swaps,
    });

    return {
        steps,
        complexity: { time: 'O(n log n)', space: 'O(n)' },
    };
}

// ─────────────────────────────────────────
// BINARY SEARCH
// ─────────────────────────────────────────
export function binarySearch(inputArray, target) {
    // Sort first for binary search
    const arr = [...inputArray].sort((a, b) => a - b);
    const steps = [];
    let comparisons = 0;
    let left = 0;
    let right = arr.length - 1;

    // If no target, pick a random element from the array
    if (target === undefined || target === null) {
        target = arr[Math.floor(Math.random() * arr.length)];
    }

    steps.push({
        array: [...arr],
        highlights: [],
        action: 'start',
        description: `Starting Binary Search — looking for ${target} in sorted array.`,
        comparisons: 0,
        swaps: 0,
    });

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        comparisons++;

        steps.push({
            array: [...arr],
            highlights: [
                { index: left, type: 'left' },
                { index: right, type: 'right' },
                { index: mid, type: 'mid' },
            ],
            action: 'searching',
            description: `Checking mid = ${mid}: arr[${mid}] = ${arr[mid]}, target = ${target} | range [${left}..${right}]`,
            comparisons,
            swaps: 0,
        });

        if (arr[mid] === target) {
            steps.push({
                array: [...arr],
                highlights: [{ index: mid, type: 'found' }],
                action: 'found',
                description: `Found ${target} at index ${mid}! Took ${comparisons} comparisons.`,
                comparisons,
                swaps: 0,
            });

            return {
                steps,
                complexity: { time: 'O(log n)', space: 'O(1)' },
            };
        } else if (arr[mid] < target) {
            steps.push({
                array: [...arr],
                highlights: [
                    { index: mid, type: 'compare' },
                ],
                action: 'comparing',
                description: `arr[${mid}] = ${arr[mid]} < ${target} — search right half.`,
                comparisons,
                swaps: 0,
            });
            left = mid + 1;
        } else {
            steps.push({
                array: [...arr],
                highlights: [
                    { index: mid, type: 'compare' },
                ],
                action: 'comparing',
                description: `arr[${mid}] = ${arr[mid]} > ${target} — search left half.`,
                comparisons,
                swaps: 0,
            });
            right = mid - 1;
        }
    }

    // Not found
    steps.push({
        array: [...arr],
        highlights: [],
        action: 'done',
        description: `${target} not found in array. Took ${comparisons} comparisons.`,
        comparisons,
        swaps: 0,
    });

    return {
        steps,
        complexity: { time: 'O(log n)', space: 'O(1)' },
    };
}

// ─────────────────────────────────────────
// BFS (Breadth First Search)
// ─────────────────────────────────────────
export function bfs(adjacencyList, startNode = 0) {
    const steps = [];
    const visited = new Set();
    const queue = [startNode];
    visited.add(startNode);
    let visitOrder = 0;

    const nodes = Object.keys(adjacencyList).map(Number);

    steps.push({
        graph: { adjacencyList, nodes },
        visited: new Set(),
        queue: [startNode],
        currentNode: null,
        action: 'start',
        description: `Starting BFS from node ${startNode}. Queue: [${startNode}]`,
        highlights: [],
    });

    while (queue.length > 0) {
        const node = queue.shift();
        visitOrder++;

        steps.push({
            graph: { adjacencyList, nodes },
            visited: new Set(visited),
            queue: [...queue],
            currentNode: node,
            action: 'visiting',
            description: `Visiting node ${node} (visit #${visitOrder}). Queue: [${queue.join(', ')}]`,
            highlights: [{ node, type: 'current' }],
        });

        const neighbors = adjacencyList[node] || [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);

                steps.push({
                    graph: { adjacencyList, nodes },
                    visited: new Set(visited),
                    queue: [...queue],
                    currentNode: node,
                    action: 'searching',
                    description: `Discovered unvisited neighbor ${neighbor} — added to queue. Queue: [${queue.join(', ')}]`,
                    highlights: [
                        { node, type: 'current' },
                        { node: neighbor, type: 'compare' },
                    ],
                });
            }
        }
    }

    steps.push({
        graph: { adjacencyList, nodes },
        visited: new Set(visited),
        queue: [],
        currentNode: null,
        action: 'done',
        description: `BFS complete! Visited ${visited.size} nodes.`,
        highlights: [],
    });

    return {
        steps,
        complexity: { time: 'O(V + E)', space: 'O(V)' },
    };
}

// ─────────────────────────────────────────
// DFS (Depth First Search)
// ─────────────────────────────────────────
export function dfs(adjacencyList, startNode = 0) {
    const steps = [];
    const visited = new Set();
    const nodes = Object.keys(adjacencyList).map(Number);
    let visitOrder = 0;

    steps.push({
        graph: { adjacencyList, nodes },
        visited: new Set(),
        stack: [startNode],
        currentNode: null,
        action: 'start',
        description: `Starting DFS from node ${startNode}.`,
        highlights: [],
    });

    function dfsRecursive(node) {
        visited.add(node);
        visitOrder++;

        steps.push({
            graph: { adjacencyList, nodes },
            visited: new Set(visited),
            currentNode: node,
            action: 'visiting',
            description: `Visiting node ${node} (visit #${visitOrder}). Exploring depth-first.`,
            highlights: [{ node, type: 'current' }],
        });

        const neighbors = adjacencyList[node] || [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                steps.push({
                    graph: { adjacencyList, nodes },
                    visited: new Set(visited),
                    currentNode: node,
                    action: 'searching',
                    description: `Going deeper: node ${node} → neighbor ${neighbor}`,
                    highlights: [
                        { node, type: 'current' },
                        { node: neighbor, type: 'compare' },
                    ],
                });

                dfsRecursive(neighbor);

                // Backtrack step
                steps.push({
                    graph: { adjacencyList, nodes },
                    visited: new Set(visited),
                    currentNode: node,
                    action: 'comparing',
                    description: `Backtracking to node ${node}.`,
                    highlights: [{ node, type: 'current' }],
                });
            }
        }
    }

    dfsRecursive(startNode);

    steps.push({
        graph: { adjacencyList, nodes },
        visited: new Set(visited),
        currentNode: null,
        action: 'done',
        description: `DFS complete! Visited ${visited.size} nodes.`,
        highlights: [],
    });

    return {
        steps,
        complexity: { time: 'O(V + E)', space: 'O(V)' },
    };
}

export function quickSort(inputArray) {
    const arr = [...inputArray];
    const n = arr.length;
    const steps = [];
    let comparisons = 0;
    let swaps = 0;

    const sortedIndices = new Set();

    steps.push({
        array: [...arr],
        highlights: [],
        action: 'start',
        description: 'Starting Quick Sort — divide and conquer using Lomuto partitioning.',
        comparisons: 0,
        swaps: 0,
    });

    function quickSortRecursive(low, high) {
        if (low > high) return;
        if (low === high) {
            sortedIndices.add(low);
            steps.push({
                array: [...arr],
                highlights: Array.from(sortedIndices).map(idx => ({ index: idx, type: 'sorted' })),
                action: 'sorted',
                description: `Sub-array of size 1 [index ${low}]: element ${arr[low]} is sorted.`,
                comparisons,
                swaps,
            });
            return;
        }

        const pIdx = partition(low, high);
        quickSortRecursive(low, pIdx - 1);
        quickSortRecursive(pIdx + 1, high);
    }

    function partition(low, high) {
        const pivot = arr[high];
        const rangeHighlights = [];
        for (let idx = low; idx < high; idx++) {
            rangeHighlights.push({ index: idx, type: 'left' });
        }
        rangeHighlights.push({ index: high, type: 'mid' });
        Array.from(sortedIndices).forEach(idx => {
            rangeHighlights.push({ index: idx, type: 'sorted' });
        });

        steps.push({
            array: [...arr],
            highlights: rangeHighlights,
            action: 'searching',
            description: `Partitioning range [${low}..${high}] with pivot = ${pivot} at index ${high}`,
            comparisons,
            swaps,
        });

        let i = low - 1;
        for (let j = low; j < high; j++) {
            comparisons++;

            const compHighlights = [
                { index: j, type: 'compare' },
                { index: high, type: 'mid' }
            ];
            if (i >= low) compHighlights.push({ index: i, type: 'current' });
            Array.from(sortedIndices).forEach(idx => {
                if (idx !== j && idx !== high && idx !== i) {
                    compHighlights.push({ index: idx, type: 'sorted' });
                }
            });

            steps.push({
                array: [...arr],
                highlights: compHighlights,
                action: 'comparing',
                description: `Comparing arr[${j}] = ${arr[j]} with pivot = ${pivot}`,
                comparisons,
                swaps,
            });

            if (arr[j] < pivot) {
                i++;
                if (i !== j) {
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                    swaps++;

                    const swapHighlights = [
                        { index: i, type: 'swap' },
                        { index: j, type: 'swap' }
                    ];
                    Array.from(sortedIndices).forEach(idx => {
                        if (idx !== i && idx !== j) {
                            swapHighlights.push({ index: idx, type: 'sorted' });
                        }
                    });

                    steps.push({
                        array: [...arr],
                        highlights: swapHighlights,
                        action: 'swapping',
                        description: `Swapped arr[${i}] = ${arr[i]} and arr[${j}] = ${arr[j]} (element < pivot)`,
                        comparisons,
                        swaps,
                    });
                }
            }
        }

        const pivotPos = i + 1;
        if (pivotPos !== high) {
            [arr[pivotPos], arr[high]] = [arr[high], arr[pivotPos]];
            swaps++;

            const swapHighlights = [
                { index: pivotPos, type: 'swap' },
                { index: high, type: 'swap' }
            ];
            Array.from(sortedIndices).forEach(idx => {
                if (idx !== pivotPos && idx !== high) {
                    swapHighlights.push({ index: idx, type: 'sorted' });
                }
            });

            steps.push({
                array: [...arr],
                highlights: swapHighlights,
                action: 'swapping',
                description: `Placed pivot ${pivot} at its correct position index ${pivotPos}`,
                comparisons,
                swaps,
            });
        }

        sortedIndices.add(pivotPos);

        const sortedHighlights = Array.from(sortedIndices).map(idx => ({ index: idx, type: 'sorted' }));
        steps.push({
            array: [...arr],
            highlights: sortedHighlights,
            action: 'sorted',
            description: `Pivot element ${arr[pivotPos]} is now in its final position index ${pivotPos}`,
            comparisons,
            swaps,
        });

        return pivotPos;
    }

    quickSortRecursive(0, n - 1);

    const finalSortedHighlights = arr.map((_, idx) => ({ index: idx, type: 'sorted' }));
    steps.push({
        array: [...arr],
        highlights: finalSortedHighlights,
        action: 'done',
        description: `Quick Sort complete! ${comparisons} comparisons, ${swaps} swaps.`,
        comparisons,
        swaps,
    });

    return {
        steps,
        complexity: { time: 'O(n log n)', space: 'O(log n)' },
    };
}

export function linkedListInsert(inputArray, val, insertIdx) {
    const arr = [...inputArray];
    const steps = [];
    
    if (typeof val === 'string' && val.includes(',')) {
        const parts = val.split(',');
        const parsedVal = parseInt(parts[0].trim());
        const parsedIdx = parseInt(parts[1].trim());
        val = isNaN(parsedVal) ? 25 : parsedVal;
        insertIdx = isNaN(parsedIdx) ? 2 : parsedIdx;
    } else {
        if (val === undefined || val === null) {
            val = 25;
        } else {
            val = parseInt(val);
            if (isNaN(val)) val = 25;
        }
        if (insertIdx === undefined || insertIdx === null) {
            insertIdx = 2;
        } else {
            insertIdx = parseInt(insertIdx);
            if (isNaN(insertIdx)) insertIdx = 2;
        }
    }
    insertIdx = Math.max(0, Math.min(arr.length, insertIdx));

    steps.push({
        array: [...arr],
        highlights: [],
        pointers: [{ name: 'head', index: 0 }],
        action: 'start',
        description: `Starting Linked List Insertion. Target: insert value ${val} at index ${insertIdx}.`,
        comparisons: 0,
        swaps: 0,
    });

    steps.push({
        array: [...arr],
        highlights: [],
        pointers: [{ name: 'head', index: 0 }],
        newNode: { val: val, index: -1, state: 'detached' },
        action: 'visiting',
        description: `Allocated memory for a new node with data = ${val}.`,
        comparisons: 0,
        swaps: 0,
    });

    if (insertIdx === 0) {
        steps.push({
            array: [...arr],
            highlights: [{ index: 0, type: 'compare' }],
            pointers: [{ name: 'head', index: 0 }],
            newNode: { val: val, index: 0, state: 'pointing' },
            action: 'comparing',
            description: `Pointing new node's next link to current head node (value ${arr[0] || 'NULL'}).`,
            comparisons: 0,
            swaps: 0,
        });

        const newArr = [val, ...arr];
        steps.push({
            array: newArr,
            highlights: [{ index: 0, type: 'new' }],
            pointers: [{ name: 'head', index: 0 }],
            action: 'sorted',
            description: `Updated head pointer to point to the new node. Insertion at head complete!`,
            comparisons: 0,
            swaps: 1,
        });
    } else {
        let curr = 0;
        
        steps.push({
            array: [...arr],
            highlights: [{ index: 0, type: 'current' }],
            pointers: [
                { name: 'head', index: 0 },
                { name: 'curr', index: 0 }
            ],
            newNode: { val: val, index: -1, state: 'detached' },
            action: 'searching',
            description: `Starting traversal from head node to locate insertion predecessor (index ${insertIdx - 1}).`,
            comparisons: 0,
            swaps: 0,
        });

        for (let i = 1; i < insertIdx; i++) {
            curr = i;
            steps.push({
                array: [...arr],
                highlights: [{ index: curr, type: 'current' }],
                pointers: [
                    { name: 'head', index: 0 },
                    { name: 'prev', index: curr - 1 },
                    { name: 'curr', index: curr }
                ],
                newNode: { val: val, index: -1, state: 'detached' },
                action: 'searching',
                description: `Traversed to next node at index ${curr} (value ${arr[curr]}).`,
                comparisons: 0,
                swaps: 0,
            });
        }

        steps.push({
            array: [...arr],
            highlights: [{ index: curr, type: 'current' }],
            pointers: [
                { name: 'head', index: 0 },
                { name: 'curr', index: curr }
            ],
            newNode: { val: val, index: curr + 1, state: 'pointing' },
            action: 'comparing',
            description: `Pointing new node's next to index ${curr + 1} (value ${arr[curr + 1] || 'NULL'}).`,
            comparisons: 0,
            swaps: 0,
        });

        const newArr = [...arr];
        newArr.splice(insertIdx, 0, val);
        steps.push({
            array: newArr,
            highlights: [{ index: insertIdx, type: 'new' }],
            pointers: [
                { name: 'head', index: 0 },
                { name: 'curr', index: insertIdx - 1 },
                { name: 'new', index: insertIdx }
            ],
            action: 'sorted',
            description: `Updated previous node's next to point to the new node. Insertion complete!`,
            comparisons: 0,
            swaps: 1,
        });
    }

    steps.push({
        array: [...steps[steps.length - 1].array],
        highlights: [],
        pointers: [{ name: 'head', index: 0 }],
        action: 'done',
        description: `Linked List Insertion complete. New length: ${steps[steps.length - 1].array.length}`,
        comparisons: 0,
        swaps: 1,
    });

    return {
        steps,
        complexity: { time: 'O(N)', space: 'O(1)' },
    };
}

export function linkedListDelete(inputArray, deleteIdx) {
    const arr = [...inputArray];
    const steps = [];

    if (deleteIdx === undefined || deleteIdx === null) {
        deleteIdx = 2;
    } else {
        deleteIdx = parseInt(deleteIdx);
        if (isNaN(deleteIdx)) deleteIdx = 2;
    }
    if (arr.length === 0 || deleteIdx < 0 || deleteIdx >= arr.length) {
        steps.push({
            array: [...arr],
            highlights: [],
            pointers: arr.length > 0 ? [{ name: 'head', index: 0 }] : [],
            action: 'done',
            description: `Index ${deleteIdx} is out of bounds. Deletion aborted.`,
            comparisons: 0,
            swaps: 0,
        });
        return { steps, complexity: { time: 'O(1)', space: 'O(1)' } };
    }

    steps.push({
        array: [...arr],
        highlights: [],
        pointers: [{ name: 'head', index: 0 }],
        action: 'start',
        description: `Starting Linked List Deletion. Target: delete node at index ${deleteIdx}.`,
        comparisons: 0,
        swaps: 0,
    });

    if (deleteIdx === 0) {
        steps.push({
            array: [...arr],
            highlights: [{ index: 0, type: 'target' }],
            pointers: [{ name: 'head', index: 0 }],
            action: 'comparing',
            description: `Locating head node (index 0, value ${arr[0]}) for deletion.`,
            comparisons: 0,
            swaps: 0,
        });

        const newArr = arr.slice(1);
        steps.push({
            array: newArr,
            highlights: [],
            pointers: newArr.length > 0 ? [{ name: 'head', index: 0 }] : [],
            action: 'sorted',
            description: `Updated head pointer to point to next node. Deletion complete!`,
            comparisons: 0,
            swaps: 1,
        });
    } else {
        let curr = 0;

        steps.push({
            array: [...arr],
            highlights: [{ index: 0, type: 'current' }],
            pointers: [
                { name: 'head', index: 0 },
                { name: 'curr', index: 0 }
            ],
            action: 'searching',
            description: `Starting traversal from head node to locate deletion predecessor (index ${deleteIdx - 1}).`,
            comparisons: 0,
            swaps: 0,
        });

        for (let i = 1; i < deleteIdx; i++) {
            curr = i;
            steps.push({
                array: [...arr],
                highlights: [{ index: curr, type: 'current' }],
                pointers: [
                    { name: 'head', index: 0 },
                    { name: 'prev', index: curr - 1 },
                    { name: 'curr', index: curr }
                ],
                action: 'searching',
                description: `Traversed to next node at index ${curr} (value ${arr[curr]}).`,
                comparisons: 0,
                swaps: 0,
            });
        }

        steps.push({
            array: [...arr],
            highlights: [
                { index: curr, type: 'current' },
                { index: deleteIdx, type: 'target' }
            ],
            pointers: [
                { name: 'head', index: 0 },
                { name: 'curr', index: curr },
                { name: 'target', index: deleteIdx }
            ],
            action: 'comparing',
            description: `Predecessor located (value ${arr[curr]}). Target node to delete: value ${arr[deleteIdx]} at index ${deleteIdx}.`,
            comparisons: 0,
            swaps: 0,
        });

        steps.push({
            array: [...arr],
            highlights: [
                { index: curr, type: 'current' },
                { index: deleteIdx, type: 'target' }
            ],
            pointers: [
                { name: 'head', index: 0 },
                { name: 'curr', index: curr },
                { name: 'target', index: deleteIdx }
            ],
            bypassConnection: { from: curr, to: deleteIdx + 1 },
            action: 'swapping',
            description: `Updating predecessor's next pointer to bypass target node, pointing directly to index ${deleteIdx + 1} (value ${arr[deleteIdx + 1] || 'NULL'}).`,
            comparisons: 0,
            swaps: 0,
        });

        const newArr = [...arr];
        newArr.splice(deleteIdx, 1);
        steps.push({
            array: newArr,
            highlights: [],
            pointers: [{ name: 'head', index: 0 }],
            action: 'sorted',
            description: `Removed target node from memory. Deletion complete!`,
            comparisons: 0,
            swaps: 1,
        });
    }

    steps.push({
        array: [...steps[steps.length - 1].array],
        highlights: [],
        pointers: steps[steps.length - 1].pointers,
        action: 'done',
        description: `Linked List Deletion complete. New length: ${steps[steps.length - 1].array.length}`,
        comparisons: 0,
        swaps: 1,
    });

    return {
        steps,
        complexity: { time: 'O(N)', space: 'O(1)' },
    };
}

// ─────────────────────────────────────────
// Algorithm Registry
// ─────────────────────────────────────────
export const ALGORITHMS = {
    bubbleSort: {
        name: 'Bubble Sort',
        fn: bubbleSort,
        type: 'sorting',
        category: 'Sorting',
        defaultData: [45, 12, 56, 32, 8, 41, 28, 63],
        code: `void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        bool swapped = false;
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
                swapped = true;
            }
        }
        if (!swapped) break;
    }
}`,
        description: 'A simple comparison-based sorting algorithm that repeatedly steps through the list, compares adjacent elements and swaps them if they are in the wrong order.',
    },
    selectionSort: {
        name: 'Selection Sort',
        fn: selectionSort,
        type: 'sorting',
        category: 'Sorting',
        defaultData: [45, 12, 56, 32, 8, 41, 28, 63],
        code: `void selectionSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        int minIdx = i;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[minIdx])
                minIdx = j;
        }
        swap(arr[i], arr[minIdx]);
    }
}`,
        description: 'Finds the minimum element from the unsorted part and puts it at the beginning. Repeats for the entire array.',
    },
    mergeSort: {
        name: 'Merge Sort',
        fn: mergeSort,
        type: 'sorting',
        category: 'Sorting',
        defaultData: [45, 12, 56, 32, 8, 41, 28, 63],
        code: `void merge(int arr[], int l, int m, int r) {
    // Merge two sorted subarrays
    int n1 = m - l + 1, n2 = r - m;
    int L[n1], R[n2];
    for (int i = 0; i < n1; i++) L[i] = arr[l + i];
    for (int j = 0; j < n2; j++) R[j] = arr[m + 1 + j];
    int i = 0, j = 0, k = l;
    while (i < n1 && j < n2) {
        if (L[i] <= R[j]) arr[k++] = L[i++];
        else arr[k++] = R[j++];
    }
    while (i < n1) arr[k++] = L[i++];
    while (j < n2) arr[k++] = R[j++];
}

void mergeSort(int arr[], int l, int r) {
    if (l < r) {
        int m = l + (r - l) / 2;
        mergeSort(arr, l, m);
        mergeSort(arr, m + 1, r);
        merge(arr, l, m, r);
    }
}`,
        description: 'An efficient, stable, divide-and-conquer sorting algorithm. Breaks the input into smaller subarrays until they contain only one element, then merges them.',
    },
    binarySearch: {
        name: 'Binary Search',
        fn: binarySearch,
        type: 'searching',
        category: 'Searching',
        defaultData: [3, 8, 12, 18, 25, 32, 41, 56, 63, 78],
        code: `int binarySearch(int arr[], int n, int target) {
    int left = 0, right = n - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target)
            return mid;
        else if (arr[mid] < target)
            left = mid + 1;
        else
            right = mid - 1;
    }
    return -1; // not found
}`,
        description: 'A fast search algorithm for sorted arrays. Repeatedly divides the search interval in half until the target value is found or the interval is empty.',
    },
    bfs: {
        name: 'Breadth First Search',
        fn: bfs,
        type: 'graph',
        category: 'Graph Theory',
        defaultData: {
            0: [1, 2],
            1: [0, 3, 4],
            2: [0, 5],
            3: [1],
            4: [1, 5],
            5: [2, 4],
        },
        code: `void bfs(vector<vector<int>>& adj, int start) {
    vector<bool> visited(adj.size(), false);
    queue<int> q;
    q.push(start);
    visited[start] = true;
    while (!q.empty()) {
        int node = q.front(); q.pop();
        cout << node << " ";
        for (int neighbor : adj[node]) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                q.push(neighbor);
            }
        }
    }
}`,
        description: 'Traverses tree or graph structures by exploring all neighbor nodes at the present depth before moving on to nodes at the next depth level.',
    },
    dfs: {
        name: 'Depth First Search',
        fn: dfs,
        type: 'graph',
        category: 'Graph Theory',
        defaultData: {
            0: [1, 2],
            1: [0, 3, 4],
            2: [0, 5],
            3: [1],
            4: [1, 5],
            5: [2, 4],
        },
        code: `void dfs(vector<vector<int>>& adj, int node, vector<bool>& visited) {
    visited[node] = true;
    cout << node << " ";
    for (int neighbor : adj[node]) {
        if (!visited[neighbor]) {
            dfs(adj, neighbor, visited);
        }
    }
}`,
        description: 'Explores as far as possible along each branch before backtracking. Uses a stack (call stack for recursion) to remember which vertices to visit.',
    },
    quickSort: {
        name: 'Quick Sort',
        fn: quickSort,
        type: 'sorting',
        category: 'Sorting',
        defaultData: [45, 12, 56, 32, 8, 41, 28, 63],
        code: `void quickSort(int arr[], int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

int partition(int arr[], int low, int high) {
    int pivot = arr[high];
    int i = (low - 1);
    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            swap(arr[i], arr[j]);
        }
    }
    swap(arr[i + 1], arr[high]);
    return (i + 1);
}`,
        description: 'A divide-and-conquer sorting algorithm. Selects a pivot element and partitions the array such that elements smaller than the pivot are on the left and larger are on the right.',
    },
    linkedListInsert: {
        name: 'Linked List Insertion',
        fn: (inputArray, extraArgs) => {
            let val = 25;
            let insertIdx = 2;
            if (typeof extraArgs === 'string') {
                const parts = extraArgs.split(',').map(s => parseInt(s.trim()));
                if (parts.length >= 1 && !isNaN(parts[0])) val = parts[0];
                if (parts.length >= 2 && !isNaN(parts[1])) insertIdx = parts[1];
            } else if (Array.isArray(extraArgs)) {
                if (extraArgs.length >= 1 && extraArgs[0] !== undefined) val = extraArgs[0];
                if (extraArgs.length >= 2 && extraArgs[1] !== undefined) insertIdx = extraArgs[1];
            } else if (typeof extraArgs === 'number' && !isNaN(extraArgs)) {
                val = extraArgs;
            }
            return linkedListInsert(inputArray, val, insertIdx);
        },
        type: 'linkedlist',
        category: 'Linked List',
        defaultData: [10, 20, 30, 40],
        code: `struct Node {
    int data;
    Node* next;
    Node(int val) : data(val), next(nullptr) {}
};

Node* insertNode(Node* head, int val, int index) {
    Node* newNode = new Node(val);
    if (index == 0) {
        newNode->next = head;
        return newNode;
    }
    Node* curr = head;
    for (int i = 0; i < index - 1 && curr != nullptr; i++) {
        curr = curr->next;
    }
    if (curr != nullptr) {
        newNode->next = curr->next;
        curr->next = newNode;
    }
    return head;
}`,
        description: 'Inserts a new element at a specified position in the linked list. Traverses the list to find the node preceding the target index and updates pointer addresses.',
    },
    linkedListDelete: {
        name: 'Linked List Deletion',
        fn: (inputArray, extraArgs) => {
            let deleteIdx = 2;
            if (typeof extraArgs === 'number') {
                deleteIdx = extraArgs;
            } else if (typeof extraArgs === 'string' && !isNaN(parseInt(extraArgs))) {
                deleteIdx = parseInt(extraArgs);
            }
            return linkedListDelete(inputArray, deleteIdx);
        },
        type: 'linkedlist',
        category: 'Linked List',
        defaultData: [10, 20, 30, 40],
        code: `struct Node {
    int data;
    Node* next;
    Node(int val) : data(val), next(nullptr) {}
};

Node* deleteNode(Node* head, int index) {
    if (head == nullptr) return nullptr;
    if (index == 0) {
        Node* temp = head;
        head = head->next;
        delete temp;
        return head;
    }
    Node* curr = head;
    for (int i = 0; i < index - 1 && curr != nullptr; i++) {
        curr = curr->next;
    }
    if (curr != nullptr && curr->next != nullptr) {
        Node* temp = curr->next;
        curr->next = temp->next;
        delete temp;
    }
    return head;
}`,
        description: 'Deletes the element at a specified index in the linked list. Traverses to the node before the target index and updates links to bypass the deleted node.',
    },
};

/**
 * Run an algorithm by key with given input data
 */
export function runAlgorithm(algorithmKey, inputData, extraArgs) {
    const algo = ALGORITHMS[algorithmKey];
    if (!algo) {
        console.error(`Algorithm '${algorithmKey}' not found.`);
        return null;
    }

    // AI-generated algorithms use 'run' instead of 'fn'
    if (typeof algo.run === 'function') {
        return algo.run(inputData, extraArgs);
    }

    if (algo.type === 'graph') {
        return algo.fn(inputData, extraArgs || 0);
    } else if (algo.type === 'searching' || algo.type === 'linkedlist') {
        return algo.fn(inputData, extraArgs);
    } else {
        return algo.fn(inputData);
    }
}
