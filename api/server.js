const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const webHookRoutes = require('./routes/webhook');
const { getToken } = require('./lib/getToken');
const { getTokenFromDB } = require('./lib/tokenService');
const { capturarEventosPorPolling } = require('./controllers/webhookController');

const app = express();
const PORT = 3333;

app.use(cors());
app.use(express.json());

app.use('/api', webHookRoutes);

function logErro(contexto, err) {
  console.error(`[${new Date().toLocaleString()}] Erro em ${contexto}:`, err.message || err);
}

async function inicializarToken() {
  console.log('Verificando token no banco ao iniciar o servidor...');
  try {
    const token = await getTokenFromDB();
    if (!token) {
      console.log('Nenhum token válido encontrado. Obtendo novo token...');
      await getToken();
      console.log('Novo token obtido com sucesso.');
    } else {
      console.log('Token válido encontrado no banco.');
    }
  } catch (err) {
    logErro('inicialização do token', err);
  }
}

cron.schedule('*/2 * * * *', async () => {
  console.log('Executando polling de eventos:', new Date().toLocaleString());
  try {
    await capturarEventosPorPolling();
    console.log('Polling concluído com sucesso.');
  } catch (err) {
    logErro('polling de eventos', err);
  }
});

cron.schedule('0 */6 * * *', async () => {
  try {
    console.log('Iniciando atualização do token...');
    const token = await getToken();
    console.log('Token atualizado com sucesso:', token);
  } catch (err) {
    logErro('atualização do token', err);
  }
});

(async () => {
  await inicializarToken();
})();

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
