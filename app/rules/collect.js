'use strict';
module.exports = {
  create: {
    userId: [
      {
        required: true,
        message: '用户id不能为空',
      },
    ],
    materialId: [
      {
        required: true,
        message: '物料id不能为空',
      },
    ],
  },
  destroy: {
    userId: [
      {
        required: true,
        message: '用户id不能为空',
      },
    ],
  },
};
