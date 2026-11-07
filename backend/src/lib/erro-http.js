export class ErroHttp extends Error {
  constructor(status, message, detalhes, campos) {
    super(message);
    this.status = status;
    this.detalhes = detalhes;
    this.campos = campos;
  }
}