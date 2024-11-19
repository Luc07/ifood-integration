const express = require('express');
const router = express.Router();
const { registrarPedido, capturarEvento, pegarPedido } = require('../controllers/webhookController')

router.post('/webhook', capturarEvento)


module.exports = router;