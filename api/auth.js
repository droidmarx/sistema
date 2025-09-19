const bcrypt = require('bcrypt');
     const jwt = require('jsonwebtoken');

     module.exports = async (req, res) => {
       if (req.method !== 'POST') {
         return res.status(405).json({ error: 'Método não permitido' });
       }

       const { username, password } = req.body;

       if (!username || !password) {
         return res.status(400).json({ success: false, error: 'Usuário e senha são obrigatórios' });
       }

       const users = {
         'Gui': { hash: process.env.HASH_GUI, fullName: 'Guilherme Marques' },
         'Tayna': { hash: process.env.HASH_TAYNA, fullName: 'Tayná Ortiz' }
       };

       if (users[username]) {
         try {
           const isPasswordValid = await bcrypt.compare(password, users[username].hash);
           if (isPasswordValid) {
             const token = jwt.sign(
               { username, fullName: users[username].fullName },
               process.env.JWT_SECRET,
               { expiresIn: '1h' }
             );
             return res.status(200).json({ success: true, token });
           }
         } catch (error) {
           console.error('Erro na validação da senha:', error);
           return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
         }
       }

       return res.status(401).json({ success: false, error: 'Usuário ou senha inválidos' });
     };