const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow image data

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/analyze-meal', async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = "Identify the food in this image. Return ONLY a JSON object with: { \"name\": string, \"calories\": number, \"protein\": number, \"carbs\": number, \"fat\": number }. Estimate portions for a single serving.";

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }
        ]);

        // Clean the response (remove ```json wrappers if present)
        const text = result.response.text().replace(/```json|```/g, "");
        res.json(JSON.parse(text));
    } catch (error) {
        console.error(error);
        res.status(500).send("AI analysis failed");
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));

require('dotenv').config(); // This loads the .env file
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// ... the rest of your server code ...