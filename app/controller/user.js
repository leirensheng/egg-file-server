'use strict';
const Controller = require('egg-cloud').Controller;
class userController extends Controller {
  async info() {
    const ctx = this.ctx;
    ctx.body = await this.ctx.service.user.info(ctx.request.body);
  }

}
module.exports = userController;
