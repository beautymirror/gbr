const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");

const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

// Инициализируем Firebase только один раз
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

exports.handler = async (event, context) => {
  // ИСПРАВЛЕНИЕ: Добавлены заголовки для CORS
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
    const { image, userData } = JSON.parse(event.body);
    if (!image || !userData) {
      throw new Error("Missing image or user data.");
    }

    const prompt = "Оцени красоту человека на этом фото по шкале от 1.0 до 10.0. В ответе верни ТОЛЬКО число, например: 8.7. Никаких других слов или объяснений.";
    const imagePart = { inlineData: { data: image, mimeType: "image/jpeg" } };
    
    const result = await model.generateContent([prompt, imagePart]);
    const textResponse = result.response.text();
    const score = parseFloat(textResponse.trim().replace(",", "."));

    if (isNaN(score)) {
      throw new Error("AI returned a non-numeric score.");
    }

    const finalResult = {
      name: userData.name || "Anonymous",
      country: userData.country || "Unknown",
      gender: userData.gender || "Not specified",
      age: userData.age || "Not specified",
      score: score,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("rankings").add(finalResult);

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
