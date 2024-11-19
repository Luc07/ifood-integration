const express = require('express');
const router = express.Router();
const { registrarPedido, capturarEvento, pegarPedido } = require('../controllers/webhookController')

router.post('/webhook', capturarEvento)

router.get('/aloo', (req, res) => {
  return res.send('alooo');
});

module.exports = router;