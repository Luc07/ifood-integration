const pool = require('../db');

async function saveTokenToDB(token, expiresIn) {
  console.log(token, expiresIn);
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  const query = `
        INSERT INTO ifood_tokens (token, expires_at)
        VALUES (?, ?);
    `;

  try {
    await pool.query(query, [token, expiresAt]);
    console.log('Token salvo no banco de dados.');
  } catch (error) {
    console.error('Erro ao salvar o token no banco de dados:', error.message);
  }
}

async function getTokenFromDB() {
  const query = `
          SELECT token 
          FROM ifood_tokens
          WHERE expires_at > NOW() 
          ORDER BY id DESC 
          LIMIT 1
      `;

  try {
    const rows = await pool.query(query);

    if (rows[0].length > 0) {
      console.log('Token válido encontrado no banco.');
      return rows[0][0].token;
    } else {
      console.log('Nenhum token válido encontrado no banco.');
    }
  } catch (error) {
    console.error('Erro ao consultar o banco de dados:', error.message);
  }

  return null;
}

module.exports = {
  getTokenFromDB,
  saveTokenToDB,
};
