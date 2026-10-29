export class ErroHttp extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}