/* ======================================
   NeuroCode — Reactive State Store
   Pub/Sub pattern for decoupled state management
   ====================================== */

const StateStore = (() => {
    // Internal state
    const _state = {
        currentStep: 0,
        totalSteps: 0,
        isPlaying: false,
        speed: 1.5,          // multiplier (0.5x to 4x)
        currentAlgorithm: null, // 'bubbleSort' | 'selectionSort' | 'mergeSort' | 'binarySearch' | 'bfs' | 'dfs'
        inputData: [],        // the raw input (array of numbers, graph edges, etc.)
        steps: [],            // array of step snapshots from algorithm
        complexity: { time: '', space: '' },
        comparisons: 0,
        swaps: 0,
        visualizationType: 'bars', // 'bars' | 'graph' | 'linkedlist'
        savedProjects: [],
        editorCode: '',
    };

    // Subscribers: { key: [callback, ...] }
    const _subscribers = {};

    // Wildcard subscribers (listen to ALL changes)
    const _wildcardSubs = [];

    /**
     * Get a state value
     */
    function get(key) {
        return _state[key];
    }

    /**
     * Get entire state snapshot (shallow copy)
     */
    function getAll() {
        return { ..._state };
    }

    /**
     * Set a single state value and notify subscribers
     */
    function set(key, value) {
        const oldValue = _state[key];
        _state[key] = value;

        // Notify key-specific subscribers
        if (_subscribers[key]) {
            _subscribers[key].forEach(cb => cb(value, oldValue, key));
        }

        // Notify wildcard subscribers
        _wildcardSubs.forEach(cb => cb(key, value, oldValue));
    }

    /**
     * Batch-set multiple values, then notify
     */
    function setMany(updates) {
        const changes = [];
        for (const [key, value] of Object.entries(updates)) {
            const oldValue = _state[key];
            _state[key] = value;
            changes.push({ key, value, oldValue });
        }

        // Notify after all values are set
        changes.forEach(({ key, value, oldValue }) => {
            if (_subscribers[key]) {
                _subscribers[key].forEach(cb => cb(value, oldValue, key));
            }
            _wildcardSubs.forEach(cb => cb(key, value, oldValue));
        });
    }

    /**
     * Subscribe to a specific state key
     * Returns unsubscribe function
     */
    function subscribe(key, callback) {
        if (!_subscribers[key]) _subscribers[key] = [];
        _subscribers[key].push(callback);

        return () => {
            _subscribers[key] = _subscribers[key].filter(cb => cb !== callback);
        };
    }

    /**
     * Subscribe to all state changes
     */
    function subscribeAll(callback) {
        _wildcardSubs.push(callback);
        return () => {
            const idx = _wildcardSubs.indexOf(callback);
            if (idx !== -1) _wildcardSubs.splice(idx, 1);
        };
    }

    /**
     * Reset visualization state (keeps speed, savedProjects)
     */
    function resetVisualization() {
        setMany({
            currentStep: 0,
            totalSteps: 0,
            isPlaying: false,
            steps: [],
            comparisons: 0,
            swaps: 0,
            complexity: { time: '', space: '' },
        });
    }

    return {
        get,
        getAll,
        set,
        setMany,
        subscribe,
        subscribeAll,
        resetVisualization,
    };
})();

export default StateStore;
