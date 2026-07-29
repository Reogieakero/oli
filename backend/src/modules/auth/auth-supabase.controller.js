const supabaseAuthService = require('./auth-supabase.service');

async function exchangeSupabaseToken(req, res, next) {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: { message: 'Access token is required' } });
    }

    const result = await supabaseAuthService.exchangeSupabaseToken(accessToken);
    res.json(result);
  } catch (err) {
    if (err.message === 'Invalid or expired Supabase token') {
      return res.status(401).json({ error: { message: err.message } });
    }
    next(err);
  }
}

module.exports = { exchangeSupabaseToken };
