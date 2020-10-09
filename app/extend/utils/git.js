'use strict';

// const Git = require('nodegit');
const fse = require('fs-extra');
const shell = require('./shell').ShellUtils;
const fs = require('fs');

class GitError extends Error {
  constructor(msg) {
    super(msg);
    this.status = 430;
    this.name = 'GitError';
  }
}

class GitCMDBuilder {
  static _parseGitUrl(repoHref, name, pass) {
    if (!name) return repoHref;
    // 用户名中如果包含 @ 需要换成 40%
    const nameNormal = encodeURIComponent(name); // name.replace(/\@/g, '40%'); // encodeURIComponent('@')
    const passNormal = encodeURIComponent(pass); // pass.replace(/\@/g, '40%'); // encodeURIComponent('@')
    let lenghtHead = 'http://'.length;
    if (repoHref.startsWith('https://')) {
      lenghtHead = 'https://'.length;
    }
    return repoHref.substr(0, lenghtHead) + `${nameNormal}:${passNormal}@` + repoHref.substr(lenghtHead);
  }

  static gitClone(repoHref, repoDirectory, options) {
    const { username, password } = options;
    const url = this._parseGitUrl(repoHref, username, password);
    return `git clone ${url} ${repoDirectory}`;
  }

  static gitPull(repoDirectory, branch = 'master') {
    return `cd ${repoDirectory} && git pull --tags origin ${branch}`;
  }

  static gitInit(repoDirectory) {
    return `cd ${repoDirectory} && git init && git remote add origin ${this.repoHref} && git add . && git commit -m "feat: 由serverless自动创建" && git push -u origin feature_init:feature_init`;
  }

  static gitPush(repoDirectory, branch) {

  }
  static install(repoDirectory) {
    return `cd ${repoDirectory} && cnpm i`;
  }
  static build(repoDirectory) {
    return `cd ${repoDirectory} && npm run build`;
  }
}

/**
 * Git工具类
 */
class GitUtils {
  /**
   *
   * @param {string} repoHref 仓库http路径
   * @param {string} repoDirectory 本地仓库存放目录
   * @param {object} options 配置
   * ===
   * options:
   *   username: git仓库用户名
   *   password: git仓库用户密码
   *   logger: 日志记录方法，默认“console”，可传入 ctx.logger
   */
  constructor(repoHref, repoDirectory, options) {
    this.repoHref = repoHref;
    this.repoDirectory = repoDirectory;
    this.options = options;
    if (!this.options.logger) {
      this.logger = console;
      this.logger.info = console.log;
    } else {
      this.logger = this.options.logger;
    }
  }

  _parseGitUrl(name, pass) {
    if (!name) return this.repoHref;
    // 用户名中如果包含 @ 需要换成 40%
    const nameNormal = encodeURIComponent(name); // name.replace(/\@/g, '40%'); // encodeURIComponent('@')
    const passNormal = encodeURIComponent(pass); // pass.replace(/\@/g, '40%'); // encodeURIComponent('@')
    let lenghtHead = 'http://'.length;
    if (this.repoHref.startsWith('https://')) {
      lenghtHead = 'https://'.length;
    }
    return this.repoHref.substr(0, lenghtHead) + `${nameNormal}:${passNormal}@` + this.repoHref.substr(lenghtHead);
  }

  /**
   * 获取本地的仓库信息
   */
  async getLocalRepo() {
    // 如果目录已存在，就不用clone了，直接pull
    const { username, password } = this.options;
    const url = this._parseGitUrl(username, password);
    if (!fse.existsSync(this.repoDirectory)) {
      this.logger.info('[CLONE]本地仓库目录不存在，使用Clone命令拉取Git仓库代码.');
      // const repoRes = await Git.Clone(url, this.repoDirectory, {
      //   fetchOpts: {
      //     certificateCheck: () => {
      //       return 0;
      //     },
      //   },
      // });
      try {
        await shell.run(GitCMDBuilder.gitClone(url, this.repoDirectory, {}), './', 10 * 60 * 1000);
      } catch (err) {
        throw new GitError(err.message);
      }
      this.logger.info('[CLONE]Git仓库Clone完成');
      // return repoRes;
    }
    this.logger.info('本地仓库目录已存在，直接打开');
    // return await Git.Repository.open(this.repoDirectory);
    return true;
  }

  /**
   * Pull仓库
   */
  async pull() {
    this.logger.info('检查仓库');
    await this.getLocalRepo();
    this.logger.info('[PULL]开始拉取仓库代码');
    // await repo.fetchAll();
    await shell.run(GitCMDBuilder.gitPull(this.repoDirectory));
    this.logger.info('[PULL]拉取代码完成');
    // return repo;
    return true;
  }

  async build() {
    try {
      await shell.run(GitCMDBuilder.install(this.repoDirectory));
    } catch (e) {
      console.log(e);
    }
    await shell.run(GitCMDBuilder.build(this.repoDirectory));
  }

  async init() {
    this.logger.info('[INIT]准备初始化代码');
    await shell.run(GitCMDBuilder.gitInit(this.repoDirectory));
    this.logger.info('[INIT]初始化代码完成');
    return true;
  }

  static async verifyRepositery(url, username, password) {
    const cloneUrl = this.parseUrl(url, username, password);
    try {
      await shell.run(`git ls-remote ${cloneUrl}`);
    } catch (error) {
      if (error.message.match(RegExp(/Authentication failed/))) {
        throw new Error('仓库账号或者密码错误');
      } else {
        throw new Error('仓库信息错误或没有该仓库操作权限，请检查');
      }
    }
  }
  static parseUrl(url, username, password) {
    const gitSiteParser = /(https?)\:\/\/(.*?\/([\w-]+)(.git)?$)/;
    if (!gitSiteParser.exec(url)) {
      throw new Error('仓库信息错误或没有该仓库操作权限，请检查');
    }
    // eslint-disable-next-line no-unused-vars
    const [ all, domain, path, name ] = gitSiteParser.exec(url);
    const nameNormal = encodeURIComponent(username); // name.replace(/\@/g, '40%'); // encodeURIComponent('@')
    const passNormal = encodeURIComponent(password);
    const cloneUrl = `${domain}://${nameNormal}:${passNormal}@${path}`;
    return cloneUrl;
  }

}

module.exports = GitUtils;
