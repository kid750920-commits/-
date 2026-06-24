module.exports = function handler(req, res){
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ''
  };
  res.status(200).send(`window.__ENV__ = ${JSON.stringify(env)};`);
};
