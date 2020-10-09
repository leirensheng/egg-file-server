'use strict';

const _ = require('lodash');

module.exports = () => {
  return async function errorHandler(ctx, next) {
    try {
      ctx.logger.info(
        `[${ctx.request.method}][query=${JSON.stringify(
          ctx.query || {}
        )}][body=${JSON.stringify(ctx.request.body || {})}]`
      );
      await next();
    } catch (err) {
      // 注意：自定义的错误统一处理函数捕捉到错误后也要`app.emit('error', err, this)`框架会统一监听，并打印对应的错误日志
      // ctx.app.emit('error', err, this);

      // 自定义错误时异常返回的格式
      ctx.status = err.status || 500; // 默认是404
      let message = err.message;
      if (message && /Unauthorized/.test(err.message)) {
        message = '您离开太久，请重新登录';
      }
      let exp = err.exp;
      if (exp && /token expired/.test(err.exp)) {
        exp = '您离开太久，请重新登录';
      }
      // http://blog.csdn.net/rainbow702/article/details/50518171 this.body后会JSON.stringify()
      const _extra_info = _.mapValues(err.extra_info, value => {
        if (typeof value === 'undefined') {
          value = 'undefined'; // undefined -> 'undefined'
        }
        return value;
      });

      if ([ 401, 430 ].includes(err.status)) {
        ctx.logger.debug(`业务异常：${err.stack || err.message}`);
        ctx.body = {
          code: err.status,
          message: message || exp,
          extra_info: _extra_info || '',
          payload: null,
        };
      } else {
        // 非业务异常，通知框架
        ctx.app.emit('error', err, this); // 注意：自定义的错误统一处理函数捕捉到错误后也要`app.emit('error', err, this)`框架会统一监听，并打印对应的错误日志
        console.log('-------', err.status);
        ctx.body = {
          code: err.status || 500,
          message: err.message || exp, // 开启了debug时返回堆栈信息，方便调试
          extra_info: _extra_info || '',
          payload: null,
        };
      }
    }
  };
};
