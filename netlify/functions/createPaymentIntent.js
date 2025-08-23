const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  // ИСПРАВЛЕНИЕ: Добавлены заголовки для CORS
  const headers = {
    "Access-Control-Allow-Origin": "*", // Разрешаем запросы с любого домена
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Обрабатываем pre-flight запрос от браузера
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Successful preflight call." }),
    };
  }
  
  try {
    const amount = 100; // $1.00
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      statusCode: 200,
      headers, // Добавляем заголовки в успешный ответ
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret }),
    };
  } catch (error) {
    console.error("Stripe Error:", error);
    return {
      statusCode: 500,
      headers, // Добавляем заголовки в ответ с ошибкой
      body: JSON.stringify({ error: error.message }),
    };
  }
};
