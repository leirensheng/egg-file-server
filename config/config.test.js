'use strict';
module.exports = () => {
  return {
    maxTask: 5,

    sequelize: {
      delegate: 'model',
      baseDir: 'model',
      database: 'material-service',
      host: '10.50.16.3',
      port: '3306',
      password: 'serverless@2020.',
      username: 'root',
      dialect: 'mysql',
      timezone: '+08:00',
    },
    remote: {
      userApi: 'http://10.50.16.3/user-server/api/v1/account',
      comment: {
        url: 'http://10.50.16.3:8105/api/v1/comment',
        appId: 196,
        tenantId: 'dida-tenant',
      },
    },
  };
};
