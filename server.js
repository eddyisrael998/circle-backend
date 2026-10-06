const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// 1. Pay for Room (M-Pesa STK Push via Paystack)
app.post('/api/pay-room', async (req, res) => {
  const { phoneNumber, amount, email, roomId } = req.body;

  let formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '254' + formattedPhone.slice(1);
  }

  try {
    const response = await axios.post(
      'https://api.paystack.co/charge',
      {
        amount: amount * 100, // Amount in cents
        email: email || 'user@circleapp.com',
        currency: 'KES',
        mobile_money: {
          phone: formattedPhone,
          provider: 'mpesa'
        },
        metadata: { roomId }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Paystack Charge Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'M-Pesa collection failed.' });
  }
});

// 2. Host Escrow Payout (Send Money to Host M-Pesa)
app.post('/paystack/stkpush', async (req, res) => { ... });
  const { hostPhone, amount, hostName } = req.body;

  let formattedPhone = hostPhone.replace(/[^0-9]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '254' + formattedPhone.slice(1);
  }

  try {
    const recipientRes = await axios.post(
      'https://api.paystack.co/transferrecipient',
      {
        type: 'mobile_money',
        name: hostName || 'Circle Host',
        account_number: formattedPhone,
        bank_code: 'MPESA',
        currency: 'KES'
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    const recipientCode = recipientRes.data.data.recipient_code;

    const transferRes = await axios.post(
      'https://api.paystack.co/transfer',
      {
        source: 'balance',
        amount: amount * 100,
        recipient: recipientCode,
        reason: 'Circle Host Escrow Payout'
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    res.json({ success: true, message: 'Payout sent to host M-Pesa!', data: transferRes.data });
  } catch (error) {
    console.error('Paystack Transfer Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Host withdrawal failed.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Paystack Server running on port ${PORT}`));