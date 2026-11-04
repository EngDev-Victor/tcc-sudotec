import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { tratarErros } from './middlewares/tratar-erros.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definido no .env');
}

// Origens liberadas para o navegador. Padrão: front-end do Vite em desenvolvimento.
// Para mais de uma, separe por vírgula no .env: CORS_ORIGIN=http://localhost:5173,https://skolla.app
const origensPermitidas = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origem) => origem.trim())
  .filter(Boolean);

const app = express();

app.use(
  cors({
    origin: origensPermitidas,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json());

app.get('/', (req, res) => {
  return res.json({ message: 'API SKOLLA ativa e operacional.' });
});

app.use('/api', routes);

// Nenhuma rota respondeu: 404 em JSON (dentro de /api, o token e o papel já foram conferidos antes)
app.use((req, res) => {
  return res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

// Sempre por último
app.use(tratarErros);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor SKOLLA a rodar na porta ${PORT}`);
});