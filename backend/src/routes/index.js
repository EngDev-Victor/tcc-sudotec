import { Router } from 'express';
import { asyncHandler as h } from '../middlewares/async-handler.js';
import { validaJwt } from '../middlewares/valida-jwt.js';
import { autorizar } from '../middlewares/autorizar.js';
import { authController } from '../controllers/auth-controller.js';
import { usuarioController } from '../controllers/usuario-controller.js';
import { anoLetivoController } from '../controllers/ano-letivo-controller.js';
import {
  alunoController,
  professorController,
  disciplinaController,
  turmaController,
  alocacaoController,
} from '../controllers/entidades.js';
import { matriculaController } from '../controllers/matricula-controller.js';



const router = Router();

function crud(caminho, c) {
  router.get(caminho, h(c.listar));
  router.get(`${caminho}/:id`, h(c.buscarPorId));
  router.post(caminho, h(c.criar));
  router.put(`${caminho}/:id`, h(c.atualizar));
  router.delete(`${caminho}/:id`, h(c.remover));
}

// Pública
router.post('/auth/login', h(authController.login));

// A partir daqui, exige token válido
router.use(validaJwt);
router.get('/auth/me', h(authController.me));

// A partir daqui, apenas GESTOR (por enquanto o único módulo implementado)
router.use(autorizar('GESTOR'));

router.get('/usuarios', h(usuarioController.listar));
router.post('/usuarios', h(usuarioController.criar));
router.patch('/usuarios/:id/ativo', h(usuarioController.definirAtivo));

crud('/alunos', alunoController);
crud('/professores', professorController);
crud('/disciplinas', disciplinaController);

router.get('/anos-letivos', h(anoLetivoController.listar));
router.get('/anos-letivos/:id', h(anoLetivoController.buscarPorId));
router.post('/anos-letivos', h(anoLetivoController.criar));
router.put('/anos-letivos/:id', h(anoLetivoController.atualizar));
router.delete('/anos-letivos/:id', h(anoLetivoController.remover));
router.patch('/anos-letivos/:id/ativar', h(anoLetivoController.ativar));

crud('/turmas', turmaController);
crud('/alocacoes', alocacaoController);

router.get('/matriculas', h(matriculaController.listar));
router.post('/matriculas', h(matriculaController.criar));
router.post('/matriculas/:id/transferir', h(matriculaController.transferir));
router.patch('/matriculas/:id/cancelar', h(matriculaController.cancelar));

export default router;