// Vercel Function: crea una preferencia de pago en Mercado Pago
// Requiere la variable de entorno MP_ACCESS_TOKEN en el panel de Vercel

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) {
        console.error('MP_ACCESS_TOKEN no está configurado en las variables de entorno de Vercel');
        return res.status(500).json({ error: 'Configuración incompleta. Contactá al administrador.' });
    }

    const { nombre, precio, talle } = req.body || {};

    if (!nombre || !precio || isNaN(Number(precio))) {
        return res.status(400).json({ error: 'Faltan datos del producto' });
    }

    const titulo = nombre + (talle ? ' — Talle ' + talle : '');
    const siteUrl = 'https://urbanset.vercel.app';

    const preference = {
        items: [{
            id: 'urbanset-' + nombre.toLowerCase().replace(/\s+/g, '-'),
            title: titulo,
            quantity: 1,
            unit_price: Number(precio),
            currency_id: 'ARS',
            category_id: 'fashion'
        }],
        back_urls: {
            success: siteUrl + '?pago=ok',
            failure: siteUrl + '?pago=error',
            pending: siteUrl + '?pago=pendiente'
        },
        auto_return: 'approved',
        statement_descriptor: 'URBANSET',
        expires: false
    };

    try {
        const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preference)
        });

        const data = await mpRes.json();

        if (!mpRes.ok) {
            console.error('Error de Mercado Pago:', JSON.stringify(data));
            return res.status(502).json({ error: 'Error al procesar el pago. Intentá de nuevo.' });
        }

        return res.status(200).json({ init_point: data.init_point, id: data.id });
    } catch (err) {
        console.error('Error de red:', err.message);
        return res.status(500).json({ error: 'Error de conexión. Intentá de nuevo.' });
    }
};
