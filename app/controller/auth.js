'use strict';
const Controller = require('egg-cloud').Controller;
class authController extends Controller {
  async login() {
    const ctx = this.ctx;
    const { success, msg } = await this.ctx.service.auth.login(ctx.request.body);
    if (!success) {
      ctx.body = {
        code: -1,
        msg,
      };
    } else {
      ctx.body = {
        token: Math.random() * 1200,
      };
    }
  }
  async logout() {
    const ctx = this.ctx;
  }
}
module.exports = authController;
