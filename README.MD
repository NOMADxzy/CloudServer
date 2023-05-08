# 云盘后端
使用express快速实现的一个简单云盘，仅供学习使用～


## Quick Start

### 一、启动本项目
```shell
# 导入mysql数据库结构
create table cloud
use cloud
source ./cloud.sql

#mysql账号密码，app.js中修改
var connection = mysql.createConnection({
  host:        'localhost',
  user:       'root',
  password:   '991030Xzy!',
  database:   'cloud'
});


#安装依赖
npm install

# 运行项目
$ node app.js # 仅开发环境
```
### 二、[启动前端](https://github.com/NOMADxzy/Cloud)

## Preview

![图片太帅、无法显示](doc/preview.png)
*音乐*
![图片太帅、无法显示](doc/preview1.png)
*图片*
![图片太帅、无法显示](doc/preview2.png)
*视频*
![图片太帅、无法显示](doc/preview3.png)