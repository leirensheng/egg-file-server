'use strict';
const Service = require('egg-cloud').Service;
const path = require('path');
const fs = require('fs');
const getId = require('../extend/utils/getId');
// const sendToWormhole = require('stream-wormhole');
const WebHDFS = require('webhdfs');
const hdfs = WebHDFS.createClient({
  user: 'hdfs',
  host: '192.168.1.212',
  port: 50070,
  path: 'webhdfs/v1',
});


class WebhdfsService extends Service {

  getDownloadPath(filePath) {
    return encodeURI(this.app.config.remote.webhdfs + filePath);
  }
  async downloadFile(filePath, basePath = './download') {
    const url = this.getDownloadPath(filePath) + '?op=OPEN';

    const arr = filePath.split('.');
    const fileType = arr.slice(-1)[0];
    const name = arr[0].split('/').slice(-1)[0];
    const fileName = name + '.' + fileType;
    const tempPath = path.resolve(__dirname, '../public', basePath, fileName);

    await this.ctx.helper.requestFile(url, tempPath);
    return {
      filePath: tempPath,
      fileName,
    };
  }

  async getList(filePath) {
    const url = this.getDownloadPath(filePath) + '?op=LISTSTATUS';
    const { FileStatuses: { FileStatus } } = await this.ctx.helper.requestGet(url);
    return FileStatus.map(one => ({ filePath: filePath + '/' + one.pathSuffix, type: one.type }));
  }

  async downloadFolder(filePath, downloadPath) {
    const dirName = filePath.split('/').pop();
    const folderPath = path.resolve(downloadPath, dirName);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    const arr = await this.getList(filePath);
    await this.download(arr, folderPath);
  }

  async downloadMultiple(arr, downloadPath) {
    const folders = arr.filter(one => one.type !== 'FILE');
    const files = arr.filter(one => one.type === 'FILE');
    const folderPromises = folders.map(({ filePath }) => {
      return this.downloadFolder(filePath, downloadPath);
    });
    const filePromises = files.map(one => this.downloadFile(one.filePath, downloadPath));
    await Promise.all([ ...filePromises, ...folderPromises ]);
  }


  async uploadOne(localFileStream, pathToUpload) {
    console.log(pathToUpload);
    await new Promise((resolve, reject) => {
      const remoteFileStream = hdfs.createWriteStream(pathToUpload + '/' + encodeURI(localFileStream.filename));
      localFileStream.pipe(remoteFileStream);
      remoteFileStream.on('error', function onError(err) {
        if (err.code === 'HPE_INVALID_HEADER_TOKEN') {
          resolve();
          return;
        }
        console.log('出错', err);
        reject(err);
      });
      remoteFileStream.on('finish', function onFinish() {
        console.log('完成' + localFileStream.filename);
        resolve();
      });
    });
  }
  async upload(localFileStream, pathToUpload) {
    await this.uploadOne(localFileStream, pathToUpload);
  }

  async download(arr, downloadPath) {
    if (!downloadPath) {
      downloadPath = path.resolve(__dirname, '../public/download', getId());
    }
    console.log(downloadPath);
    if (arr.length === 1 && arr[0].type === 'FILE') {
      return await this.downloadFile(arr[0].filePath);
    }

    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath);
    }
    await this.downloadMultiple(arr, downloadPath);

    return {
      fileName: path.basename(downloadPath) + '.zip',
      filePathWithoutFileName: downloadPath,
      filePath: downloadPath + '.zip',
    };
  }
}

module.exports = WebhdfsService;
