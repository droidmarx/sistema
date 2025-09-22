const crypto = require('crypto');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { username, passwordHash } = req.body;

  // Carrega hashes das senhas das variáveis de ambiente
  const users = {
    'Gui': { hash: process.env.HASH_GUI, fullName: 'Guilherme Marques' },
    'Tayna': { hash: process.env.HASH_TAYNA, fullName: 'Tayná Ortiz' },
    'Admin': { hash: process.env.HASH_ADMIN, fullName: 'Tester' }
  };

  // Valida usuário e hash da senha
  if (users[username] && users[username].hash === passwordHash) {
    // Gera JWT com expiração de 1 hora, incluindo o nome completo
    const token = jwt.sign(
      { username, fullName: users[username].fullName },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    return res.status(200).json({ success: true, token });
  }

  return res.status(401).json({ success: false, error: 'Usuário ou senha inválidos' });
};