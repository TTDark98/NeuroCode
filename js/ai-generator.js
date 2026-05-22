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

    // ─── Fetch available models ────────────────────
    async function fetchAvailableModels() {
        if (provider === 'ollama') {
            return fetchOllamaModels();
        } else {
            return fetchGeminiModels();
        }
    }

    async function fetchOllamaModels() {
        try {
            const res = await fetch(`${ollamaUrl}/api/tags`);
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
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return data.models
                .filter(m => m.name.startsWith('models/gemini') && m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));
        } catch (err) {
            console.error("Error fetching Gemini models:", err);
            return [];
        }
    }

    // ─── System Prompt ─────────────────────────────
    const SYSTEM_PROMPT = `You are NeuroCode AI, an algorithm visualization generator.
You will be provided with raw algorithm code (e.g., C++, Java, JS) and optionally some sample input data.
Your task is to analyze the code, understand its execution flow on the input data, and output a JSON object representing the visualization.

The JSON MUST conform exactly to this schema:
{
  "name": "Name of the Algorithm",
  "category": "Sorting | Searching | Graph Theory | Dynamic Programming",
  "type": "bars" | "searching" | "graph",
  "defaultData": [array of numbers or graph adjacency list structure],
  "steps": [
    {
      "array": [array state at this step (for bars/searching)],
      "highlights": [
        { "index": number, "type": "current" | "compare" | "swap" | "sorted" | "found" | "left" | "right" | "mid" }
      ],
      "swaps": number (cumulative total),
      "comparisons": number (cumulative total),
      "description": "Short explanation of what is happening in this step"
    }
  ],
  "complexity": {
    "time": "O(...)",
    "space": "O(...)"
  }
}

IMPORTANT RULES:
1. "defaultData" should be the parsed array or graph from the user's input data, or a sensible default if none provided.
2. Simulate the algorithm step-by-step and generate an array of "steps".
3. Return ONLY valid JSON. Do not use markdown code blocks. Just the raw JSON.`;

    // ─── Generate via Ollama ───────────────────────
    async function generateViaOllama(codeStr, inputStr) {
        const userPrompt = `Code:\n${codeStr}\n\nInput Data:\n${inputStr}`;

        const response = await fetch(`${ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: selectedModel,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt }
                ],
                stream: false,
                format: 'json'
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        return data.message.content;
    }

    // ─── Generate via Gemini ──────────────────────
    async function generateViaGemini(codeStr, inputStr) {
        const apiKey = getApiKey();
        if (!apiKey) {
            throw new Error('Gemini API Key is required. Enter it in the toolbar.');
        }

        const userPrompt = `Code:\n${codeStr}\n\nInput Data:\n${inputStr}`;
        const url = `${GEMINI_BASE}${selectedModel}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
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
                    temperature: 0.2,
                    response_mime_type: 'application/json'
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

    // ─── Main entry point ─────────────────────────
    async function generateVisualization(codeStr, playgroundInputStr) {
        let jsonStr;

        try {
            if (provider === 'ollama') {
                jsonStr = await generateViaOllama(codeStr, playgroundInputStr);
            } else {
                jsonStr = await generateViaGemini(codeStr, playgroundInputStr);
            }

            // Parse the JSON
            const result = JSON.parse(jsonStr);

            // Register it as custom AI algorithm
            ALGORITHMS['custom_ai'] = {
                name: result.name || 'AI Generated Algorithm',
                category: result.category || 'AI Generated',
                type: result.type || 'bars',
                complexity: result.complexity || { time: 'O(?)', space: 'O(?)' },
                defaultData: result.defaultData || [],
                code: codeStr,
                run: function(inputData, searchTarget) {
                    return {
                        steps: result.steps,
                        complexity: result.complexity
                    };
                }
            };

            return 'custom_ai';

        } catch (err) {
            console.error("AI Generation Error:", err);
            throw err;
        }
    }

    // ─── Generate Code from Prompt ─────────────────
    async function generateCodeFromPrompt(promptStr) {
        const systemPrompt = `You are NeuroCode Architect, an AI assistant that writes clean, self-contained algorithms in C++ or Javascript.
Given a request from the user, write the complete, clean algorithm code.
Follow these guidelines:
1. Output ONLY the code itself.
2. Do NOT wrap the code in markdown code blocks (e.g. \`\`\`cpp).
3. Do NOT include any introductory or concluding text, explanations, or notes.
4. Make the code clean, well-commented, and suitable for algorithm visualization.
5. Example: If the user asks for 'Bubble Sort', return the C++ bubbleSort function and nothing else.`;

        let resultText;
        if (provider === 'ollama') {
            const response = await fetch(`${ollamaUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: promptStr }
                    ],
                    stream: false
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            resultText = data.message.content;
        } else {
            const apiKey = getApiKey();
            if (!apiKey) {
                throw new Error('Gemini API Key is required. Set it in the settings modal.');
            }
            const url = `${GEMINI_BASE}${selectedModel}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: {
                        parts: { text: systemPrompt }
                    },
                    contents: [{
                        parts: [{ text: promptStr }]
                    }],
                    generationConfig: {
                        temperature: 0.3
                    }
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            resultText = data.candidates[0].content.parts[0].text;
        }

        // Clean up markdown block wraps just in case
        resultText = resultText.replace(/^```[a-zA-Z]*\n/gm, '').replace(/```$/gm, '').trim();
        return resultText;
    }

    // ─── Generate Pseudocode from Code ─────────────
    async function generatePseudocodeFromCode(codeStr) {
        const systemPrompt = `You are NeuroCode Architect, an AI assistant that analyzes code and explains algorithms.
Given raw source code (e.g. C++ or Javascript), explain the algorithm step-by-step and write clean, readable pseudocode.
Follow these guidelines:
1. Output ONLY the description and the pseudocode.
2. Do NOT wrap the text in markdown code blocks representing the entire response. You can write inline code or standard list items.
3. Keep it clear, precise, and well-structured, suitable for developers who want to understand the logic.
4. Do NOT include any introductory or concluding text, notes, or meta-commentary. Start directly with the algorithm name or summary.`;

        let resultText;
        if (provider === 'ollama') {
            const response = await fetch(`${ollamaUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: codeStr }
                    ],
                    stream: false
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            resultText = data.message.content;
        } else {
            const apiKey = getApiKey();
            if (!apiKey) {
                throw new Error('Gemini API Key is required. Set it in the settings modal.');
            }
            const url = `${GEMINI_BASE}${selectedModel}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: {
                        parts: { text: systemPrompt }
                    },
                    contents: [{
                        parts: [{ text: codeStr }]
                    }],
                    generationConfig: {
                        temperature: 0.3
                    }
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            resultText = data.candidates[0].content.parts[0].text;
        }

        // Clean up markdown block wraps if any
        resultText = resultText.replace(/^```[a-zA-Z]*\n/gm, '').replace(/```$/gm, '').trim();
        return resultText;
    }

    return {
        generateVisualization,
        generateCodeFromPrompt,
        generatePseudocodeFromCode,
        fetchAvailableModels,
        getProvider, setProvider,
        getModel, setModel,
        getOllamaUrl, setOllamaUrl,
        getApiKey
    };
})();

export default AIGenerator;
