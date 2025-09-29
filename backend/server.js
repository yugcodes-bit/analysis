// backend/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios'); // We will use axios to talk to Ollama

const app = express();
app.use(cors());
app.use(express.json());

// --- HELPER FUNCTION TO TALK TO OLLAMA ---
async function getOllamaResponse(system_prompt, user_prompt) {
    const ollamaApiUrl = 'http://localhost:11434/api/chat';
    const body = {
        model: "llama3", // The model we downloaded
        messages: [
            {
                role: "system",
                content: system_prompt,
            },
            {
                role: "user",
                content: user_prompt,
            },
        ],
        format: "json", // Ask Ollama to guarantee the output is JSON
        stream: false,
    };

    const response = await axios.post(ollamaApiUrl, body);
    // The actual JSON string is inside a nested property in Ollama's response
    return response.data.message.content;
}


// --- ENDPOINT 1: GENERATE SCENE FROM PROMPT ---
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt } = req.body;
        const systemPrompt = `You are an expert interior designer AI. Your task is to take a user's prompt and convert it into a structured JSON object. The JSON must have a key "items" which is an array of objects. Each object must have "name" (a category like chair, sofa, table), "qualifiers" (an array of adjectives), and "placement" (a string like "center" or "back-wall"). Respond with ONLY the JSON object and no other text.`;
        
        const jsonResponse = await getOllamaResponse(systemPrompt, prompt);

        console.log("AI Response for /generate:", jsonResponse);
        res.json(JSON.parse(jsonResponse));
    } catch (error) {
        console.error("Error in /api/generate:", error);
        res.status(500).json({ error: "Failed to generate content" });
    }
});

// --- ENDPOINT 2: ANALYZE AURA FOR LIGHTING ---
app.post('/api/analyze-aura', async (req, res) => {
    try {
        const { blueprint } = req.body;
        const systemPrompt = `You are a lighting design expert AI. Your task is to analyze a room layout and predict the coordinates of bright spots and shadows. Return a JSON object with two keys: "bright_areas" and "shadow_areas". Each key should be an array of [x, y, z] coordinates. Keep the y-coordinate at 0.1. Respond with ONLY the JSON object and no other text.`;
        const userPrompt = `Here is the room blueprint: ${JSON.stringify(blueprint, null, 2)}`;

        const jsonResponse = await getOllamaResponse(systemPrompt, userPrompt);
        
        console.log("Aura Analysis Response:", jsonResponse);
        res.json(JSON.parse(jsonResponse));
    } catch (error) {
        console.error("Error during Aura Analysis:", error);
        res.status(500).json({ error: "Failed to analyze aura" });
    }
});


// --- START SERVER ---
const PORT = 3002;
app.listen(PORT, () => {
    console.log(`AI server running on http://localhost:${PORT}`);
});