const superAgent = require('superagent'); //http方面的库，用于发起请求
const cheerio = require('cheerio'); //工具库 parse response中的DOM，方便解析和操作
const request = require('request'); //主要用于请求图片
const path = require('path');


const fs = require('fs');

const config = require('./config'); //读取配置文件

var index = 0;  //图片序列
var res = 1;    //res=0,停止爬取；res=1 ，继续请求翻页接口
var page = 1;   //页数

start();        //主入口

function start() {
    var url = config.baseUrl1.replace(/KEYWORDS/g, encodeURIComponent(config.keyWords));    //首页，模拟搜索请求
    catchXHR(url, config.size, 'http');
    if (config.size > 100) {
        url = config.baseUrl2.replace(/KEYWORDS/g, encodeURIComponent(config.keyWords));    //当size > 100 时模拟请求翻页接口
        for (var i = 100; i < config.size; i += 100) {
            if (res) {
                catchXHR(url.replace('SIZE', i).replace('PAGE', page), config.size);
            } else {
                break;
            }
            page++;     //翻页
        }
    }
}

function catchXHR(url, size, type) {
    //模拟PC端请求
    superAgent.get(url).set('User-Agent', 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36').end(function (err, sres) {
        if (err) throw err;
        if (type == 'http') {   //请求首页
            var $ = cheerio.load(sres.text);
        } else {                //请求翻页接口
            var result = JSON.parse(sres.text);
            var $ = cheerio.load(result[1][1]);
        }
        if ($('div.rg_meta').length) {  //rg_meta 是google 图片搜索结果存放图片信息的隐藏块
            $('div.rg_meta').each(function () {
                if (index < size) {
                    var imgMeta = JSON.parse($(this).text());
                    download(imgMeta.ou, imgMeta.ity || 'jpg', index);  //如果无文件后缀信息, 默认 jpg（有可能造成文件无法打开）
                    index++;
                } else {
                    res = 0;
                    return 0
                }
            });
        }
    })
}

function download(url, itemType, index) {  //下载图片
    if (!fs.existsSync(config.filePath)) {                  //判断路径是否存在
        mkdirp(config.filePath);                            //如果不存在则根据配置创建对应路径
    }
    var path = config.filePath + '/' + index + '.' + itemType;
    request({uri: url, encoding: 'binary'}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            fs.writeFile(path, body, 'binary', function (err) {
                if (err) throw err;
            });
        }
    });
}

function mkdirp(filePath) {
    try {
        fs.mkdirSync(filePath, 0777)
    } catch (err) {
        if (err.code == 'ENOENT') {
            mkdirp(path.dirname(filePath));
            fs.mkdirSync(filePath, 0777)
        } else throw err
    }
}


