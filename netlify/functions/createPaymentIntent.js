const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// --- СПИСКИ СТРАН ДЛЯ РАЗНЫХ ЦЕН ---

// Группа 1: Страны с высоким уровнем жизни ($4.99)
const highIncomeCountries = [
  "AD", "AE", "AG", "AU", "AT", "BS", "BH", "BB", "BE", "BN",
  "CA", "CL", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE",
  "GR", "HK", "HU", "IS", "IE", "IL", "IT", "JP", "KR", "KW",
  "LV", "LI", "LT", "LU", "MT", "MC", "NL", "NZ", "NO", "OM",
  "PL", "PT", "QA", "SM", "SA", "SG", "SK", "SI", "ES", "SE",
  "CH", "TW", "GB", "US", "UY"
];

// Группа 2: Развивающиеся страны ($2.49)
const developingCountries = [
  "AL", "DZ", "AO", "AR", "AM", "AZ", "BD", "BY", "BZ", "BJ",
  "BT", "BO", "BA", "BW", "BR", "BG", "BF", "BI", "KH", "CM",
  "CV", "CF", "TD", "CN", "CO", "KM", "CG", "CD", "CR", "CI",
  "CU", "DJ", "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "ET",
  "FJ", "GA", "GM", "GE", "GH", "GD", "GT", "GN", "GW", "GY",
  "HT", "HN", "IN", "ID", "IR", "IQ", "JM", "JO", "KZ", "KE",
  "KI", "KG", "LA", "LB", "LS", "LR", "LY", "MK", "MG", "MW",
  "MY", "MV", "ML", "MH", "MR", "MU", "MX", "FM", "MD", "MN",
  "ME", "MA", "MZ", "MM", "NA", "NP", "NI", "NE", "NG", "PK",
  "PW", "PA", "PG", "PY", "PE", "PH", "RO", "RU", "RW", "WS",
  "ST", "SN", "RS", "SL", "SB", "ZA", "LK", "VC", "SD", "SR",
  "SZ", "SY", "TJ", "TZ", "TH", "TL", "TG", "TO", "TN", "TR",
  "TM", "TV", "UG", "UA", "UZ", "VU", "VN", "YE", "ZM", "ZW"
];

// --- ЛОГИКА ФУНКЦИИ ---

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
    const countryCode = context.geo.country.code;
    const countryName = context.geo.country.name;
    let amount;

    // Определяем цену на основе страны
    if (highIncomeCountries.includes(countryCode)) {
      amount = 499; // $4.99
    } else if (developingCountries.includes(countryCode)) {
      amount = 249; // $2.49
    } else {
      amount = 99;  // $0.99 для всех остальных
    }

    const currency = "usd";

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        amount: amount,
        currency: currency,
        country: countryName
      }),
    };
  } catch (error) {
    console.error("Stripe Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
