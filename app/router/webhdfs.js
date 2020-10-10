'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  const webhdfsRouter = router.namespace('/webhdfs');
  webhdfsRouter.post('/download', controller.webhdfs.download);
  webhdfsRouter.post('/upload', controller.webhdfs.upload);
};
