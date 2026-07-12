const fs = require('fs');
let content = fs.readFileSync('js/algorithms.js', 'utf8');

const newFunctions = `
export function prims(inputGraph, startNode) {
    if (typeof startNode === 'string') startNode = parseInt(startNode);
    if (isNaN(startNode)) startNode = 0;

    const { adjacencyList, nodes, edgeWeights = {} } = inputGraph;
    if (!nodes || nodes.length === 0) return { steps: [], complexity: { time: 'O(E log V)', space: 'O(V)' } };
    
    if (!nodes.includes(startNode)) startNode = nodes[0];

    const steps = [];
    const mstSet = new Set();
    const edgeHighlights = {};
    const visited = new Set();
    
    steps.push({
        graph: { adjacencyList, nodes, edgeWeights },
        visited: new Set(visited),
        currentNode: startNode,
        action: 'start',
        description: \`Starting Prim's MST from node \${startNode}.\`,
        highlights: [{ node: startNode, type: 'current' }],
        edgeHighlights: { ...edgeHighlights }
    });

    visited.add(startNode);
    mstSet.add(startNode);
    let totalWeight = 0;

    while (mstSet.size < nodes.length) {
        let minWeight = Infinity;
        let minEdge = null;
        
        for (const u of mstSet) {
            const neighbors = adjacencyList[u] || [];
            for (const v of neighbors) {
                if (!mstSet.has(v)) {
                    const exactKey = \`\${u}-\${v}\`;
                    const exactKeyRev = \`\${v}-\${u}\`;
                    let w = edgeWeights[exactKey] !== undefined ? edgeWeights[exactKey] : 
                            (edgeWeights[exactKeyRev] !== undefined ? edgeWeights[exactKeyRev] : 1);
                    
                    if (w < minWeight) {
                        minWeight = w;
                        minEdge = { u, v };
                    }
                }
            }
        }

        if (!minEdge) break;

        const edgeKeyStr = \`\${Math.min(minEdge.u, minEdge.v)}-\${Math.max(minEdge.u, minEdge.v)}\`;
        
        steps.push({
            graph: { adjacencyList, nodes, edgeWeights },
            visited: new Set(visited),
            currentNode: minEdge.u,
            action: 'comparing',
            description: \`Found minimum edge \${minEdge.u}-\${minEdge.v} with weight \${minWeight}.\`,
            highlights: [
                { node: minEdge.u, type: 'current' },
                { node: minEdge.v, type: 'compare' }
            ],
            edgeHighlights: { ...edgeHighlights, [edgeKeyStr]: 'compare' }
        });

        visited.add(minEdge.v);
        mstSet.add(minEdge.v);
        edgeHighlights[edgeKeyStr] = 'mst';
        totalWeight += minWeight;

        steps.push({
            graph: { adjacencyList, nodes, edgeWeights },
            visited: new Set(visited),
            currentNode: minEdge.v,
            action: 'added',
            description: \`Added node \${minEdge.v} to MST. Total weight: \${totalWeight}.\`,
            highlights: [{ node: minEdge.v, type: 'current' }],
            edgeHighlights: { ...edgeHighlights }
        });
    }

    steps.push({
        graph: { adjacencyList, nodes, edgeWeights },
        visited: new Set(visited),
        currentNode: null,
        action: 'done',
        description: \`Prim's MST complete! Total weight: \${totalWeight}.\`,
        highlights: [],
        edgeHighlights: { ...edgeHighlights }
    });

    return { steps, complexity: { time: 'O(E log V)', space: 'O(V)' } };
}

export function kruskals(inputGraph) {
    const { adjacencyList, nodes, edgeWeights = {} } = inputGraph;
    if (!nodes || nodes.length === 0) return { steps: [], complexity: { time: 'O(E log E)', space: 'O(V)' } };

    const steps = [];
    const edgeHighlights = {};
    const visited = new Set();
    
    const edges = [];
    const addedEdges = new Set();
    for (const u of nodes) {
        const neighbors = adjacencyList[u] || [];
        for (const v of neighbors) {
            const minNode = Math.min(u, v);
            const maxNode = Math.max(u, v);
            const edgeKey = \`\${minNode}-\${maxNode}\`;
            if (!addedEdges.has(edgeKey)) {
                addedEdges.add(edgeKey);
                let w = edgeWeights[\`\${u}-\${v}\`] !== undefined ? edgeWeights[\`\${u}-\${v}\`] : 
                        (edgeWeights[\`\${v}-\${u}\`] !== undefined ? edgeWeights[\`\${v}-\${u}\`] : 1);
                edges.push({ u, v, w, key: edgeKey });
            }
        }
    }

    edges.sort((a, b) => a.w - b.w);

    steps.push({
        graph: { adjacencyList, nodes, edgeWeights },
        visited: new Set(visited),
        currentNode: null,
        action: 'start',
        description: \`Starting Kruskal's MST. Sorted \${edges.length} edges by weight.\`,
        highlights: [],
        edgeHighlights: { ...edgeHighlights }
    });

    const parent = {};
    nodes.forEach(n => parent[n] = n);

    function find(i) {
        if (parent[i] == i) return i;
        return parent[i] = find(parent[i]);
    }

    function union(i, j) {
        const rootI = find(i);
        const rootJ = find(j);
        if (rootI != rootJ) {
            parent[rootI] = rootJ;
            return true;
        }
        return false;
    }

    let mstEdges = 0;
    let totalWeight = 0;

    for (const edge of edges) {
        if (mstEdges === nodes.length - 1) break;

        steps.push({
            graph: { adjacencyList, nodes, edgeWeights },
            visited: new Set(visited),
            currentNode: edge.u,
            action: 'comparing',
            description: \`Considering edge \${edge.u}-\${edge.v} with weight \${edge.w}.\`,
            highlights: [{ node: edge.u, type: 'current' }, { node: edge.v, type: 'compare' }],
            edgeHighlights: { ...edgeHighlights, [edge.key]: 'compare' }
        });

        if (union(edge.u, edge.v)) {
            visited.add(edge.u);
            visited.add(edge.v);
            edgeHighlights[edge.key] = 'mst';
            totalWeight += edge.w;
            mstEdges++;

            steps.push({
                graph: { adjacencyList, nodes, edgeWeights },
                visited: new Set(visited),
                currentNode: edge.v,
                action: 'added',
                description: \`Edge \${edge.u}-\${edge.v} added to MST. Total weight: \${totalWeight}.\`,
                highlights: [{ node: edge.u, type: 'current' }, { node: edge.v, type: 'current' }],
                edgeHighlights: { ...edgeHighlights }
            });
        } else {
            edgeHighlights[edge.key] = 'discard';
            steps.push({
                graph: { adjacencyList, nodes, edgeWeights },
                visited: new Set(visited),
                currentNode: edge.v,
                action: 'discard',
                description: \`Edge \${edge.u}-\${edge.v} discarded (forms a cycle).\`,
                highlights: [{ node: edge.u, type: 'compare' }, { node: edge.v, type: 'compare' }],
                edgeHighlights: { ...edgeHighlights }
            });
            delete edgeHighlights[edge.key];
        }
    }

    steps.push({
        graph: { adjacencyList, nodes, edgeWeights },
        visited: new Set(visited),
        currentNode: null,
        action: 'done',
        description: \`Kruskal's MST complete! Total weight: \${totalWeight}.\`,
        highlights: [],
        edgeHighlights: { ...edgeHighlights }
    });

    return { steps, complexity: { time: 'O(E log E)', space: 'O(V)' } };
}

export function floydWarshall(inputGraph) {
    const { adjacencyList: origAdj, nodes, edgeWeights: origWeights = {} } = inputGraph;
    if (!nodes || nodes.length === 0) return { steps: [], complexity: { time: 'O(V^3)', space: 'O(V^2)' } };

    const steps = [];
    const n = nodes.length;
    const nodeToIndex = {};
    nodes.forEach((node, i) => nodeToIndex[node] = i);
    
    const dist = Array(n).fill(null).map(() => Array(n).fill(Infinity));
    for (let i = 0; i < n; i++) dist[i][i] = 0;
    
    let currentEdgeWeights = { ...origWeights };
    let adjacencyList = JSON.parse(JSON.stringify(origAdj));
    
    for (const u of nodes) {
        const neighbors = adjacencyList[u] || [];
        for (const v of neighbors) {
            let w = currentEdgeWeights[\`\${u}-\${v}\`] !== undefined ? currentEdgeWeights[\`\${u}-\${v}\`] : 
                    (currentEdgeWeights[\`\${v}-\${u}\`] !== undefined ? currentEdgeWeights[\`\${v}-\${u}\`] : 1);
            
            dist[nodeToIndex[u]][nodeToIndex[v]] = w;
            dist[nodeToIndex[v]][nodeToIndex[u]] = w;
        }
    }

    steps.push({
        graph: { adjacencyList: JSON.parse(JSON.stringify(adjacencyList)), nodes, edgeWeights: { ...currentEdgeWeights } },
        action: 'start',
        description: \`Starting Floyd-Warshall APSP algorithm.\`,
        highlights: [],
        edgeHighlights: {}
    });

    for (let k = 0; k < n; k++) {
        const nodeK = nodes[k];
        
        steps.push({
            graph: { adjacencyList: JSON.parse(JSON.stringify(adjacencyList)), nodes, edgeWeights: { ...currentEdgeWeights } },
            action: 'k_phase',
            description: \`Phase: Considering node \${nodeK} as an intermediate vertex.\`,
            highlights: [{ node: nodeK, type: 'current' }],
            edgeHighlights: {}
        });

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (i === k || j === k) continue;
                
                const nodeI = nodes[i];
                const nodeJ = nodes[j];
                
                if (dist[i][k] !== Infinity && dist[k][j] !== Infinity) {
                    if (dist[i][k] + dist[k][j] < dist[i][j]) {
                        dist[i][j] = dist[i][k] + dist[k][j];
                        dist[j][i] = dist[i][j];
                        
                        const edgeKey = \`\${Math.min(nodeI, nodeJ)}-\${Math.max(nodeI, nodeJ)}\`;
                        currentEdgeWeights[edgeKey] = dist[i][j];
                        
                        if (!adjacencyList[nodeI].includes(nodeJ)) adjacencyList[nodeI].push(nodeJ);
                        if (!adjacencyList[nodeJ].includes(nodeI)) adjacencyList[nodeJ].push(nodeI);
                        
                        steps.push({
                            graph: { adjacencyList: JSON.parse(JSON.stringify(adjacencyList)), nodes, edgeWeights: { ...currentEdgeWeights } },
                            action: 'update',
                            description: \`Shorter path found between \${nodeI} and \${nodeJ} via \${nodeK}. New distance: \${dist[i][j]}\`,
                            highlights: [
                                { node: nodeK, type: 'current' },
                                { node: nodeI, type: 'compare' },
                                { node: nodeJ, type: 'compare' }
                            ],
                            edgeHighlights: {
                                [\`\${Math.min(nodeI, nodeK)}-\${Math.max(nodeI, nodeK)}\`]: 'compare',
                                [\`\${Math.min(nodeJ, nodeK)}-\${Math.max(nodeJ, nodeK)}\`]: 'compare',
                                [edgeKey]: 'mst'
                            }
                        });
                    }
                }
            }
        }
    }

    steps.push({
        graph: { adjacencyList, nodes, edgeWeights: currentEdgeWeights },
        action: 'done',
        description: \`Floyd-Warshall complete! All pairs shortest paths calculated.\`,
        highlights: [],
        edgeHighlights: {}
    });

    return { steps, complexity: { time: 'O(V^3)', space: 'O(V^2)' } };
}

`;

const graphData = `
        defaultData: {
            nodes: [0, 1, 2, 3, 4, 5],
            adjacencyList: {
                0: [1, 2],
                1: [0, 2, 3, 4],
                2: [0, 1, 5],
                3: [1, 4],
                4: [1, 3, 5],
                5: [2, 4]
            },
            edgeWeights: {
                '0-1': 4, '0-2': 4,
                '1-2': 2, '1-3': 3, '1-4': 2,
                '2-5': 5,
                '3-4': 3,
                '4-5': 3
            }
        },
`;

const registryEntries = `
    prims: {
        name: "Prim's MST",
        fn: prims,
        type: 'graph',
        category: 'Graph Theory',
${graphData}
        code: \`void primMST(vector<vector<pair<int, int>>>& adj, int V, int startNode) {
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
    vector<int> key(V, INT_MAX);
    vector<bool> inMST(V, false);
    
    pq.push({0, startNode});
    key[startNode] = 0;
    
    while (!pq.empty()) {
        int u = pq.top().second;
        pq.pop();
        
        inMST[u] = true;
        
        for (auto x : adj[u]) {
            int v = x.first;
            int weight = x.second;
            if (!inMST[v] && weight < key[v]) {
                key[v] = weight;
                pq.push({key[v], v});
            }
        }
    }
}\`,
        description: 'Finds a Minimum Spanning Tree for a weighted undirected graph by building the tree one vertex at a time, from an arbitrary starting vertex.',
    },
    kruskals: {
        name: "Kruskal's MST",
        fn: kruskals,
        type: 'graph',
        category: 'Graph Theory',
${graphData}
        code: \`struct Edge {
    int u, v, weight;
    bool operator<(Edge const& other) {
        return weight < other.weight;
    }
};

int find(int i, vector<int>& parent) {
    if (parent[i] == i) return i;
    return parent[i] = find(parent[i], parent);
}

void kruskalMST(vector<Edge>& edges, int V) {
    sort(edges.begin(), edges.end());
    vector<int> parent(V);
    for (int i = 0; i < V; i++) parent[i] = i;
    
    int mst_weight = 0;
    for (Edge e : edges) {
        int u = find(e.u, parent);
        int v = find(e.v, parent);
        if (u != v) {
            mst_weight += e.weight;
            parent[u] = v;
        }
    }
}\`,
        description: 'Finds a Minimum Spanning Tree for a connected weighted graph. It sorts all edges and adds them one by one to the MST as long as they do not form a cycle.',
    },
    floydWarshall: {
        name: "Floyd-Warshall APSP",
        fn: floydWarshall,
        type: 'graph',
        category: 'Graph Theory',
${graphData}
        code: \`void floydWarshall(vector<vector<int>>& dist, int V) {
    for (int k = 0; k < V; k++) {
        for (int i = 0; i < V; i++) {
            for (int j = 0; j < V; j++) {
                if (dist[i][k] != INT_MAX && dist[k][j] != INT_MAX) {
                    dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]);
                }
            }
        }
    }
}\`,
        description: 'An algorithm for finding shortest paths in a weighted graph with positive or negative edge weights (but with no negative cycles). It calculates the shortest distances between all pairs of vertices.',
    },
`;

content = content.replace(/\/\/ ─────────────────────────────────────────\r?\n\/\/ Algorithm Registry/, newFunctions + '\n// ─────────────────────────────────────────\n// Algorithm Registry');
content = content.replace('export const ALGORITHMS = {', 'export const ALGORITHMS = {\n' + registryEntries);

fs.writeFileSync('js/algorithms.js', content, 'utf8');
console.log("Patched algorithms.js successfully!");
