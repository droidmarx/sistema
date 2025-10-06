const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false, error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    
    // Verificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Token é válido
    return res.status(200).json({ 
      valid: true, 
      username: decoded.username, 
      fullName: decoded.fullName 
    });

  } catch (error) {
    return res.status(401).json({ valid: false, error: 'Token inválido' });
  }
};