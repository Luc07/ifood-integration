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

app.use('/aloo', (res, req) => {
  return res.send('alooo');
})

cron.schedule('*/2 * * * *', async () => {
  console.log('Executando polling de eventos:', new Date().toLocaleString());
  try {
    await capturarEventosPorPolling();
    console.log('Polling concluído com sucesso.');
  } catch (err) {
    console.error('Erro ao executar polling:', err.message);
  }
});

cron.schedule('0 */6 * * *', async () => {
  try {
    console.log('Iniciando atualização do token...');
    const token = await getToken();
    console.log('Token atualizado com sucesso:', token);
  } catch (err) {
    console.error('Erro ao atualizar o token:', err.message);
  }
});

(async () => {
  try {
      console.log('Verificando token no banco ao iniciar o servidor...');
      const token = await getTokenFromDB();
      if (!token) {
          console.log('Nenhum token válido encontrado. Obtendo novo token...');
          await getToken();
          console.log('Novo token obtido com sucesso.');
      } else {
          console.log('Token válido encontrado no banco.');
      }
  } catch (err) {
      console.error('Erro ao verificar ou obter token na inicialização:', err.message);
  }
})();

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
