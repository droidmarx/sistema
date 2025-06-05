const crypto = require('crypto');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { username, passwordHash } = req.body;

  // Carrega hashes das senhas das variáveis de ambiente
  const users = {
    'Guilherme': process.env.HASH_GUI,
    'Tayna': process.env.HASH_TAYNA
  };

  // Valida usuário e hash da senha
  if (users[username] && users[username] === passwordHash) {
    // Gera JWT com expiração de 1 hora
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.status(200).json({ success: true, token });
  }

  return res.status(401).json({ success: false, error: 'Usuário ou senha inválidos' });
};
