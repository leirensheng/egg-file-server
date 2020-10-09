'use strict';

const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const request = require('request');
const Breaker = require('circuit-fuses').breaker;
const querystring = require('querystring');
const randomstring = require('randomstring');
const crypto = require('crypto');

const GitUtil = require('./utils/git');
const TarUtil = require('./utils/tar');
const shell = require('./utils/shell').ShellUtils;
const getId = require('./utils/getId');

const NodeRSA = require('node-rsa');
const snowflake = require('node-snowflake').Snowflake;
snowflake.init({ worker_id: 1, data_center_id: 1, sequence: 0 });


function getFiles(target, result = [ ]) {
  const files = fs.readdirSync(target);
  files.forEach(name => {
    const isDir = fs.statSync(path.join(target, name)).isDirectory();
    if (isDir) {
      getFiles(path.join(target, name), result);
    } else {
      result.push(`${path.join(target, name)}`);
    }
  });
  return result;
}

async function removeDir(url) {
  return await fsExtra.remove(url);

}

module.exports = {
  getId,
  getFiles,
  removeDir,

  // list中的field字段按照arr的顺序排
  sortList(list, arr, field) {
    const res = [];
    for (const curField of arr) {
      const row = list.find(one => one[field] === curField);
      if (row) {
        res.push(row);
      }
    }
    return res;
  },

  deleteUndefined(obj) {
    return Object.keys(obj).reduce((prev, cur) => {
      if (obj[cur] !== undefined) {
        prev[cur] = obj[cur];
      }
      return prev;
    }, {});
  },

  deleteKeys(obj, keys) {
    const newObj = { ...obj };
    keys.forEach(key => {
      delete newObj[key];
    });
    return newObj;
  },

  changeKey(obj, oldKey, newKey) {
    obj[newKey] = obj[oldKey];
    delete obj[oldKey];
  },
  /**
   * request +熔断器
   * @param {String} verb 动词
   * @param {String} url 链接
   * @param {Object} options 选项
   * @return {Promise<void>}
   *
   * 使用demo:
   * ##### GET请求 ########
   *1.基本使用
   * const options={ timeout: 1500, json: true }
   * const response = await this.ctx.helper.runCircuitVerb('GET', url, options);
   *
   * 2.带查询参数:
   * options.qs={},     eg: http://xxxx?name=123 ==> options.qs={name:'123'}
   * const options={ timeout: 1500, json: true, qs: { name: '123' } }
   *
   * ##### POST请求 ########
   *1. 基本使用
   *
   */
  async runCircuitVerb(verb = 'GET', url, options) {
    let command;
    switch ((verb + '').toUpperCase()) {
      case 'GET':
        command = request.get;
        break;
      case 'POST':
        command = request.post;
        break;
      case 'PUT':
        command = request.put;
        break;
      case 'DELETE':
        command = request.delete;
        break;
      case 'HEAD':
        command = request.head;
        break;
      case 'PATCH':
        command = request.patch;
        break;
      case 'OPTIONS':
        command = request.options;
        break;
      default:
        command = request.get;
    }
    const breakOptions = {
      breaker: {
        timeout: options.timeout,
      },
    };
    const breaker = new Breaker(command, breakOptions);
    try {
      console.log(
        `外部请求[${verb}]url:${url},options:${JSON.stringify(options)}`
      );
      const res = await breaker.runCommand(url, options);
      if (res.statusCode >= 200 && res.statusCode < 300) return res.body;
      this.ctx.throw(res.statusCode || 500, res.body);
    } catch (err) {
      // 有关降级的策略 err.message = "CircuitBreaker Open"
      /* If the circuit is open the command is not run,
       * and an error with message "CircuitBreaker Open" is returned.
       * In this case, you can switch on the error and have a fallback technique
       */
      console.error(`${verb}:${url} ${err.message}`);
      this.logger.error(`${verb}:${url} ${err.message}`);
      this.ctx.throw(err.status || 500, err.message);
    }
  },

  /**
   * 发送http get 请求
   * @param {String} url url
   * @param {Object} qs 查询参数对象
   * @param {Object} options 选项
   * @return {Promise<*>} response
   */
  async requestGet(url, qs, options = { timeout: 30000, json: true }) {
    if (qs) options.qs = querystring.parse(querystring.stringify(qs));
    const response = await this.runCircuitVerb('GET', url, options);
    return response;
  },

  async requestGetWithAuth(url, qs, options = { timeout: 30000, json: true }) {
    if (qs) options.qs = querystring.parse(querystring.stringify(qs));
    /* 处理 authorization 请求头 */
    const authorization =
      this.ctx.request.headers && this.ctx.request.headers.authorization;
    if (authorization) {
      options.headers = options.headers || {};
      options.headers.authorization = authorization;
    }
    const response = await this.runCircuitVerb('GET', url, options);
    return response;

  },
  async requestGetWithCredential(url, qs, options = { timeout: 30000, json: true }) {
    if (qs) options.qs = querystring.parse(querystring.stringify(qs));
    const authorization = this.ctx.request.headers && this.ctx.request.headers.authorization;
    const credential = this.ctx.app.config.remote.serviceCredential;
    if (authorization && credential) {
      options.headers = options.headers || {};
      options.headers.authorization = authorization;
      options.headers['_Service-Credential'] = credential;
    }
    const response = await this.runCircuitVerb('GET', url, options);
    return response;

  },

  /**
   * 发送http post 请求
   * @param {String} url url
   * @param {Object} body request请求体
   * @param {Object} options 选项
   * @return {Promise<*>} response
   */
  async requestPost(url, body, options = { timeout: 150000, json: true }) {
    if (body) options.body = body;
    const response = await this.runCircuitVerb('POST', url, options);
    return response;
  },

  async requestPostWithAuth(
    url,
    body,
    options = { timeout: 150000, json: true }
  ) {
    if (body) options.body = body;
    /* 处理 authorization 请求头 */
    const authorization =
      this.ctx.request.headers && this.ctx.request.headers.authorization;
    if (authorization) {
      options.headers = options.headers || {};
      options.headers.authorization = authorization;
    }
    const response = await this.runCircuitVerb('POST', url, options);
    return response;
  },

  async requestPostWithCredential(
    url,
    body,
    options = { timeout: 150000, json: true }
  ) {
    if (body) options.body = body;
    const authorization = this.ctx.request.headers && this.ctx.request.headers.authorization;
    const credential = this.ctx.app.config.remote.serviceCredential;
    if (authorization && credential) {
      options.headers = options.headers || {};
      options.headers.authorization = authorization;
      options.headers['_Service-Credential'] = credential;
    }
    const response = await this.runCircuitVerb('POST', url, options);
    return response;
  },

  /**
   * 发送http put 请求
   * @param {String} url url
   * @param {Object} body request请求体
   * @param {Object} options 选项
   * @return {Promise<*>} response
   */
  async requestPut(url, body, options = { timeout: 30000, json: true }) {
    if (body) options.body = body;
    const response = await this.ctx.helper.runCircuitVerb('PUT', url, options);
    return response;
  },
  /**
   * 发送http put 请求
   * @param {String} url url
   * @param {Object} body request请求体
   * @param {Object} options 选项
   * @return {Promise<*>} response
   */
  async requestPutWithAuth(url, body, options = { timeout: 30000, json: true }) {
    if (body) options.body = body;
    /* 处理 authorization 请求头 */
    const authorization =
      this.ctx.request.headers && this.ctx.request.headers.authorization;
    if (authorization) {
      options.headers = options.headers || {};
      options.headers.authorization = authorization;
    }
    const response = await this.ctx.helper.runCircuitVerb('PUT', url, options);
    return response;
  },
  async requestPutWithCredential(
    url,
    body,
    options = { timeout: 30000, json: true }
  ) {
    if (body) options.body = body;
    const authorization = this.ctx.request.headers && this.ctx.request.headers.authorization;
    const credential = this.ctx.app.config.remote.serviceCredential;
    if (authorization && credential) {
      options.headers = options.headers || {};
      options.headers.authorization = authorization;
      options.headers['_Service-Credential'] = credential;
    }
    const response = await this.runCircuitVerb('PUT', url, options);
    return response;
  },
  /**
   * 发送http DELETE 请求
   * @param {String} url url
   * @param {Object} options 选项
   * @return {Promise<*>} response
   */
  async requestDelete(url, options = { timeout: 30000, json: true }) {
    const response = await this.ctx.helper.runCircuitVerb(
      'DELETE',
      url,
      options
    );
    return response;
  },
  /**
 * 发送http DELETE 请求
 * @param {String} url url
 * @param {Object} options 选项
 * @return {Promise<*>} response
 */
  async requestDeleteWithAuth(url, options = { timeout: 30000, json: true }) {
    /* 处理 authorization 请求头 */
    const authorization =
      this.ctx.request.headers && this.ctx.request.headers.authorization;
    if (authorization) {
      options.headers = options.headers || {};
      options.headers.authorization = authorization;
    }
    const response = await this.ctx.helper.runCircuitVerb(
      'DELETE',
      url,
      options
    );
    return response;
  },
  async requestDeleteWithCredential(url, options = { timeout: 30000, json: true }) {
    const authorization = this.ctx.request.headers && this.ctx.request.headers.authorization;
    const credential = this.ctx.app.config.remote.serviceCredential;
    if (authorization && credential) {
      options.headers = options.headers || {};
      options.headers.authorization = authorization;
      options.headers['_Service-Credential'] = credential;
    }
    const response = await this.ctx.helper.runCircuitVerb(
      'DELETE',
      url,
      options
    );
    return response;
  },
  /**
   * sequlize findAllAndCount 分页查询结果 格式化
   *  rows -> list,
   *  count -> total
   *  + page
   *  + size
   *  + totalPage
   * @param {object} result 分页查询结果
   * @param {number} page 页码
   * @param {number} size 每页大小
   * @return {*} 分页好的数据
   */
  pageFormat4FindAllAndCount(result, page, size) {
    result.list = result.rows;
    delete result.rows;

    result.page = page;
    result.size = size;
    result.total = result.count;
    result.totalPage = parseInt((result.count + size - 1) / size);
    delete result.count;

    return result;
  },

  isFileOrDirExists(f) {
    return fs.existsSync(f);
  },

  /**
   * 新建目录
   * @param {string} dir 目录路径
   * @param {bool} overwrite 是否覆盖（删除原有目录并重新新建）
   */
  async mkdir(dir, overwrite = false) {
    if (!fs.existsSync(path.dirname(dir))) {
      await this.mkdir(path.dirname(dir));
    }
    // 如果文件夹存在先删除文件夹
    if (fs.existsSync(dir)) {
      if (overwrite) {
        await fsExtra.remove(dir);
      } else {
        return;
      }
    }
    try {
      // 创建目录
      fs.mkdirSync(dir);
      console.log(`mkdir ${dir} finished`);
    } catch (err) {
      console.log(err);
      console.log(`mkdir ${dir} failed`);
      throw err;
    }
  },

  /**
   * 拷贝目录
   * @param {string} sourceDir 源目录
   * @param {string} targetDir 目标目录
   */
  async copyDir(sourceDir, targetDir) {
    try {
      if (!fs.existsSync(sourceDir)) {
        throw new Error(`${sourceDir}: No such file or directory`);
      }
      await fsExtra.copy(sourceDir, targetDir);
      return true;
    } catch (err) {
      console.log(err);
      console.log(`copy ${sourceDir} failed`);
      throw err;
    }
  },

  deleteFolder(path) {
    let files = [];
    if (fs.existsSync(path)) {
      files = fs.readdirSync(path);
      const base = this;
      files.forEach(function(file) {
        const curPath = path + '/' + file;
        if (fs.statSync(curPath)
          .isDirectory()) {
          // recurse
          base.deleteFolder(curPath);
        } else {
          // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  },

  /**
   * 下载文件
   * @param {string} url 下载文件网络路径
   * @param {string} fileName 保存到本地的文件路径
   */
  async requestFile(url, fileName) {
    console.log(fileName);
    await fsExtra.remove(fileName);
    const r = request(url);
    r.on('response', res => {
      res.pipe(fs.createWriteStream(fileName));
    });
    return await new Promise(fulfil => {
      r.on('end', () => {
        fulfil(1);
      });
    });
  },

  /**
   * 获取32位uuid
   */
  uuid32() {
    return randomstring.generate({
      length: 32,
      charset: 'alphanumeric',
    });
  },

  upgradeMinVersion(version) {
    // if (!this.isNormalVersion(version, 3)) {
    // 非正常版本号，直接返回undefined
    // return void 0;
    // }

    const versionArr = version.split('.');
    // 最小版本号 +1
    const len = versionArr.length;
    versionArr[len - 1] = +versionArr[len - 1] + 1;
    return versionArr.join('.');
  },

  git: GitUtil,
  tar: TarUtil,
  shell,

  /**
   * 删除数据里的时间和创建者
   * @param data
   * @return {*}
   */

  formatData(data) {
    const blackList = [
      'created_time',
      'created_by',
      'updated_by',
      'updated_time',
    ];
    blackList.map(item => delete data.dataValues[item]);
    return data;
  },

  /**
   * md5加密
   * @param str
   * @return {string}
   */

  md5(str) {
    const md5Hash = crypto.createHash('md5');
    const res = md5Hash.update(str)
      .digest('hex');
    return res;
  },
  encrypt(data) {
    const certPath = this.config.cert.filePath;
    const publicKey = fs.readFileSync(certPath + '/public.pem').toString('utf8');
    const key = new NodeRSA();
    key.setOptions({ encryptionScheme: 'pkcs1' });
    key.importKey(publicKey, 'pkcs1-public-pem');
    const res = key.encrypt(data, 'base64');
    // const res = crypto.publicEncrypt(publicKey, Buffer.from(data)).toString('base64');
    return res;
  },
  // 密码解密
  decrypt(data) {
    // 解密
    const certPath = this.config.cert.filePath;
    const privateKey = fs.readFileSync(certPath + '/private.pem').toString('utf8');
    const key = new NodeRSA();
    key.setOptions({ encryptionScheme: 'pkcs1' });
    key.importKey(privateKey, 'pkcs1-private-pem');
    const res = key.decrypt(data, 'utf8');
    return res;
  },
};
