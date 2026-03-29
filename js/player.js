/* ======================================
   NeuroCode — Player Controls
   Connects footer UI controls to the
   visualization state machine.
   ====================================== */

import StateStore from './state.js';

const Player = (() => {
    let playInterval = null;
    let startTime = null;
    let elapsedBeforePause = 0;
    let timerInterval = null;

    // DOM refs
    let btnPlayPause, btnStepBack, btnStepForward, btnSkipStart, btnSkipEnd;
    let timelineProgress, timelineStepLabel, timelineTimeLabel;
    let speedSlider, speedValueLabel;

    /**
     * Initialize — bind to DOM and state
     */
    function init() {
        // Grab DOM elements
        btnPlayPause = document.getElementById('btn-play-pause');
        btnStepBack = document.getElementById('btn-step-back');
        btnStepForward = document.getElementById('btn-step-forward');
        btnSkipStart = document.getElementById('btn-skip-start');
        btnSkipEnd = document.getElementById('btn-skip-end');
        timelineProgress = document.getElementById('timeline-progress');
        timelineStepLabel = document.getElementById('timeline-step');
        timelineTimeLabel = document.getElementById('timeline-time');
        speedSlider = document.getElementById('speed-slider');
        speedValueLabel = document.getElementById('speed-value');

        if (!btnPlayPause) return; // safety

        // Button event listeners
        btnPlayPause.addEventListener('click', togglePlayPause);
        btnStepBack.addEventListener('click', stepBack);
        btnStepForward.addEventListener('click', stepForward);
        btnSkipStart.addEventListener('click', skipToStart);
        btnSkipEnd.addEventListener('click', skipToEnd);

        // Speed slider
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                const speed = parseFloat(e.target.value);
                StateStore.set('speed', speed);
                if (speedValueLabel) speedValueLabel.textContent = speed + 'x';

                // If playing, restart interval at new speed
                if (StateStore.get('isPlaying')) {
                    stopAutoPlay();
                    startAutoPlay();
                }
            });
        }

        // Subscribe to state changes to update UI
        StateStore.subscribe('currentStep', updateTimeline);
        StateStore.subscribe('totalSteps', updateTimeline);
        StateStore.subscribe('isPlaying', updatePlayButton);
    }

    /**
     * Toggle play / pause
     */
    function togglePlayPause() {
        const isPlaying = StateStore.get('isPlaying');

        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }

    /**
     * Start auto-play
     */
    function play() {
        const totalSteps = StateStore.get('totalSteps');
        const currentStep = StateStore.get('currentStep');

        if (totalSteps === 0) return;

        // If already at end, restart from beginning
        if (currentStep >= totalSteps - 1) {
            StateStore.set('currentStep', 0);
        }

        StateStore.set('isPlaying', true);
        startAutoPlay();
        startTimer();
    }

    /**
     * Pause auto-play
     */
    function pause() {
        StateStore.set('isPlaying', false);
        stopAutoPlay();
        pauseTimer();
    }

    /**
     * Step forward by one
     */
    function stepForward() {
        const currentStep = StateStore.get('currentStep');
        const totalSteps = StateStore.get('totalSteps');

        if (currentStep < totalSteps - 1) {
            StateStore.set('currentStep', currentStep + 1);
        }

        // If was playing, pause
        if (StateStore.get('isPlaying')) {
            pause();
        }
    }

    /**
     * Step backward by one
     */
    function stepBack() {
        const currentStep = StateStore.get('currentStep');

        if (currentStep > 0) {
            StateStore.set('currentStep', currentStep - 1);
        }

        if (StateStore.get('isPlaying')) {
            pause();
        }
    }

    /**
     * Skip to first step
     */
    function skipToStart() {
        if (StateStore.get('isPlaying')) pause();
        StateStore.set('currentStep', 0);
        resetTimer();
    }

    /**
     * Skip to last step
     */
    function skipToEnd() {
        if (StateStore.get('isPlaying')) pause();
        const totalSteps = StateStore.get('totalSteps');
        StateStore.set('currentStep', Math.max(0, totalSteps - 1));
    }

    /**
     * Start the auto-advance interval
     */
    function startAutoPlay() {
        stopAutoPlay(); // clear any existing

        const speed = StateStore.get('speed');
        // Base interval: 600ms at 1x speed
        const interval = Math.max(100, 600 / speed);

        playInterval = setInterval(() => {
            const currentStep = StateStore.get('currentStep');
            const totalSteps = StateStore.get('totalSteps');

            if (currentStep >= totalSteps - 1) {
                pause();
                return;
            }

            StateStore.set('currentStep', currentStep + 1);
        }, interval);
    }

    /**
     * Stop auto-advance interval
     */
    function stopAutoPlay() {
        if (playInterval) {
            clearInterval(playInterval);
            playInterval = null;
        }
    }

    // ── Timer ──
    function startTimer() {
        startTime = Date.now();
        timerInterval = setInterval(updateTimer, 100);
    }

    function pauseTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        if (startTime) {
            elapsedBeforePause += Date.now() - startTime;
            startTime = null;
        }
    }

    function resetTimer() {
        pauseTimer();
        elapsedBeforePause = 0;
        updateTimerDisplay(0);
    }

    function updateTimer() {
        const elapsed = elapsedBeforePause + (startTime ? Date.now() - startTime : 0);
        updateTimerDisplay(elapsed);
    }

    function updateTimerDisplay(ms) {
        if (!timelineTimeLabel) return;
        const seconds = (ms / 1000).toFixed(1);
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(1);
        timelineTimeLabel.textContent = `Time: ${String(mins).padStart(2, '0')}:${String(secs).padStart(4, '0')}`;
    }

    /**
     * Update timeline UI (progress bar, step counter)
     */
    function updateTimeline() {
        const currentStep = StateStore.get('currentStep');
        const totalSteps = StateStore.get('totalSteps');

        if (timelineStepLabel) {
            timelineStepLabel.textContent = `Step ${currentStep + 1} / ${totalSteps}`;
        }

        if (timelineProgress) {
            const pct = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
            timelineProgress.style.width = pct + '%';
        }
    }

    /**
     * Update play/pause button icon
     */
    function updatePlayButton(isPlaying) {
        if (!btnPlayPause) return;
        const icon = btnPlayPause.querySelector('.material-symbols-outlined');
        if (icon) {
            icon.textContent = isPlaying ? 'pause' : 'play_arrow';
        }
    }

    /**
     * Reset player state completely
     */
    function reset() {
        pause();
        resetTimer();
        StateStore.setMany({
            currentStep: 0,
            totalSteps: 0,
            isPlaying: false,
        });
        updateTimeline();
    }

    return { init, play, pause, stepForward, stepBack, reset };
})();

export default Player;
