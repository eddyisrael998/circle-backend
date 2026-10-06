const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Root health check route
app.get('/', (req, res) => {
    res.send('Circle Backend Server is running!');
});

// 1. M-Pesa STK Push Route
app.post('/paystack/stkpush', async (req, res) => {
    const { email, amount, phone } = req.body;

    if (!email || !amount || !phone) {
        return res.status(400).json({ status: false, message: 'Missing required parameters: email, amount, or phone' });
    }

    try {
        let formattedPhone = phone.toString().trim();
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.slice(1);
        } else if (formattedPhone.startsWith('+')) {
            formattedPhone = formattedPhone.slice(1);
        }

        const response = await axios.post(
            'https://api.paystack.co/charge',
            {
                email: email,
                amount: Math.round(Number(amount) * 100), // Convert KES to Kobo/Cents
                mobile_money: {
                    phone: formattedPhone,
                    provider: 'mpesa'
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.status(200).json(response.data);
    } catch (error) {
        console.error('STK Push Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { status: false, message: error.message });
    }
});

// 2. Host Escrow Payout Route
app.post('/paystack/payout', async (req, res) => {
    const { recipient, amount } = req.body;

    if (!recipient || !amount) {
        return res.status(400).json({ status: false, message: 'Missing recipient or amount' });
    }

    try {
        const response = await axios.post(
            'https://api.paystack.co/transfer',
            {
                source: 'balance',
                reason: 'Circle Host Escrow Payout',
                amount: Math.round(Number(amount) * 100),
                recipient: recipient
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.status(200).json(response.data);
    } catch (error) {
        console.error('Payout Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { status: false, message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});