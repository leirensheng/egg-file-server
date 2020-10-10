'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  const authRouter = router.namespace('/auth');
  authRouter.post('/login', controller.auth.login);
  authRouter.post('/logout', controller.auth.logout);
};
