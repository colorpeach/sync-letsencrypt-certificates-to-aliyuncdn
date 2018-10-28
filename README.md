
# 简介

本项目用于将自己阿里云服务器上通过`let's encrypt`生成的证书同步到阿里云的CDN配置中。

可以通过自动任务执行

# 使用

1. 将本项目`fork`到自己名下，然后在服务器上`clone`项目。
2. `cd`到项目目录下，执行`npm install`
3. `cp .env.example .env`，编辑`.env`进行相关配置
4. `node ./index.js`启动，如果服务器上有pm2，可以使用`pm2 start ./index.js --name=sync-certs`

# 配置

配置项的说明请查看`.env.example`文件
