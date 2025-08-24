const admin = require("firebase-admin");

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
    const { documentId, amount, currency, paymentMethod } = JSON.parse(event.body);
    if (!documentId) {
      throw new Error("Document ID is missing.");
    }

    const docRef = db.collection('rankings').doc(documentId);
    await docRef.update({
      paymentStatus: 'Paid',
      paymentAmount: amount / 100, // Конвертируем из центов в доллары
      paymentCurrency: currency.toUpperCase(),
      paymentMethod: paymentMethod,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Update Payment Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.toString() }),
    };
  }
};
