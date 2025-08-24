const admin = require("firebase-admin");

// Инициализация Firebase (если еще не сделана)
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
    return { statusCode: 200, headers };
  }

  try {
    // Получаем ID документа и новые данные из запроса
    const { documentId, data } = JSON.parse(event.body);
    if (!documentId || !data) {
      throw new Error("Document ID or data is missing.");
    }

    const docRef = db.collection('rankings').doc(documentId);
    
    // Обновляем документ в Firestore
    await docRef.update(data);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: "Document updated successfully." }),
    };
  } catch (error) {
    console.error("Update Ranking Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.toString() }),
    };
  }
};
