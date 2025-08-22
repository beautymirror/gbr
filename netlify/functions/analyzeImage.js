const { GoogleGenerativeAI } = require("@google/generative-ai");

// ВАЖНО: Ваш API ключ Gemini будет храниться в Netlify
const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Successful preflight call." }),
    };
  }

  try {
    // Получаем только изображение из запроса
    const { image } = JSON.parse(event.body);
    if (!image) {
      throw new Error("Missing image data.");
    }

    const prompt = "Оцени красоту человека на этом фото по шкале от 1.0 до 10.0. В ответе верни ТОЛЬКО число, например: 8.7. Никаких других слов или объяснений.";
    const imagePart = { inlineData: { data: image, mimeType: "image/jpeg" } };
    
    const result = await model.generateContent([prompt, imagePart]);
    const textResponse = result.response.text();
    const score = parseFloat(textResponse.trim().replace(",", "."));

    if (isNaN(score)) {
      throw new Error("AI returned a non-numeric score.");
    }
    
    // Просто возвращаем результат в браузер
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        score: score.toFixed(1),
        rank: "Your analysis is complete!",
      }),
    };
  } catch (error) {
    console.error("Analysis Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to analyze image." }),
    };
  }
};
