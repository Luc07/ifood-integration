const axios = require('axios');
const qs = require('qs');
const { saveTokenToDB, getTokenFromDB } = require('./tokenService');

async function getToken() {
  const url = process.env.URL_TOKEN;
  const data = qs.stringify({
    grantType: process.env.GRANT_TYPE,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
  });

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    try {
      await saveTokenToDB(response.data.accessToken, response.data.expiresIn);
      console.log('Token obtido e salvo com sucesso.');
    } catch (dbError) {
      console.error('Erro ao salvar o token no banco de dados:', dbError.message);
    }

    return response.data.accessToken;

  } catch (error) {
    console.error('Erro ao obter o token:', error.response?.data || error.message);
    return null;
  }
}

module.exports = {
  getToken,
};
