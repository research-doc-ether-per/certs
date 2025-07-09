// src/middleware/introspect.js
const axios = require('axios');

async function introspect(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).end();

  try {
    const url = `${process.env.ISSUER_BASE_URL}/protocol/openid-connect/token/introspect`;
    const params = new URLSearchParams({
      token,
      client_id:     process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
    });
    const { data } = await axios.post(url, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (!data.active) return res.status(401).end();
    req.user = data;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = introspect;
