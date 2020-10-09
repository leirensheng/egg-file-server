'use strict';
const Controller = require('egg-cloud').Controller;
const fs = require('fs');
const path = require('path');
const tarUtils = require('../extend/utils/tar');
class curController extends Controller {
  async upload() {
    const ctx = this.ctx;
    try {
      const stream = await ctx.getFileStream();
      console.log(stream, ctx.query.path);
      await ctx.service.webhdfs.upload(stream, ctx.query.path);
    } catch (e) {
      ctx.body = {
        code: -1,
        msg: e.message,
      };
    }
  }

  async download() {
    const ctx = this.ctx;
    const data = ctx.request.body.pathOrFile;
    const tempPath = path.resolve(__dirname, '../public', 'download');
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath);
    }

    const { fileName, filePath, filePathWithoutFileName } = await ctx.service.webhdfs.download(data);

    if (fileName.indexOf('zip') !== -1) {
      await tarUtils.zipDir(filePathWithoutFileName, filePath);
    }

    this.ctx.attachment(encodeURI(fileName));
    this.ctx.set('Content-Type', 'application/octet-stream');
    this.ctx.body = fs.createReadStream(filePath);
  }
}
module.exports = curController;
