/* STANDALONE AUTH INTERACTION CONTROLLER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const switchText = document.getElementById('switch-text');
    const btnSwitchMode = document.getElementById('btn-switch-mode');
    const btnSubmit = document.getElementById('btn-submit');
    const btnText = document.getElementById('btn-text');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const btnTogglePassword = document.getElementById('btn-toggle-password');
    const pwStrengthBar = document.getElementById('pw-strength-bar');
    const authMessage = document.getElementById('auth-message');

    let isLoginMode = true;

    // 1. Toggle Show/Hide Password
    btnTogglePassword.addEventListener('click', () => {
        const type = authPassword.getAttribute('type') === 'password' ? 'text' : 'password';
        authPassword.setAttribute('type', type);

        const icon = btnTogglePassword.querySelector('.material-symbols-outlined');
        icon.textContent = type === 'password' ? 'visibility' : 'visibility_off';
    });

    // 2. Password Strength Logic
    authPassword.addEventListener('input', () => {
        const password = authPassword.value;
        pwStrengthBar.className = 'password-strength-bar'; // reset classes

        if (password.length === 0) {
            pwStrengthBar.style.width = '0%';
            return;
        }

        // Strength Calculation
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        if (score <= 1) {
            pwStrengthBar.classList.add('strength-weak');
        } else if (score === 2 || score === 3) {
            pwStrengthBar.classList.add('strength-medium');
        } else if (score >= 4) {
            pwStrengthBar.classList.add('strength-strong');
        }
    });

    // 3. Switch Login/Register Mode
    btnSwitchMode.addEventListener('click', () => {
        isLoginMode = !isLoginMode;

        // Dynamic labels update
        authTitle.textContent = isLoginMode ? 'Welcome Back' : 'Create Account';
        authSubtitle.textContent = isLoginMode ? 'Sign in to your NeuroCode workspace' : 'Get started with your developer account';
        btnText.textContent = isLoginMode ? 'Sign In' : 'Register';
        switchText.textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
        btnSwitchMode.textContent = isLoginMode ? 'Register' : 'Login';

        // Reset states
        authMessage.style.display = 'none';
        authForm.reset();
        pwStrengthBar.style.width = '0%';
    });

    // 4. Form Submission (Real Backend Connectivity)
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = authEmail.value;
        const password = authPassword.value;

        // Reset message
        authMessage.style.display = 'none';
        authMessage.className = 'auth-message';

        // Set Loading state
        const originalText = btnText.textContent;
        btnText.textContent = 'Connecting...';
        btnSubmit.disabled = true;

        try {
            const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed. Please try again.');
            }

            if (isLoginMode) {
                // Success Case
                authMessage.textContent = 'Access granted! Redirecting...';
                authMessage.classList.add('success');
                authMessage.style.display = 'block';

                // Save token and user info
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // Redirect to main page after a brief delay
                setTimeout(() => {
                    window.location.href = './index.html';
                }, 1000);
            } else {
                authMessage.textContent = 'Account created successfully! Switching to Login.';
                authMessage.classList.add('success');
                authMessage.style.display = 'block';

                setTimeout(() => {
                    btnSwitchMode.click();
                }, 2000);
            }
        } catch (error) {
            authMessage.textContent = error.message || 'Server connectivity error. Please try again.';
            authMessage.classList.add('error');
            authMessage.style.display = 'block';
        } finally {
            btnText.textContent = originalText;
            btnSubmit.disabled = false;
        }
    });


    // ══════════════════════════════════════════════════════════════════════
    // 5. THEME-SPECIFIC BACKGROUND EFFECTS ENGINE
    //    Each theme gets a completely unique visual background:
    //    • Dark Futuristic  → Neural network nodes + prominent connection lines
    //    • Retro Pixel      → Matrix-style falling code rain
    //    • Light Minimalist → Blue neural network nodes (clean, airy)
    //    • Solarized Hacker → Glowing amber fireflies
    //    • Neuro Blush      → Tiny drifting cherry blossom petals
    // ══════════════════════════════════════════════════════════════════════
    const canvas = document.getElementById('login-particles');
    const ctx = canvas.getContext('2d');

    let currentTheme = localStorage.getItem('neurocode-theme') || 'dark-futuristic';
    let animationId = null;

    // Apply active theme to login page body on startup
    document.body.setAttribute('data-theme', currentTheme);

    // Synchronize dropdown with saved theme
    const themeSelect = document.getElementById('login-theme-select');
    if (themeSelect) {
        themeSelect.value = currentTheme;
        themeSelect.addEventListener('change', (e) => {
            currentTheme = e.target.value;
            localStorage.setItem('neurocode-theme', currentTheme);
            document.body.setAttribute('data-theme', currentTheme);
            startThemeBackground();
        });
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', () => {
        resizeCanvas();
        startThemeBackground();
    });

    // ─────────────────────────────────────────────
    //  SHARED: Reusable Neural Network Engine
    //  Used by Dark Futuristic (cyan) and Light Minimalist (blue)
    // ─────────────────────────────────────────────
    function runNeuralNetwork(config) {
        const {
            nodeCount = 25,
            connectDist = 180,
            mouseConnectDist = 220,
            nodeColor = 'rgba(37, 244, 244,',
            lineColor = 'rgba(37, 244, 244,',
            lineAlpha = 0.4,
            mouseLineAlpha = 0.5,
            lineWidth = 1.0,
            mouseLineWidth = 1.2,
            nodeAlpha = 0.8,
            glowAlpha = 0.1,
            glowRadius = 5,
            nodeMinR = 1.5,
            nodeMaxR = 3,
            speed = 0.35,
            mouseRepelRadius = 100,
            mouseRepelForce = 0.8
        } = config;

        const nodes = [];
        const mouse = { x: null, y: null };

        const onMouseMove = (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };
        const onMouseOut = () => {
            mouse.x = null;
            mouse.y = null;
        };
        canvas.parentElement.addEventListener('mousemove', onMouseMove);
        canvas.parentElement.addEventListener('mouseout', onMouseOut);

        // Click to spawn new nodes — burst of 3-5 nodes at cursor
        canvas.parentElement.addEventListener('click', (e) => {
            const spawnCount = Math.floor(Math.random() * 3) + 3; // 3-5 nodes
            for (let i = 0; i < spawnCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const spread = Math.random() * 30 + 10; // scatter radius
                const newNode = {
                    x: e.clientX + Math.cos(angle) * spread,
                    y: e.clientY + Math.sin(angle) * spread,
                    r: Math.random() * (nodeMaxR - nodeMinR) + nodeMinR,
                    vx: (Math.random() - 0.5) * speed * 2.5,
                    vy: (Math.random() - 0.5) * speed * 2.5,
                    baseVx: 0,
                    baseVy: 0,
                    life: 300 + Math.random() * 200, // ~5-8 seconds at 60fps
                    maxLife: 0
                };
                newNode.baseVx = newNode.vx * 0.4;
                newNode.baseVy = newNode.vy * 0.4;
                newNode.maxLife = newNode.life;
                nodes.push(newNode);
            }
        });

        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * (nodeMaxR - nodeMinR) + nodeMinR,
                vx: (Math.random() - 0.5) * speed,
                vy: (Math.random() - 0.5) * speed,
                baseVx: 0,
                baseVy: 0,
                life: -1, // permanent (no decay)
                maxLife: -1
            });
            nodes[nodes.length - 1].baseVx = nodes[nodes.length - 1].vx;
            nodes[nodes.length - 1].baseVy = nodes[nodes.length - 1].vy;
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // ---- Draw connection lines between nodes ----
            for (let i = 0; i < nodes.length; i++) {
                // Calculate fade for this node
                const ni = nodes[i];
                const fadeMulI = ni.life > 0 ? ni.life / ni.maxLife : 1;
                if (ni.life === 0) continue;

                for (let j = i + 1; j < nodes.length; j++) {
                    const nj = nodes[j];
                    if (nj.life === 0) continue;
                    const fadeMulJ = nj.life > 0 ? nj.life / nj.maxLife : 1;

                    const dx = ni.x - nj.x;
                    const dy = ni.y - nj.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < connectDist) {
                        const alpha = (1 - dist / connectDist) * lineAlpha * Math.min(fadeMulI, fadeMulJ);
                        ctx.strokeStyle = `${lineColor} ${alpha})`;
                        ctx.lineWidth = lineWidth;
                        ctx.beginPath();
                        ctx.moveTo(ni.x, ni.y);
                        ctx.lineTo(nj.x, nj.y);
                        ctx.stroke();
                    }
                }

                // ---- Draw line from node to mouse cursor ----
                if (mouse.x !== null) {
                    const dx = ni.x - mouse.x;
                    const dy = ni.y - mouse.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < mouseConnectDist) {
                        const alpha = (1 - dist / mouseConnectDist) * mouseLineAlpha * fadeMulI;
                        ctx.strokeStyle = `${lineColor} ${alpha})`;
                        ctx.lineWidth = mouseLineWidth;
                        ctx.beginPath();
                        ctx.moveTo(ni.x, ni.y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.stroke();
                    }
                }
            }

            // ---- Draw and move nodes ----
            for (let i = nodes.length - 1; i >= 0; i--) {
                const n = nodes[i];

                // Fade multiplier: 1.0 for permanent nodes, decays for spawned ones
                let fadeMul = 1;
                if (n.life > 0) {
                    n.life--;
                    fadeMul = n.life / n.maxLife;
                } else if (n.life === 0) {
                    // Remove expired spawned node
                    nodes.splice(i, 1);
                    continue;
                }
                // life === -1 means permanent, no decay

                // Node dot
                ctx.fillStyle = `${nodeColor} ${nodeAlpha * fadeMul})`;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fill();

                // Subtle glow around each node
                const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * glowRadius);
                grad.addColorStop(0, `${nodeColor} ${glowAlpha * fadeMul})`);
                grad.addColorStop(1, `${nodeColor} 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r * glowRadius, 0, Math.PI * 2);
                ctx.fill();

                // Mouse repulsion — nodes gently push away from cursor
                if (mouse.x !== null) {
                    const dx = n.x - mouse.x;
                    const dy = n.y - mouse.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < mouseRepelRadius && dist > 0) {
                        const force = (1 - dist / mouseRepelRadius) * mouseRepelForce;
                        n.vx += (dx / dist) * force;
                        n.vy += (dy / dist) * force;
                    }
                }

                // Dampen velocity back towards base speed
                n.vx += (n.baseVx - n.vx) * 0.02;
                n.vy += (n.baseVy - n.vy) * 0.02;

                // Move
                n.x += n.vx;
                n.y += n.vy;

                // Bounce off edges
                if (n.x < 0 || n.x > canvas.width) { n.vx *= -1; n.baseVx *= -1; }
                if (n.y < 0 || n.y > canvas.height) { n.vy *= -1; n.baseVy *= -1; }
            }

            // Mouse cursor node (visual dot at cursor position)
            if (mouse.x !== null) {
                ctx.fillStyle = `${nodeColor} 0.5)`;
                ctx.beginPath();
                ctx.arc(mouse.x, mouse.y, 3, 0, Math.PI * 2);
                ctx.fill();

                const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 20);
                grad.addColorStop(0, `${nodeColor} 0.08)`);
                grad.addColorStop(1, `${nodeColor} 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(mouse.x, mouse.y, 20, 0, Math.PI * 2);
                ctx.fill();
            }

            animationId = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─────────────────────────────────────────────
    //  DARK FUTURISTIC — Cyan Neural Network
    // ─────────────────────────────────────────────
    function runDarkFuturistic() {
        runNeuralNetwork({
            nodeCount: 28,
            connectDist: 180,
            mouseConnectDist: 230,
            nodeColor: 'rgba(37, 244, 244,',
            lineColor: 'rgba(37, 244, 244,',
            lineAlpha: 0.4,//opacity
            mouseLineAlpha: 0.5,
            lineWidth: 1.0,//width
            mouseLineWidth: 1.2,
            nodeAlpha: 0.8,
            glowAlpha: 0.12,//glow opacity
            glowRadius: 5,
            nodeMinR: 1.5,
            nodeMaxR: 3.5,
            speed: 0.35,
            mouseRepelRadius: 110,
            mouseRepelForce: 0.7
        });
    }

    // ─────────────────────────────────────────────
    //  RETRO PIXEL — Matrix Code Rain
    // ─────────────────────────────────────────────
    function runRetroPixel() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*(){}[]<>+=~;:ネウロコード'.split('');
        const fontSize = 14;
        const columns = Math.floor(canvas.width / fontSize);
        const drops = new Array(columns).fill(0).map(() => Math.random() * -100);
        // Varying speeds per column for visual depth
        const speeds = new Array(columns).fill(0).map(() => Math.random() * 0.25 + 0.1);

        function draw() {
            // Semi-transparent black overlay for trail effect
            ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = `${fontSize}px 'VT323', monospace`;

            for (let i = 0; i < drops.length; i++) {
                const char = chars[Math.floor(Math.random() * chars.length)];
                const y = drops[i] * fontSize;

                // Bright head character
                ctx.fillStyle = `rgba(51, 255, 0, ${0.9 + Math.random() * 0.1})`;
                ctx.fillText(char, i * fontSize, y);

                // Dimmer trail char just above
                if (drops[i] > 1) {
                    const trailChar = chars[Math.floor(Math.random() * chars.length)];
                    ctx.fillStyle = `rgba(51, 255, 0, 0.25)`;
                    ctx.fillText(trailChar, i * fontSize, y - fontSize);
                }

                drops[i] += speeds[i];

                // Reset with some randomness
                if (y > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
            }

            animationId = requestAnimationFrame(draw);
        }
        // Clear to black first
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        draw();
    }

    // ─────────────────────────────────────────────
    //  LIGHT MINIMALIST — Blue Neural Network (clean, airy)
    // ─────────────────────────────────────────────
    function runLightMinimalist() {
        runNeuralNetwork({
            nodeCount: 22,
            connectDist: 170,
            mouseConnectDist: 210,
            nodeColor: 'rgba(0, 122, 255,',
            lineColor: 'rgba(0, 122, 255,',
            lineAlpha: 0.14,
            mouseLineAlpha: 0.28,
            lineWidth: 0.6,
            mouseLineWidth: 1.0,
            nodeAlpha: 0.5,
            glowAlpha: 0.06,
            glowRadius: 6,
            nodeMinR: 1.5,
            nodeMaxR: 3,
            speed: 0.2,
            mouseRepelRadius: 100,
            mouseRepelForce: 0.5
        });
    }

    // ─────────────────────────────────────────────
    //  SOLARIZED HACKER — Amber Fireflies
    // ─────────────────────────────────────────────
    function runSolarizedHacker() {
        const flies = [];
        const COUNT = 14;

        for (let i = 0; i < COUNT; i++) {
            flies.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 2 + 1,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                phase: Math.random() * Math.PI * 2,       // for pulsing
                pulseSpeed: Math.random() * 0.02 + 0.01
            });
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const f of flies) {
                f.phase += f.pulseSpeed;
                const pulse = (Math.sin(f.phase) + 1) / 2; // 0..1
                const alpha = 0.3 + pulse * 0.5;

                // Glow aura
                const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 8);
                grad.addColorStop(0, `rgba(181, 137, 0, ${alpha * 0.3})`);
                grad.addColorStop(1, `rgba(181, 137, 0, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.r * 8, 0, Math.PI * 2);
                ctx.fill();

                // Core dot
                ctx.fillStyle = `rgba(181, 137, 0, ${alpha})`;
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
                ctx.fill();

                // Organic drifting movement
                f.vx += (Math.random() - 0.5) * 0.02;
                f.vy += (Math.random() - 0.5) * 0.02;
                f.vx = Math.max(-0.5, Math.min(0.5, f.vx));
                f.vy = Math.max(-0.5, Math.min(0.5, f.vy));

                f.x += f.vx;
                f.y += f.vy;
                if (f.x < -10) f.x = canvas.width + 10;
                if (f.x > canvas.width + 10) f.x = -10;
                if (f.y < -10) f.y = canvas.height + 10;
                if (f.y > canvas.height + 10) f.y = -10;
            }

            animationId = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─────────────────────────────────────────────
    //  NEURO BLUSH — Tiny Cherry Blossom Petals
    // ─────────────────────────────────────────────
    function runNeuroBlush() {
        const petals = [];
        const COUNT = 18;

        for (let i = 0; i < COUNT; i++) {
            petals.push(makePetal());
        }

        function makePetal() {
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height * 0.3,
                size: Math.random() * 5 + 3,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.02,
                vx: (Math.random() - 0.5) * 0.3,
                vy: Math.random() * 0.4 + 0.15,
                sway: Math.random() * Math.PI * 2,
                swaySpeed: Math.random() * 0.01 + 0.005,
                alpha: Math.random() * 0.4 + 0.3,
                // Petal color: vary between pink shades
                hue: Math.random() > 0.5 ? 330 : 340,
                sat: 70 + Math.random() * 20,
                light: 70 + Math.random() * 15
            };
        }

        function drawPetal(p) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = p.alpha;

            // Draw a simple 5-petal cherry blossom shape
            const s = p.size;
            ctx.fillStyle = `hsl(${p.hue}, ${p.sat}%, ${p.light}%)`;

            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.ellipse(0, -s * 0.6, s * 0.35, s * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.rotate(Math.PI * 2 / 5);
            }

            // Tiny center dot
            ctx.fillStyle = `hsla(40, 80%, 80%, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
            ctx.restore();
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < petals.length; i++) {
                const p = petals[i];
                drawPetal(p);

                // Physics: gentle sway + fall
                p.sway += p.swaySpeed;
                p.x += p.vx + Math.sin(p.sway) * 0.3;
                p.y += p.vy;
                p.rotation += p.rotSpeed;

                // Reset when off screen
                if (p.y > canvas.height + 20) {
                    petals[i] = makePetal();
                    petals[i].y = -20;
                }
            }

            animationId = requestAnimationFrame(draw);
        }
        draw();
    }

    // ─────────────────────────────────────────────
    //  THEME LAUNCHER
    // ─────────────────────────────────────────────
    function startThemeBackground() {
        if (animationId) cancelAnimationFrame(animationId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        resizeCanvas();

        switch (currentTheme) {
            case 'retro-pixel':
                runRetroPixel();
                break;
            case 'light-minimalist':
                runLightMinimalist();
                break;
            case 'solarized-hacker':
                runSolarizedHacker();
                break;
            case 'neuro-blush':
                runNeuroBlush();
                break;
            default:
                runDarkFuturistic();
                break;
        }
    }

    // Boot
    resizeCanvas();
    startThemeBackground();
});
