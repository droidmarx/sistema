const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { username, passwordHash } = req.body;

  // Carrega hashes das senhas das variáveis de ambiente
  const users = {
    'Gui': process.env.HASH_GUI,
    'Tayná': process.env.HASH_TAYNA
  };

  // Valida usuário e hash da senha
  if (users[username] && users[username] === passwordHash) {
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ success: false, error: 'Usuário ou senha inválidos' });
};
