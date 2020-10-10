'use strict';
const getId = require('../app/extend/utils/getId');

module.exports = {
  context: '',

  middleware: [
    'requestLogger',
    'compress',
    'errorHandler',
    'formatParams',
    'payload',
    'validator',
  ],
  remote: {
    webhdfs: 'http://192.168.1.212:50070/webhdfs/v1',

    comment: {
      url: 'http://10.50.16.2:8105/api/v1/comment',
      appId: 196,
      tenantId: 'dida-tenant',
    },
  },
  getUser: {
    ignore: ctx => {
      const ignoreList = [
        {
          method: 'GET',
          regexp: /materials$/,
          special: true,
        },
        {
          method: 'GET',
          regexp: /materials\/(\d)+$/,
        }, {
          method: 'GET',
          regexp: /materials\/search$/,
        }, {
          method: 'GET',
          regexp: /needs$/,
        }, {
          method: 'GET',
          regexp: /needs\/raise$/,
        }, {
          method: 'POST',
          regexp: /comments\/init$/,
        }, {
          method: 'GET',
          regexp: /comments$/,
        }, {
          method: 'GET',
          regexp: /statistics$/,
        }];
      const res = ignoreList.find(one => one.method === ctx.request.method && one.regexp.test(ctx.path));
      // 如果不是必须的接口，如果带上token也经过中间件
      if (res && res.special && ctx.request.header.authorization) {
        return false;
      }
      return !!res;
    },
  },
  authority: {
    match: ctx => {
      const list = [
        // {
        //   method: 'PUT',
        //   regexp: /needs$/,
        // }
      ];
      const res = list.find(one => one.method === ctx.request.method && one.regexp.test(ctx.path));
      return !!res;
    },
  },
  multipart: {
    mode: 'stream',
    fileSize: '2048mb', // 文件上传的大小限制
    fileExtensions: [
      '.md',
      '.txt',
      '.vue',
      '.wav',
      '.jpg',
      '.exe',
      '.xls',
      '.csv',
      '.doc',
      '.7z',
      '.apk',
      '.rar',
      '.pdf',
      '.msi',
      '.flac',
      '.ttf',
      '.woff',
      '.scss',


    ],
    // fields: 100,
  },
  requestLogger: {
    enable: true,
  },
  security: {
    csrf: {
      enable: false,
    },
  },

  // sequelize: {
  //   define: {
  //     hooks: {
  //       beforeCreate: instance => {
  //         if (!instance.id) {
  //           instance.id = getId();
  //         }
  //       },
  //     },
  //   },
  // },
};
