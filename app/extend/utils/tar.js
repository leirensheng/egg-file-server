'use strict';
const compressing = require('compressing');

const TarUtils = {
  async zipDir(dirToCompress, destinationFilePath) {
    await compressing.zip.compressDir(dirToCompress, destinationFilePath);
  },
};

module.exports = TarUtils;
