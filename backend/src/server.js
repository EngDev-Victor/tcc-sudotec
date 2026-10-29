import 'dotenv/config';
import express from 'express';
import routes from './routes/index.js';
import { tratarErros } from './middlewares/tratar-erros.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definido no .env');
}

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  return res.json({ message: 'API SKOLLA ativa e operacional.' });
});

app.use('/api', routes);

// Sempre por último
app.use(tratarErros);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor SKOLLA a rodar na porta ${PORT}`);
});