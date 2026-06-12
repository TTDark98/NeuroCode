/* ======================================
   NeuroCode — AI Generator
   Uses Gemini API or Ollama to convert raw code
   into visualization logic.
   ====================================== */

import { ALGORITHMS } from './algorithms.js';

const AIGenerator = (() => {
    const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
    const OLLAMA_DEFAULT = 'http://localhost:11434';

    // Saved settings
    let provider = localStorage.getItem('neurocode-ai-provider') || 'ollama';
    let selectedModel = localStorage.getItem('neurocode-ai-model') || 'qwen3.5:397b-cloud';
    let ollamaUrl = localStorage.getItem('neurocode-ollama-url') || OLLAMA_DEFAULT;

    const NVIDIA_DEFAULT_MODELS = [
        'meta/llama-3.1-405b-instruct',
        'nvidia/llama-3.1-nemotron-70b-instruct',
        'moonshotai/kimi-k1.5',
        'meta/llama-3.1-70b-instruct',
        'meta/llama-3.1-8b-instruct',
        'mistralai/mixtral-8x22b-instruct-v0.1'
    ];

    // Helper to fetch with retries for transient/high-demand errors (e.g. 503, 429)
    async function fetchWithRetry(url, options = {}, maxRetries = 3, initialDelay = 1000, timeoutMs = 120000) {
        let retries = 0;
        while (true) {
            try {
                const response = await fetch(url, options);
                
                // If it is a transient rate-limiting / high-demand error (429 or 503), retry
                if ((response.status === 429 || response.status === 503) && retries < maxRetries) {
                    retries++;
                    const delay = initialDelay * Math.pow(2, retries - 1);
                    const msg = `Transient error ${response.status} (High Demand). Retrying in ${Math.round(delay/1000)}s... (attempt ${retries}/${maxRetries})`;
                    console.warn(msg);
                    document.dispatchEvent(new CustomEvent('show-toast', { detail: msg }));
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                
                return response;
            } catch (err) {
                const isTimeout = err.name === 'AbortError';

                // Do NOT retry on timeouts — fail immediately with a clear message
                if (isTimeout) {
                    throw new Error(`Request timed out after ${timeoutMs / 1000}s. The AI provider may be unreachable or overloaded.`);
                }

                // Retry on network-level connection failures only
                if (retries < maxRetries) {
                    retries++;
                    const delay = initialDelay * Math.pow(2, retries - 1);
                    const msg = `Connection failed: ${err.message}. Retrying in ${Math.round(delay/1000)}s... (attempt ${retries}/${maxRetries})`;
                    console.warn(msg);
                    document.dispatchEvent(new CustomEvent('show-toast', { detail: msg }));
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                throw err;
            }
        }
    }

    // ─── Provider / Model management ───────────────
    function getProvider() { return provider; }
    function setProvider(p) {
        provider = p;
        localStorage.setItem('neurocode-ai-provider', p);
    }

    function getModel() { return selectedModel; }
    function setModel(m) {
        selectedModel = m;
        localStorage.setItem('neurocode-ai-model', m);
    }

    function getOllamaUrl() { return ollamaUrl; }
    function setOllamaUrl(url) {
        ollamaUrl = url.replace(/\/+$/, ''); // strip trailing slashes
        localStorage.setItem('neurocode-ollama-url', ollamaUrl);
    }

    function getApiKey() {
        const input = document.getElementById('ai-api-key');
        if (input && input.value.trim() !== '') {
            localStorage.setItem('neurocode-gemini-key', input.value.trim());
            return input.value.trim();
        }
        return localStorage.getItem('neurocode-gemini-key');
    }

    function getNvidiaApiKey() {
        const input = document.getElementById('ai-nvidia-key');
        if (input && input.value.trim() !== '') {
            localStorage.setItem('neurocode-nvidia-key', input.value.trim());
            return input.value.trim();
        }
        return localStorage.getItem('neurocode-nvidia-key');
    }

    // ─── Fetch available models ────────────────────
    async function fetchAvailableModels() {
        if (provider === 'ollama') {
            return fetchOllamaModels();
        } else if (provider === 'gemini') {
            return fetchGeminiModels();
        } else if (provider === 'nvidia') {
            return fetchNvidiaModels();
        }
        return [];
    }

    async function fetchNvidiaModels() {
        const apiKey = getNvidiaApiKey();
        if (!apiKey) return NVIDIA_DEFAULT_MODELS;
        try {
            const token = localStorage.getItem('token');
            const res = await fetchWithRetry('/api/nvidia/models', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Nvidia-Authorization': `Bearer ${apiKey}`
                }
            });
            const data = await res.json();
            if (data.data) {
                return data.data.map(m => m.id);
            }
            return NVIDIA_DEFAULT_MODELS;
        } catch (err) {
            console.error("Error fetching NVIDIA models:", err);
            return NVIDIA_DEFAULT_MODELS;
        }
    }

    async function fetchOllamaModels() {
        try {
            const res = await fetchWithRetry(`${ollamaUrl}/api/tags`);
            const data = await res.json();
            if (data.models) {
                return data.models.map(m => m.name);
            }
            return [];
        } catch (err) {
            console.error("Error fetching Ollama models:", err);
            return [];
        }
    }

    async function fetchGeminiModels() {
        const apiKey = getApiKey();
        if (!apiKey) return [];
        try {
            const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return data.models
                .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));
        } catch (err) {
            console.error("Error fetching Gemini models:", err);
            return [];
        }
    }

    const SYSTEM_PROMPT = `You are NeuroCode AI. Given algorithm code and input data, output a raw JavaScript object (NOT JSON, NOT markdown) with this exact shape:
{
  name: "Algorithm Name",
  category: "Sorting",
  type: "bars",
  defaultData: [the input array],
  complexity: { time: "O(n²)", space: "O(1)" },
  run: function(inputData) {
    const arr = [...inputData];
    const steps = [];
    let comparisons = 0, swaps = 0;
    steps.push({ array: [...arr], highlights: [], action: 'start', description: 'Starting...', comparisons, swaps });
    // YOUR ALGORITHM HERE - push a step for each compare/swap
    // comparisons++; steps.push({array:[...arr], highlights:[{index:i,type:'compare'},{index:j,type:'compare'}], action:'comparing', description:'...', comparisons, swaps});
    // After swap: swaps++; steps.push({array:[...arr], highlights:[{index:i,type:'swap'}], action:'swapping', description:'...', comparisons, swaps});
    // Final: steps.push({array:[...arr], highlights: arr.map((_,i)=>({index:i,type:'sorted'})), action:'done', description:'Done!', comparisons, swaps});
    return { steps, complexity: { time: "O(...)", space: "O(...)" } };
  }
}
Rules: Output ONLY the raw JS object. No markdown. No text before/after. The run function generates steps at runtime—do not precompute them.`;

    const CHAT_SYSTEM_PROMPT = `You are NeuroCode AI, an expert algorithm and computer science assistant.
Answer the user's questions clearly, concisely, and helpfully. Focus on Big O time/space complexity, data structure behaviors, and coding patterns.
Format your responses cleanly using standard markdown. Keep them under 3 brief paragraphs since they are rendered in a narrow chat sidebar.`;

    // ─── Generate via Ollama ───────────────────────
    async function generateViaOllama(codeStr, inputStr) {
        if (!selectedModel || selectedModel.startsWith('gemini')) {
            throw new Error(`Invalid Ollama model selection: "${selectedModel}". Please open settings and select a valid Ollama model.`);
        }

        const userPrompt = `Code:\n${codeStr}\n\nInput Data:\n${inputStr}`;

        // UI Elements for live log
        const logModal = document.getElementById('ai-stream-modal');
        const logContent = document.getElementById('ai-stream-content');
        const logStatus = document.getElementById('ai-stream-status');
        
        if (logModal && logContent && logStatus) {
            logContent.textContent = '';
            logStatus.textContent = 'Connecting to Local Ollama...';
            logStatus.style.color = ''; // Reset error color
            logModal.style.display = 'flex';
            requestAnimationFrame(() => {
                logModal.classList.add('open');
            });
            
            const closeBtn = document.getElementById('btn-close-ai-stream');
            const hideBtn = document.getElementById('btn-hide-ai-stream');
            const hideHandler = () => {
                logModal.classList.remove('open');
                setTimeout(() => { logModal.style.display = 'none'; }, 300);
            };
            if (closeBtn) closeBtn.onclick = hideHandler;
            if (hideBtn) hideBtn.onclick = hideHandler;
        }

        let accumulated = '';
        let tokenCount = 0;

        try {
            const response = await fetchWithRetry(`${ollamaUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: userPrompt }
                    ],
                    stream: true,
                    options: { temperature: 0.0 }
                })
            });

            // Read the NDJSON stream and accumulate tokens with live progress
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const parsed = JSON.parse(line);
                        const content = parsed.message?.content;
                        
                        if (content) {
                            accumulated += content;
                            tokenCount++;
                            
                            // Update live modal UI
                            if (logContent) {
                                logContent.textContent += content;
                                logContent.parentElement.scrollTop = logContent.parentElement.scrollHeight;
                            }

                            // Update live progress every 5 tokens
                            if (tokenCount % 5 === 0) {
                                const msg = `🧠 AI generating... ${accumulated.length} chars received (${tokenCount} tokens)`;
                                document.dispatchEvent(new CustomEvent('show-toast', { detail: msg }));
                                if (logStatus) logStatus.textContent = msg;
                            }
                        }
                        
                        if (parsed.error) {
                            throw new Error(parsed.error);
                        }
                    } catch (e) {
                        // Skip malformed chunk
                    }
                }
            }

            if (logStatus) logStatus.textContent = '✅ Generation complete!';
            if (logModal) {
                setTimeout(() => {
                    logModal.classList.remove('open');
                    setTimeout(() => { logModal.style.display = 'none'; }, 300);
                }, 2000);
            }
        } catch (err) {
            if (logStatus) {
                logStatus.textContent = `❌ Error: ${err.message}`;
                logStatus.style.color = '#ef4444';
            }
            throw err;
        }

        if (!accumulated) {
            throw new Error('Ollama returned an empty response.');
        }

        return accumulated;
    }

    // ─── Generate via Gemini ──────────────────────
    async function generateViaGemini(codeStr, inputStr) {
        const apiKey = getApiKey();
        if (!apiKey) {
            throw new Error('Gemini API Key is required. Enter it in the toolbar.');
        }

        if (!selectedModel || !selectedModel.startsWith('gemini')) {
            throw new Error(`Invalid Gemini model selection: "${selectedModel}". Please open settings and select a valid Gemini model.`);
        }

        const userPrompt = `Code:\n${codeStr}\n\nInput Data:\n${inputStr}`;
        const url = `${GEMINI_BASE}${selectedModel}:generateContent?key=${apiKey}`;

        const response = await fetchWithRetry(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: { text: SYSTEM_PROMPT }
                },
                contents: [{
                    parts: [{ text: userPrompt }]
                }],
                generationConfig: {
                    temperature: 0.0
                }
            })
        });

        const data = await response.json();

        if (data.error) {
            if (data.error.code === 400 || (data.error.message && data.error.message.includes('API key'))) {
                localStorage.removeItem('neurocode-gemini-key');
                throw new Error('Invalid API Key. Please try again.');
            }
            throw new Error(data.error.message);
        }

        return data.candidates[0].content.parts[0].text;
    }

    // ─── Generate via NVIDIA NIM (with streaming + live progress) ───
    async function generateViaNvidia(codeStr, inputStr) {
        const apiKey = getNvidiaApiKey();
        if (!apiKey) {
            throw new Error('NVIDIA API Key is required. Enter it in the settings modal.');
        }

        const userPrompt = `Code:\n${codeStr}\n\nInput Data:\n${inputStr}`;
        const token = localStorage.getItem('token');

        document.dispatchEvent(new CustomEvent('show-toast', { detail: '🔌 Connecting to NVIDIA API...' }));
        console.time('⚡ NVIDIA Streaming Request');

        // UI Elements for live log
        const logModal = document.getElementById('ai-stream-modal');
        const logContent = document.getElementById('ai-stream-content');
        const logStatus = document.getElementById('ai-stream-status');
        
        if (logModal && logContent && logStatus) {
            logContent.textContent = '';
            logStatus.textContent = 'Connecting...';
            logStatus.style.color = ''; // Reset error color
            logModal.style.display = 'flex';
            requestAnimationFrame(() => {
                logModal.classList.add('open');
            });
            
            // Setup close handlers
            const closeBtn = document.getElementById('btn-close-ai-stream');
            const hideBtn = document.getElementById('btn-hide-ai-stream');
            const hideHandler = () => {
                logModal.classList.remove('open');
                setTimeout(() => { logModal.style.display = 'none'; }, 300);
            };
            if (closeBtn) closeBtn.onclick = hideHandler;
            if (hideBtn) hideBtn.onclick = hideHandler;
        }

        let accumulated = '';
        let tokenCount = 0;

        try {
            const response = await fetch('/api/nvidia/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Nvidia-Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: selectedModel || 'meta/llama3-70b-instruct',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.0,
                    max_tokens: 4096,
                    stream: true
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `NVIDIA API returned HTTP ${response.status}`);
            }

            // Read the SSE stream and accumulate tokens with live progress
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) {
                            accumulated += content;
                            tokenCount++;
                            
                            // Update live modal UI
                            if (logContent) {
                                logContent.textContent += content;
                                // Auto-scroll to bottom
                                logContent.parentElement.scrollTop = logContent.parentElement.scrollHeight;
                            }

                            // Update live progress every 5 tokens
                            if (tokenCount % 5 === 0) {
                                const msg = `🧠 AI generating... ${accumulated.length} chars received (${tokenCount} tokens)`;
                                document.dispatchEvent(new CustomEvent('show-toast', { detail: msg }));
                                if (logStatus) logStatus.textContent = msg;
                            }
                        }
                    } catch (e) {
                        // Skip malformed SSE chunks
                    }
                }
            }

            console.timeEnd('⚡ NVIDIA Streaming Request');

            document.dispatchEvent(new CustomEvent('show-toast', {
                detail: `✅ AI generation complete! ${accumulated.length} chars, ${tokenCount} tokens`
            }));
            
            if (logStatus) logStatus.textContent = '✅ Generation complete!';
            // Auto-close modal after 2 seconds
            if (logModal) {
                setTimeout(() => {
                    logModal.classList.remove('open');
                    setTimeout(() => { logModal.style.display = 'none'; }, 300);
                }, 2000);
            }
        } catch (err) {
            console.timeEnd('⚡ NVIDIA Streaming Request');
            if (logStatus) {
                logStatus.textContent = `❌ Error: ${err.message}`;
                logStatus.style.color = '#ef4444';
            }
            throw err;
        }

        if (!accumulated) {
            throw new Error('NVIDIA API returned an empty response.');
        }

        return accumulated;
    }

    // ─── Main entry point ─────────────────────────
    async function generateVisualization(codeStr, playgroundInputStr) {
        let jsObjStr;

        console.time('⚡ AI Total Generation Time');
        try {
            console.time('⚡ AI Network Request');
            if (provider === 'ollama') {
                jsObjStr = await generateViaOllama(codeStr, playgroundInputStr);
            } else if (provider === 'gemini') {
                jsObjStr = await generateViaGemini(codeStr, playgroundInputStr);
            } else if (provider === 'nvidia') {
                jsObjStr = await generateViaNvidia(codeStr, playgroundInputStr);
            }
            console.timeEnd('⚡ AI Network Request');

            // Clean up markdown block wraps if any
            jsObjStr = jsObjStr.replace(/^```[a-zA-Z]*\n/gm, '').replace(/```$/gm, '').trim();

            console.time('⚡ JS Eval + Registration');
            // Evaluate the JS Object String into a real JS Object
            const result = new Function("return " + jsObjStr)();

            // Register it as custom AI algorithm
            ALGORITHMS['custom_ai'] = {
                name: result.name || 'AI Generated Algorithm',
                category: result.category || 'AI Generated',
                type: result.type || 'bars',
                complexity: result.complexity || { time: 'O(?)', space: 'O(?)' },
                defaultData: result.defaultData || [],
                code: codeStr,
                run: result.run || function(inputData, searchTarget) {
                    return { steps: [], complexity: { time: 'O(?)', space: 'O(?)' } };
                }
            };
            console.timeEnd('⚡ JS Eval + Registration');
            console.timeEnd('⚡ AI Total Generation Time');

            return 'custom_ai';

        } catch (err) {
            console.timeEnd('⚡ AI Network Request');
            console.timeEnd('⚡ AI Total Generation Time');
            console.error("AI Generation Error:", err);
            throw err;
        }
    }

    // ─── Unified Text Completion Helper ─────────────
    async function generateTextCompletion(systemPrompt, userPrompt) {
        if (provider === 'ollama') {
            const response = await fetchWithRetry(`${ollamaUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    stream: false,
                    options: { temperature: 0.0 }
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            return data.message.content;
        } else if (provider === 'gemini') {
            const apiKey = getApiKey();
            if (!apiKey) throw new Error('Gemini API Key is required. Set it in the settings modal.');
            const url = `${GEMINI_BASE}${selectedModel}:generateContent?key=${apiKey}`;
            const response = await fetchWithRetry(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: { text: systemPrompt } },
                    contents: [{ parts: [{ text: userPrompt }] }],
                    generationConfig: { temperature: 0.0 }
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            return data.candidates[0].content.parts[0].text;
        } else if (provider === 'nvidia') {
            const apiKey = getNvidiaApiKey();
            if (!apiKey) throw new Error('NVIDIA API Key is required. Set it in the settings modal.');
            const token = localStorage.getItem('token');
            const response = await fetchWithRetry('/api/nvidia/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Nvidia-Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: selectedModel || 'meta/llama3-70b-instruct',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.0,
                    max_tokens: 4096,
                    stream: false
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message || 'NVIDIA API error');
            return data.choices[0].message.content;
        }
        throw new Error('Unsupported AI provider.');
    }

    // ─── Dynamic AI Chat Response ───────────────────
    async function generateChatResponse(userQuery) {
        return generateTextCompletion(CHAT_SYSTEM_PROMPT, userQuery);
    }

    // ─── Generate Code from Prompt ─────────────────
    async function generateCodeFromPrompt(promptStr) {
        const systemPrompt = `You are NeuroCode Builder, an AI assistant that writes clean, self-contained algorithms in C++ or Javascript.
Given a request from the user, write the complete, clean algorithm code.
Follow these guidelines:
1. Output ONLY the code itself.
2. Do NOT wrap the code in markdown code blocks (e.g. \`\`\`cpp).
3. Do NOT include any introductory or concluding text, explanations, or notes.
4. Make the code clean, well-commented, and suitable for algorithm visualization.
5. Example: If the user asks for 'Bubble Sort', return the C++ bubbleSort function and nothing else.`;

        let resultText = await generateTextCompletion(systemPrompt, promptStr);
        // Clean up markdown block wraps just in case
        resultText = resultText.replace(/^```[a-zA-Z]*\n/gm, '').replace(/```$/gm, '').trim();
        return resultText;
    }

    // ─── Generate Pseudocode from Code ─────────────
    async function generatePseudocodeFromCode(codeStr) {
        const systemPrompt = `You are NeuroCode Builder, an AI assistant that analyzes code and explains algorithms.
Given raw source code (e.g. C++ or Javascript), explain the algorithm step-by-step and write clean, readable pseudocode.
Follow these guidelines:
1. Output ONLY the description and the pseudocode.
2. Do NOT wrap the text in markdown code blocks representing the entire response. You can write inline code or standard list items.
3. Keep it clear, precise, and well-structured, suitable for developers who want to understand the logic.
4. Do NOT include any introductory or concluding text, notes, or meta-commentary. Start directly with the algorithm name or summary.`;

        let resultText = await generateTextCompletion(systemPrompt, codeStr);
        // Clean up markdown block wraps if any
        resultText = resultText.replace(/^```[a-zA-Z]*\n/gm, '').replace(/```$/gm, '').trim();
        return resultText;
    }

    return {
        generateVisualization,
        generateCodeFromPrompt,
        generatePseudocodeFromCode,
        generateChatResponse,
        fetchAvailableModels,
        getProvider, setProvider,
        getModel, setModel,
        getOllamaUrl, setOllamaUrl,
        getApiKey, getNvidiaApiKey
    };
})();

export default AIGenerator;
