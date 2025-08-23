const admin = require("firebase-admin");
const fetch = require("node-fetch");

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

// Функция для определения доминирующей эмоции
const getDominantEmotion = (emotions) => {
    if (!emotions) return 'Neutral';
    return Object.keys(emotions).reduce((a, b) => emotions[a] > emotions[b] ? a : b);
};

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

    const faceplusplusUrl = "https://api-us.faceplusplus.com/facepp/v3/detect";
    const apiKey = process.env.FACEPLUSPLUS_API_KEY;
    const apiSecret = process.env.FACEPLUSPLUS_API_SECRET;

    const formData = new URLSearchParams();
    formData.append('api_key', apiKey);
    formData.append('api_secret', apiSecret);
    formData.append('image_base64', image);
    // ИЗМЕНЕНИЕ: Убран атрибут 'skinstatus'
    formData.append('return_attributes', 'beauty,age,emotion,smile,gender');

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

    const face = faceData.faces[0];
    const attributes = face.attributes;
    
    const beautyScore = attributes.beauty;
    const score = (userData.gender === 'male' ? beautyScore.male_score : beautyScore.female_score) / 10;
    const age = attributes.age.value;
    const emotion = getDominantEmotion(attributes.emotion);
    const smileLevel = attributes.smile.value;

    const fullResult = {
      score: score,
      age: age,
      emotion: emotion,
      smileLevel: smileLevel,
      gender: attributes.gender.value,
    };
    
    const finalResultForDb = {
      ...userData,
      ...fullResult,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection("rankings").add(finalResultForDb);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(fullResult),
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
