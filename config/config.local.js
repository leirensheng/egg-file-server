'use strict';
module.exports = () => {
  console.log('>>>>> load config.local.js');
  return {
    maxTask: 5,

    sequelize: {
      delegate: 'model',
      baseDir: 'model',
      database: 'dida-material',
      host: '94.191.46.124',
      port: '3306',
      password: 'my-secret-ab',
      username: 'root',
      dialect: 'mysql',
      timezone: '+08:00',
    },
    remote: {
      userApi: 'http://94.191.46.124/dida-cloud/api/v1/account',
      comment: {
        url: 'http://94.191.46.124:8105/api/v1/comment',
        appId: 196,
        tenantId: 'dida-tenant',
      },
    },
  };
};
