'use strict';

/** @type Egg.EggPlugin */
module.exports = {
  // had enabled by egg
  // static: {
  //   enable: true,
  // }
  // validate: {
  //   enable: true,
  //   package: 'egg-validate',
  // },

  // validatePlus: {
  //   enable: false,
  //   package: 'egg-validate-plus',
  // },

  routerPlus: {
    enable: true,
    package: 'egg-router-plus',
  },


  sequelize: {
    enable: false,
    package: 'egg-sequelize',
  },
};
