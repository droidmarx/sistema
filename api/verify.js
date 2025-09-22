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
    // Verifica o token usando a chave secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Retorna valid: true e os dados do payload (username e fullName)
    return res.status(200).json({
      valid: true,
      username: decoded.username,
      fullName: decoded.fullName
    });
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return res.status(401).json({ valid: false, error: 'Token inválido ou expirado' });
  }
};