'use strict';
module.exports = {
  getUserId() {
    return this.query.userId || this.request.body.userId || (this.userInfo && this.userInfo.userId);
    // this 就是 ctx 对象，在其中可以调用 ctx 上的其他方法，或访问属性
  },
};
