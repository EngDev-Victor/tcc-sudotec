import { Router } from 'express';
import { asyncHandler as h } from '../middlewares/async-handler.js';
import { validaJwt } from '../middlewares/valida-jwt.js';
import { autorizar } from '../middlewares/autorizar.js';
import { validar } from '../middlewares/validar.js';
import { esquemas } from '../validations/esquemas.js';
import { authController } from '../controllers/auth-controller.js';
import { usuarioController } from '../controllers/usuario-controller.js';
import { anoLetivoController } from '../controllers/ano-letivo-controller.js';
import { dashboardController } from '../controllers/dashboard-controller.js';
import { inativacaoController } from '../controllers/inativacao-controller.js';
import { limitarLogin } from '../middlewares/limitar-login.js';
import {
  alunoController,
  professorController,
  disciplinaController,
  turmaController,
  alocacaoController,
} from '../controllers/entidades.js';
import { matriculaController } from '../controllers/matricula-controller.js';

const router = Router();

function crud(caminho, c, esquema, { exclusao = true } = {}) {
  router.get(caminho, h(c.listar));
  router.get(`${caminho}/:id`, h(c.buscarPorId));
  router.post(caminho, validar(esquema.criar), h(c.criar));
  router.put(`${caminho}/:id`, validar(esquema.atualizar), h(c.atualizar));
  if (exclusao) {
    router.delete(`${caminho}/:id`, h(c.remover));
  }
}

// Alunos e professores nunca são apagados: o histórico fica e eles são inativados
function inativavel(caminho, rotulo, c, esquema, tratarAtivo) {
  crud(caminho, c, esquema, { exclusao: false });
  router.patch(`${caminho}/:id/ativo`, validar(esquemas.ativo), h(tratarAtivo));
  router.delete(`${caminho}/:id`, (req, res) => {
    res
      .status(405)
      .set('Allow', 'GET, POST, PUT, PATCH')
      .json({
        error: `${rotulo} não podem ser excluídos. Para desativar, use PATCH ${caminho}/:id/ativo com { "ativo": false }.`,
      });
  });
}

// Pública
router.post('/auth/login', limitarLogin, validar(esquemas.login), h(authController.login));

// A partir daqui, exige token válido
router.use(validaJwt);
router.get('/auth/me', h(authController.me));

// A partir daqui, apenas GESTOR
router.use(autorizar('GESTOR'));

router.get('/dashboard/gestor', h(dashboardController.gestor));

router.get('/usuarios', h(usuarioController.listar));
router.post('/usuarios', validar(esquemas.usuario.criar), h(usuarioController.criar));
router.patch('/usuarios/:id/ativo', validar(esquemas.usuario.ativo), h(usuarioController.definirAtivo));

router.get('/anos-letivos', h(anoLetivoController.listar));
router.get('/anos-letivos/:id', h(anoLetivoController.buscarPorId));
router.post('/anos-letivos', validar(esquemas.anoLetivo.criar), h(anoLetivoController.criar));
router.put('/anos-letivos/:id', validar(esquemas.anoLetivo.atualizar), h(anoLetivoController.atualizar));
router.delete('/anos-letivos/:id', h(anoLetivoController.remover));
router.patch('/anos-letivos/:id/ativar', h(anoLetivoController.ativar));

inativavel('/alunos', 'Alunos', alunoController, esquemas.aluno, inativacaoController.aluno);
inativavel('/professores', 'Professores', professorController, esquemas.professor, inativacaoController.professor);
crud('/disciplinas', disciplinaController, esquemas.disciplina);
crud('/turmas', turmaController, esquemas.turma);
crud('/alocacoes', alocacaoController, esquemas.alocacao);

router.get('/matriculas', h(matriculaController.listar));
router.post('/matriculas', validar(esquemas.matricula.criar), h(matriculaController.criar));
router.post('/matriculas/:id/transferir', validar(esquemas.matricula.transferir), h(matriculaController.transferir));
router.patch('/matriculas/:id/cancelar', h(matriculaController.cancelar));

export default router;