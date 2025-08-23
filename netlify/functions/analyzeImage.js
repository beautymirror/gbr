const admin = require("firebase-admin");
const fetch = require("node-fetch"); // Используем node-fetch для запросов

// Инициализируем Firebase только один раз
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    console.error("Firebase admin initialization error", e);
  }
}
const db = admin.firestore();

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
    const { image, userData } = JSON.parse(event.body);
    if (!image || !userData) {
      throw new Error("Missing image or user data.");
    }

    // --- Логика для Face++ ---
    const faceplusplusUrl = "https://api-us.faceplusplus.com/facepp/v3/detect";
    const apiKey = process.env.FACEPLUSPLUS_API_KEY;
    const apiSecret = process.env.FACEPLUSPLUS_API_SECRET;

    const formData = new URLSearchParams();
    formData.append('api_key', apiKey);
    formData.append('api_secret', apiSecret);
    formData.append('image_base64', image);
    formData.append('return_attributes', 'beauty');

    const faceResponse = await fetch(faceplusplusUrl, {
      method: 'POST',
      body: formData,
    });

    const faceData = await faceResponse.json();

    if (faceData.error_message) {
        throw new Error(faceData.error_message);
    }
    if (!faceData.faces || faceData.faces.length === 0) {
        throw new Error("No face detected in the image.");
    }

    // Face++ возвращает оценку от 0 до 100. Мы делим на 10, чтобы получить от 1 до 10.
    // Мы берем оценку для соответствующего пола.
    const beautyScore = faceData.faces[0].attributes.beauty;
    const score = (userData.gender === 'male' ? beautyScore.male_score : beautyScore.female_score) / 10;
    
    // --- Конец логики Face++ ---

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
      body: JSON.stringify({ error: error.toString() }),
    };
  }
};
