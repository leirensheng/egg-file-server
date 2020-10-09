'use strict';

const process = require('child_process');

class ShellUtils {
  static run(cmd, cwd = './', timeout = 60000) {
    return new Promise((res, rej) => {
      const start = new Date();
      console.log('执行命令:' + cmd);
      process.exec(cmd, { cwd, timeout }, function(err, stdout, stderr) {
        const end = new Date();
        const during = Math.floor((end.getTime() - start.getTime()) / 1000);
        console.log('执行耗时 ' + during + ' 秒');
        if (err) {
          rej(err);
        } else {
          res({ stdout, stderr, during });
        }
      });
    });
  }
}

module.exports = {
  ShellUtils,
}
;
