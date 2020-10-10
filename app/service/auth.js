'use strict';
const Service = require('egg-cloud').Service;
const crypto = require('crypto');

class AuthService extends Service {
  async login({ username, password }) {
    const result = crypto.createHash('md5').update('12345').digest('hex');
    if (!(username === 'admin' && result === password)) {
      return {
        success: false,
        msg: '用户名或密码不正确',
      };
    }
    return {
      success: true,
    };
  }

}

module.exports = AuthService;
