const axios = require('axios');
const { getTokenFromDB } = require('../lib/tokenService');
const pool = require('../db');
const { isSameDay } = require('date-fns');

async function registrarPedido(orderId, orderDetails) {
  const query = `
    INSERT INTO pedidos (orderId, detalhes, status)
    VALUES (?, ?, 1)
    ON DUPLICATE KEY UPDATE detalhes = VALUES(detalhes);
  `;
  const values = [orderId, JSON.stringify(orderDetails)];
  await pool.query(query, values);
}

async function capturarEvento(req, res) {
  req.body.fullCode !== 'KEEPALIVE' ? console.log(req.body) : '';
  try {
    const evento = req.body;

    if (evento.fullCode === 'PREPARATION_STARTED') {
      const orderId = evento.orderId;
      console.log(`Evento de pedido: ${orderId}`);

      try {
        const token = await getTokenFromDB();
        if (!token) {
          return res.status(400).json({ error: 'Token não encontrado ou expirado' });
        }

        const detalhesPedido = await obterDetalhesDoPedido(orderId, token);
        await registrarPedido(orderId, detalhesPedido);

        return res.status(200).json({ message: 'Pedido registrado com sucesso!' });
      } catch (error) {
        console.error(`Erro ao processar pedido ${orderId}:`, error.message);
        return res.status(500).json({ error: 'Erro ao registrar o pedido' });
      }
    } else if (evento.fullCode === 'CANCELLED') {
      const orderId = evento.orderId;
      console.log(`Evento de cancelamento de pedido: ${orderId}`);

      try {
        await cancelarPedido(orderId);
        return res.status(200).json({ message: 'Pedido cancelado com sucesso!' });
      } catch (error) {
        console.error(`Erro ao cancelar o pedido ${orderId}:`, error.message);
        return res.status(500).json({ error: 'Erro ao cancelar o pedido' });
      }
    } else {
      return res.status(200).json({ message: 'Evento não relacionado a um pedido colocado.' });
    }
  } catch (err) {
    console.error('Erro ao processar o evento:', err.message);
    return res.status(500).json({ error: 'Erro interno ao processar o evento' });
  }
}

const capturarEventosPorPolling = async () => {
  console.log('Iniciando polling de eventos:', new Date().toLocaleString());

  try {
    const token = await getTokenFromDB();
    if (!token) {
      console.error('Token não encontrado ou expirado.');
      return;
    }

    const response = await axios.get(
      'https://merchant-api.ifood.com.br/events/v1.0/events:polling?types=PRS&categories=FOOD%2CGROCERY%2CFOOD_SELF_SERVICE',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const eventos = response.data || [];
    if (eventos.length === 0) {
      console.log('Nenhum evento capturado.');
      return;
    }

    console.log(`Eventos capturados: ${eventos.length}`);

    const eventosParaAcknowledge = new Set();

    for (const evento of eventos) {
      try {
        const { id, orderId, createdAt, fullCode } = evento;

        const hoje = new Date().toISOString().split('T')[0];
        const dataEvento = new Date(createdAt).toISOString().split('T')[0];
        if (hoje !== dataEvento) {
          console.log(`Evento ignorado (não é de hoje): ${id}`);
          continue;
        }

        if (fullCode === 'PREPARATION_STARTED') {
          console.log(`Processando pedido com ID: ${orderId}`);
          const orderDetails = await obterDetalhesDoPedido(orderId, token);
          await registrarPedido(orderId, orderDetails);
        } else if (fullCode === 'CANCELLED') {
          console.log(`Processando pedido cancelado com ID: ${orderId}`);
          await cancelarPedido(orderId);
        } else {
          console.log(`Evento com código desconhecido ou não suportado: ${fullCode}`);
        }

        eventosParaAcknowledge.add({ id });
      } catch (error) {
        console.error('Erro ao processar evento individual:', error.message);
      }
    }

    if (eventosParaAcknowledge.size > 0) {
      try {
        console.log(`Enviando ${eventosParaAcknowledge.size} eventos para acknowledgment.`);
        await axios.post(
          'https://merchant-api.ifood.com.br/events/v1.0/events/acknowledgment',
          Array.from(eventosParaAcknowledge),
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log('Eventos reconhecidos com sucesso.');
      } catch (error) {
        console.error('Erro ao enviar acknowledgment:', error.message);
      }
    }
  } catch (err) {
    console.error('Erro ao processar polling:', err.message);
  }
};

async function obterDetalhesDoPedido(orderId, token) {
  const url = `https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}`;
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Erro ao obter detalhes do pedido ${orderId}:`, error.message);
    throw new Error('Erro ao obter detalhes do pedido');
  }
}

async function cancelarPedido(orderId) {
  const query = `
    UPDATE pedidos 
    SET status = 2 
    WHERE orderId = ?
  `;
  const values = [orderId];

  try {
    await pool.query(query, values);
    console.log(`Pedido ${orderId} cancelado com sucesso.`);
  } catch (error) {
    console.error(`Erro ao cancelar o pedido ${orderId}:`, error.message);
    throw new Error('Erro ao cancelar o pedido');
  }
}

module.exports = {
  capturarEvento,
  capturarEventosPorPolling
};
