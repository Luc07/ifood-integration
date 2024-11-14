const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3333;

// Middleware para interpretar JSON no corpo das requisições
app.use(bodyParser.json());

// Rota para receber os eventos do webhook
app.post('/webhook/ifood', (req, res) => {
    const event = req.body;

    console.log('Evento recebido:', event);

    // Aqui você pode processar o evento
    // Por exemplo: verificar o tipo de evento e salvar em um banco de dados

    res.sendStatus(200); // Envia status 200 para confirmar o recebimento
});
app.get('/aloo', (req, res) => {
    console.log('Hello world');
    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
