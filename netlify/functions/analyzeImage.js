const fetch = require("node-fetch");

// Firebase больше не нужен в этой функции
// const admin = require("firebase-admin");
// ...

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
    formData.append('return_attributes', 'beauty,gender');

    const faceResponse = await fetch(faceplusplusUrl, {
      method: 'POST',
      body: formData,
    });

    const faceData = await faceResponse.json();

    if (faceData.error_message) {
        // Если есть ошибка от API, отправляем ее на сайт
        throw new Error(faceData.error_message);
    }
    if (!faceData.faces || faceData.faces.length === 0) {
        // Если лицо не найдено, это тоже ошибка
        throw new Error("No face detected in the image. Please use a clear, forward-facing photo.");
    }
     if (faceData.faces.length > 1) {
        // Если найдено больше одного лица
        throw new Error("More than one face detected. Please use a photo of just yourself.");
    }

    const face = faceData.faces[0];
    const attributes = face.attributes;
    
    const beautyScore = attributes.beauty;
    const score = (userData.gender === 'male' ? beautyScore.male_score : beautyScore.female_score) / 10;
    
    const analysisResult = {
      score: score,
      rank: "Your analysis is complete!"
    };
    
    // ИЗМЕНЕНИЕ: Мы больше не сохраняем в базу. Просто возвращаем результат.
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(analysisResult),
    };
  } catch (error) {
    console.error("Analysis Error:", error);
    return {
      statusCode: 500, // Используем 500 для серверных ошибок
      headers,
      body: JSON.stringify({ error: error.toString() }),
    };
  }
};
