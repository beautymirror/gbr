const admin = require("firebase-admin");

// Инициализация Firebase
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
  };

  try {
    const snapshot = await db.collection("rankings").get();
    const allRankings = snapshot.docs.map(doc => doc.data());

    // --- Подготовка данных ---
    const paidRankings = allRankings.filter(r => r.paymentStatus === 'Paid');
    const sortedByScore = [...allRankings].sort((a, b) => b.score - a.score);
    const sortedByTime = [...allRankings].sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

    // --- Расчет статистики ---
    const revenue = paidRankings.reduce((sum, item) => sum + (item.paymentAmount || 0), 0);
    const totalScore = allRankings.reduce((sum, item) => sum + (item.score || 0), 0);
    const avgScore = allRankings.length > 0 ? (totalScore / allRankings.length) : 0;
    
    const countryScores = {};
    allRankings.forEach(r => {
        if (r.country && r.country !== 'Unknown') {
            if (!countryScores[r.country]) {
                countryScores[r.country] = { total: 0, count: 0 };
            }
            countryScores[r.country].total += r.score;
            countryScores[r.country].count++;
        }
    });
    const topCountry = Object.keys(countryScores).map(country => ({
        name: country,
        avgScore: countryScores[country].total / countryScores[country].count
    })).sort((a, b) => b.avgScore - a.avgScore)[0];


    // --- Агрегация по странам ---
    const countryAggregates = {};
    sortedByScore.forEach(r => {
        if (r.country && r.country !== 'Unknown') {
            if (!countryAggregates[r.country]) {
                countryAggregates[r.country] = { total: 0, count: 0 };
            }
            countryAggregates[r.country].total += r.score;
            countryAggregates[r.country].count++;
        }
    });
    const countryRanking = Object.keys(countryAggregates).map(country => ({
        name: country,
        score: countryAggregates[country].total / countryAggregates[country].count
    })).sort((a, b) => b.score - a.score);


    // --- Формирование итогового объекта ---
    const payload = {
        stats: {
            totalCount: allRankings.length,
            paidCount: paidRankings.length,
            revenue: revenue,
            avgScore: avgScore,
            topCountry: topCountry ? topCountry.name : 'N/A'
        },
        marqueeData: sortedByTime.slice(0, 10),
        rankings: {
            world: sortedByScore.slice(0, 9), // Только топ-9
            countries: countryRanking.slice(0, 9),
            men: sortedByScore.filter(r => r.gender && r.gender.toLowerCase() === 'male').slice(0, 9),
            women: sortedByScore.filter(r => r.gender && r.gender.toLowerCase() === 'female').slice(0, 9)
        }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(payload),
    };

  } catch (error) {
    console.error("Get Stats Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.toString() }),
    };
  }
};
