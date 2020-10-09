'use strict';

module.exports = () => {
  return async function formatParams(ctx, next) {
    const numberTypeFields = [ 'page', 'size', 'status' ];
    numberTypeFields.forEach(key => {
      if (ctx.query[key]) ctx.query[key] = Number(ctx.query[key]);
    });

    const arr = [ 'isDownload', 'isAll', 'isCollect' ];

    arr.forEach(key => {
      if (ctx.query[key] && (ctx.query[key] === 'false' || ctx.query[key] === '0')) {
        delete ctx.query[key];
      }
    });

    await next();
  };
};
