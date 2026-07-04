// Netlify Function: crea una preferencia de pago en Mercado Pago
// Requiere la variable de entorno MP_ACCESS_TOKEN en el panel de Netlify

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders(), body: '' };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Método no permitido' }) };
    }

    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) {
        console.error('MP_ACCESS_TOKEN no está configurado en las variables de entorno de Netlify');
        return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'Configuración incompleta. Contactá al administrador.' }) };
    }

    let body;
    try { body = JSON.parse(event.body); }
    catch (e) { return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Datos inválidos' }) }; }

    const { nombre, precio, talle } = body;

    if (!nombre || !precio || isNaN(Number(precio))) {
        return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Faltan datos del producto' }) };
    }

    const titulo = nombre + (talle ? ' — Talle ' + talle : '');
    const siteUrl = 'https://urbanset-ar.netlify.app';

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
        const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preference)
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('Error de Mercado Pago:', JSON.stringify(data));
            return {
                statusCode: 502,
                headers: corsHeaders(),
                body: JSON.stringify({ error: 'Error al procesar el pago. Intentá de nuevo.' })
            };
        }

        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                init_point: data.init_point,
                id: data.id
            })
        };
    } catch (err) {
        console.error('Error de red:', err.message);
        return {
            statusCode: 500,
            headers: corsHeaders(),
            body: JSON.stringify({ error: 'Error de conexión. Intentá de nuevo.' })
        };
    }
};

function corsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
}
