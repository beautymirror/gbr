const admin = require("firebase-admin");
const Papa = require("papaparse");

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

const countryCodeToName = { "AF":"Afghanistan", "AL":"Albania", "DZ":"Algeria", "AS":"American Samoa", "AD":"Andorra", "AO":"Angola", "AI":"Anguilla", "AQ":"Antarctica", "AG":"Antigua and Barbuda", "AR":"Argentina", "AM":"Armenia", "AW":"Aruba", "AU":"Australia", "AT":"Austria", "AZ":"Azerbaijan", "BS":"Bahamas", "BH":"Bahrain", "BD":"Bangladesh", "BB":"Barbados", "BY":"Belarus", "BE":"Belgium", "BZ":"Belize", "BJ":"Benin", "BM":"Bermuda", "BT":"Bhutan", "BO":"Bolivia", "BA":"Bosnia and Herzegovina", "BW":"Botswana", "BR":"Brazil", "IO":"British Indian Ocean Territory", "VG":"British Virgin Islands", "BN":"Brunei", "BG":"Bulgaria", "BF":"Burkina Faso", "BI":"Burundi", "KH":"Cambodia", "CM":"Cameroon", "CA":"Canada", "CV":"Cape Verde", "KY":"Cayman Islands", "CF":"Central African Republic", "TD":"Chad", "CL":"Chile", "CN":"China", "CX":"Christmas Island", "CC":"Cocos (Keeling) Islands", "CO":"Colombia", "KM":"Comoros", "CK":"Cook Islands", "CR":"Costa Rica", "HR":"Croatia", "CU":"Cuba", "CW":"Curaçao", "CY":"Cyprus", "CZ":"Czechia", "DK":"Denmark", "DJ":"Djibouti", "DM":"Dominica", "DO":"Dominican Republic", "CD":"DR Congo", "EC":"Ecuador", "EG":"Egypt", "SV":"El Salvador", "GQ":"Equatorial Guinea", "ER":"Eritrea", "EE":"Estonia", "SZ":"Eswatini (Swaziland)", "ET":"Ethiopia", "FK":"Falkland Islands", "FO":"Faroe Islands", "FJ":"Fiji", "FI":"Finland", "FR":"France", "GF":"French Guiana", "PF":"French Polynesia", "TF":"French Southern and Antarctic Lands", "GA":"Gabon", "GM":"Gambia", "GE":"Georgia", "DE":"Germany", "GH":"Ghana", "GI":"Gibraltar", "GR":"Greece", "GL":"Greenland", "GD":"Grenada", "GP":"Guadeloupe", "GU":"Guam", "GT":"Guatemala", "GG":"Guernsey", "GN":"Guinea", "GW":"Guinea-Bissau", "GY":"Guyana", "HT":"Haiti", "HN":"Honduras", "HK":"Hong Kong", "HU":"Hungary", "IS":"Iceland", "IN":"India", "ID":"Indonesia", "IR":"Iran", "IQ":"Iraq", "IE":"Ireland", "IM":"Isle of Man", "IL":"Israel", "IT":"Italy", "CI":"Ivory Coast", "JM":"Jamaica", "JP":"Japan", "JE":"Jersey", "JO":"Jordan", "KZ":"Kazakhstan", "KE":"Kenya", "KI":"Kiribati", "XK":"Kosovo", "KW":"Kuwait", "KG":"Kyrgyzstan", "LA":"Laos", "LV":"Latvia", "LB":"Lebanon", "LS":"Lesotho", "LR":"Liberia", "LY":"Libya", "LI":"Liechtenstein", "LT":"Lithuania", "LU":"Luxembourg", "MO":"Macau", "MG":"Madagascar", "MW":"Malawi", "MY":"Malaysia", "MV":"Maldives", "ML":"Mali", "MT":"Malta", "MH":"Marshall Islands", "MQ":"Martinique", "MR":"Mauritania", "MU":"Mauritius", "YT":"Mayotte", "MX":"Mexico", "FM":"Micronesia", "MD":"Moldova", "MC":"Monaco", "MN":"Mongolia", "ME":"Montenegro", "MS":"Montserrat", "MA":"Morocco", "MZ":"Mozambique", "MM":"Myanmar", "NA":"Namibia", "NR":"Nauru", "NP":"Nepal", "NL":"Netherlands", "NC":"New Caledonia", "NZ":"New Zealand", "NI":"Nicaragua", "NE":"Niger", "NG":"Nigeria", "NU":"Niue", "NF":"Norfolk Island", "KP":"North Korea", "MK":"North Macedonia", "MP":"Northern Mariana Islands", "NO":"Norway", "OM":"Oman", "PK":"Pakistan", "PW":"Palau", "PS":"Palestine", "PA":"Panama", "PG":"Papua New Guinea", "PY":"Paraguay", "PE":"Peru", "PH":"Philippines", "PN":"Pitcairn Islands", "PL":"Poland", "PT":"Portugal", "PR":"Puerto Rico", "QA":"Qatar", "CG":"Republic of the Congo", "RO":"Romania", "RU":"Russia", "RW":"Rwanda", "RE":"Réunion", "BL":"Saint Barthélemy", "SH":"Saint Helena Ascension and Tristan da Cunha", "KN":"Saint Kitts and Nevis", "LC":"Saint Lucia", "MF":"Saint Martin", "PM":"Saint Pierre and Miquelon", "VC":"Saint Vincent and the Grenadines", "WS":"Samoa", "SM":"San Marino", "SA":"Saudi Arabia", "SN":"Senegal", "RS":"Serbia", "SC":"Seychelles", "SL":"Sierra Leone", "SG":"Singapore", "SX":"Sint Maarten", "SK":"Slovakia", "SI":"Slovenia", "SB":"Solomon Islands", "SO":"Somalia", "ZA":"South Africa", "KR":"South Korea", "SS":"South Sudan", "ES":"Spain", "LK":"Sri Lanka", "SD":"Sudan", "SR":"Suriname", "SJ":"Svalbard and Jan Mayen", "SE":"Sweden", "CH":"Switzerland", "SY":"Syria", "ST":"São Tomé and Príncipe", "TW":"Taiwan", "TJ":"Tajikistan", "TZ":"Tanzania", "TH":"Thailand", "TL":"Timor-Leste", "TG":"Togo", "TK":"Tokelau", "TO":"Tonga", "TT":"Trinidad and Tobago", "TN":"Tunisia", "TR":"Turkey", "TM":"Turkmenistan", "TC":"Turks and Caicos Islands", "TV":"Tuvalu", "UG":"Uganda", "UA":"Ukraine", "AE":"United Arab Emirates", "GB":"United Kingdom", "US":"United States", "UM":"United States Minor Outlying Islands", "VI":"United States Virgin Islands", "UY":"Uruguay", "UZ":"Uzbekistan", "VU":"Vanuatu", "VA":"Vatican City (Holy See)", "VE":"Venezuela", "VN":"Vietnam", "WF":"Wallis and Futuna", "EH":"Western Sahara", "YE":"Yemen", "ZM":"Zambia", "ZW":"Zimbabwe" };

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*" };

  try {
    const csvText = event.body;
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    const data = parsed.data;

    const batchSize = 400;
    let count = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = db.batch();
      const chunk = data.slice(i, i + batchSize);

      chunk.forEach(row => {
        const docRef = db.collection('rankings').doc();
        
        let score = parseFloat(row.score);
        if (score > 10) {
            score = score / 10;
        }

        const formattedTimestamp = row.timestamp.replace(' ', 'T');
        const timestamp = admin.firestore.Timestamp.fromDate(new Date(formattedTimestamp));
        const countryName = countryCodeToName[row.country.toUpperCase()] || row.country || 'Unknown';

        if (isNaN(score) || !row.timestamp) {
            console.warn('Skipping invalid row:', row);
            return;
        }

        batch.set(docRef, {
            timestamp: timestamp,
            name: row.name || 'Anonymous',
            country: countryName,
            age: row.age || 'N/A',
            profession: row.profession || 'N/A',
            // ИЗМЕНЕНИЕ: Добавлено поле gender
            gender: row.gender || 'N/A',
            score: score,
            paymentStatus: 'Paid',
            ip: 'imported',
            trafficSource: 'imported'
        });
        count++;
      });
      await batch.commit();
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: `Upload complete! ${count} records were successfully imported.` }),
    };

  } catch (error) {
    console.error("Import Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.toString() }),
    };
  }
};
