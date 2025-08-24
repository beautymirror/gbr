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
    // Получаем ID документа из запроса
    const { documentId } = JSON.parse(event.body);
    if (!documentId) {
      throw new Error("Document ID is missing.");
    }

    const docRef = db.collection('rankings').doc(documentId);
    
    // Удаляем документ из Firestore
    await docRef.delete();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: "Document deleted successfully." }),
    };
  } catch (error) {
    console.error("Delete Ranking Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.toString() }),
    };
  }
};
