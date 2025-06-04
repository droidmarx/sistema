const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(401).json({ valid: false, error: 'Token não fornecido' });
  }

  try {
    // Verifica o token com a chave secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.status(200).json({ valid: true, username: decoded.username });
  } catch (error) {
    return res.status(401).json({ valid: false, error: 'Token inválido ou expirado' });
  }
};
