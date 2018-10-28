const result = require('dotenv').config();

if (result.error) {
    throw result.error;
}

const config = result.parsed;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const aliyun = require('aliyun-sdk');
const schedule = require('node-schedule');
const moment = require('moment');

const tmpPath = path.join(__dirname, '.tmp');

// 生成字符串的md5
function md5 (str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

function time () {
    return moment().format('YYYY-MM-DD HH:mm:ss:SSS');
}

function readFile (filepath) {
    return fs.readFileSync(filepath, { encoding: 'utf8' });
}

function getOldCertsMap () {
    try {
        const content = readFile(path.join(tmpPath, 'certs.json'));

        return JSON.parse(content);
    } catch (e) {
        return {};
    }
}

function getCurrentCertsMap () {
    const domainList = config.DOMAINS.split(',');

    return domainList.reduce((map, domain) => {
        const certPath = path.join(config.LETS_ENCRYPT_CERTS_PATH, domain, 'privkey.pem');

        try {
            map[domain] = md5(readFile(certPath));
        } catch (e) {}

        return map;
    }, {});
}

function checkAndUpdate () {
    console.log(time(), '开始检查并且更新...');

    const currentCertsMap = getCurrentCertsMap();
    const oldCertsMap = getOldCertsMap();
    const changedList = [];

    for (let domain in currentCertsMap) {
        if (currentCertsMap[domain] !== oldCertsMap[domain]) {
            changedList.push(domain);
        }
    }

    const cdn = new aliyun.CDN({
        accessKeyId: config.ACCESS_KEY_ID,
        secretAccessKey: config.ACCESS_KEY_SECRET,
        endpoint: 'https://cdn.aliyuncs.com',
        apiVersion: '2014-11-11'
    });

    Promise.all(
        changedList.map(domain => {
            return new Promise(resolve => {
                const dirPath = path.join(config.LETS_ENCRYPT_CERTS_PATH, domain);

                cdn.setDomainServerCertificate({
                    CertName: `${domain}-${time()}`,
                    DomainName: domain,
                    ServerCertificateStatus: 'on',
                    ServerCertificate: readFile(path.join(dirPath, 'fullchain.pem')),
                    PrivateKey: readFile(path.join(dirPath, 'privkey.pem'))
                }, (err, res) => {
                    if (err) {
                        console.error(time(), `更新域名（${domain}）错误：`, err);
                    } else {
                        console.log(time(), `成功（${domain}）更新：`, res);
                    }
                    resolve();
                });
            });
        })
    )
    .then(() => console.log(time(), '检查且更新完毕!!!'));
}

// 启动定时任务
schedule.scheduleJob(config.CRON, () => {
    console.log(time(), '执行定时任务');
    checkAndUpdate();
});

// 在首次启动时，执行一次更新
checkAndUpdate();
