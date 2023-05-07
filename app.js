var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var hbs = require('hbs');
// var blogEngine = require('./blog');
var cors = require('cors');
const multer = require('multer');
// const upload = multer({dest:'./public/uploads'});
//文件上传存储
var storage = multer.diskStorage({

  destination: "./public/uploads",
  filename: function (req, file, cb) {
    var UUID='';
    for(let i in req.body){
      UUID += req.body[i];
    }
    UUID+='.'+file.originalname.split('.')[1];
    cb(null, UUID )
  }
})
var upload = multer({ storage: storage }).array('file');
//头像上传存储
var storage_avt = multer.diskStorage({

  destination: "./public/avatar",
  filename: function (req, file, cb) {
    cb(null, req.body.UUID )
  }
})
var upload_avt = multer({ storage: storage_avt }).array('file');

//sql相关
function to_sql_str(str)
{
  return ' \''+str+'\' ';
}
var mysql = require('mysql');
const { fstat } = require('fs');
const { stringify, decode } = require('querystring');
var connection = mysql.createConnection({
  host:        'localhost',
  user:       'root',
  password:   '991030Xzy!',
  database:   'cloud'
});
connection.connect();
//日期相关
function getDateStr(){
  var date = new Date();
  var y = date.getFullYear();
  var m = date.getMonth()+1;
  var d = date.getDate();
  var h = date.getHours();
  var minutes = date.getMinutes();
  var s = date.getSeconds();
  return y+"-"+m+"-"+d+" "+h+":"+minutes+":"+s;
}
//解析格式
function decodename(File_Name){
  let tail = File_Name.substr(-3);
  if(tail==='png'||tail==='gif') tail = 'jpg';
  if(tail==='avi'||tail==='wmv') tail = 'mp4';
  if(tail==='txt'||tail==='ocx') tail = 'ocx';
  let State = ['all','jpg','mp4','mp3','ocx'].indexOf(tail);
  return State;
}
//随机验证码相关
function random(max,min){
  return Math.round(Math.random()*(max-min)+min);
}
function randomStr(){  //封装，以便日后使用。
  //创建一个空字符，用于存放随机数/字母
  var strData = "";
  //生成随机字符库 (验证码四位，随机数三种，取公倍数12,所以循环4次。也可以是120次，1200次。)
  for(var i=0;i<4;i++){
    var num = random(0,9);//生成0-9的随机数
    var az = String.fromCharCode(random(97,122));//生成a-z
    var AZ = String.fromCharCode(random(65,90));//生成A-Z

    strData = strData + num + az + AZ;//将生成的字符进行字符串拼接

  }
  // 开始真正的随机(从随机字符库中随机取出四个)
  var str = "";
  for(var i=0;i<4;i++){
    str += strData[random(0,strData.length-1)]
  }
  return str;
}
//删除文件
var fs = require('fs');
function deleteFile(delPath, direct) {
  try {
    if (fs.existsSync(delPath)) {
      fs.unlinkSync(delPath);
      console.log('wtf');
    } else {
      console.log('inexistence path：', delPath);
    }
  } catch (error) {
    console.log('del error', error);
  }
}


const { Server } = require('http');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html',hbs.__express);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/public',express.static('public'));
app.use(express.static(path.join(__dirname,'public/manager')));
app.use(cors());

app.post('/upload',function(req, res) {

  upload(req, res, function (err) {
    var UUID='';
    for(let i in req.body){
      UUID += req.body[i];
    }

    let File_Name = req.files[0].originalname;
    let UID = req.headers.uid;
    let State = decodename(File_Name);
    let Size = req.files[0].size;
    let path = req.files[0].destination.substr(1)+'/'+req.files[0].filename;
    let datestr = getDateStr();
    if (err instanceof multer.MulterError) {
      return res.status(500).json(err)
    } else if (err) {
      return res.status(500).json(err)
    }
    let sql_str="INSERT INTO Real_File (UUID,File_Name,Size,State,Fcount) "+
        "VALUES ('"+UUID+"','"+File_Name+"',"+Size+","+State+",1);";
    connection.query(sql_str,function(error,results){
      if(error) throw(error);
    });
    let sql_str_="INSERT INTO pri_files (UUID,UID,Path,MTime,Collect,Del,Front_Path) "+
        "VALUES ('"+UUID+"','"+UID+"','"+path+"','"+datestr+"',0,0,"+"''"+");";
    connection.query(sql_str_,function(error,results){
      if(error) throw(error);
    });
    // console.log(req.files[0]);

    return res.status(200).send(req.files[0])
  })

});
//上传用户头像
app.post('/upload_avt',function(req, res) {
  upload_avt(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(500).json(err)
    } else if (err) {
      return res.status(500).json(err)
    }
    console.log(req.files)
    res.json(req.files[0].destination+'/'+req.files[0].filename);
  })
});

app.post('/uploads',function(req, res) {
  // console.log(req.body);
  let md5 = req.query.md5;
  let UID = req.query.UID;

  let sql_str = "select count(*) as nums from real_file where UUID = '" + md5+"';";
  connection.query(sql_str,function(error,results){
    if(error) throw(error);
    //如果服务器中存在该文件
    if(results[0].nums!==0){
      let sql1 = "select count(*) as t from pri_files where UID = '"+UID+"' and UUID = '"+md5+"';";
      connection.query(sql1,(error,results)=>{
        if(error) throw error;
        //如果用户已上传过该文件
        if(results[0].t!==0){
          res.status(204).send();
        }else{//用户没有上传过该文件
          let sql_str="UPDATE real_file SET Fcount = Fcount + 1 where UUID = '"+md5+"';";
          connection.query(sql_str,function(error,results){if(error) throw(error);});
          connection.query("select Path from pri_files where UUID ='"+md5+"' LIMIT 1;",(error,results)=>{
            if(error) throw(error);
            let path = results[0].Path;
            let datestr = getDateStr();
            let sql = "INSERT INTO pri_files (UUID,UID,Path,MTime,Collect,Del,Front_Path) "+
                "VALUES ('"+md5+"','"+UID+"','"+path+"','"+datestr+"',0,0,"+"''"+");";
            connection.query(sql,(error,results)=>{error=>console.log(error)});
            res.status(200).send();
          })
        }
      })
    }else{
      res.status(203).send()
    }
  })
});



app.post('/login_check',function(req,res,next){
  //console.log("qaq");
  var username=to_sql_str(req.body.username);
  var password=to_sql_str(req.body.password);
  // console.log(req);

  connection.query("select * from Users",function(error,results,fields){
    if(error) throw(error);
  });
  var query_sql="select UID,Password from Users where UID=" + username + "and Password=" + password;

  connection.query(query_sql,function(error,results,fields){
    if(error) throw(error);
    if(results.length==0){
      res.status(400);
      res.json();
    }
    else
    {
      res.json({result: true});
    }
  });
});

/*
app.all('*',function(req,res,next){
  req.get('token');
  
})*/

app.post('/make_a_share_file',function(req,res,next){
  var Code=req.body.Code;
  // console.log(new Buffer(link, 'base64').toString());
  if(Code==undefined) var Code = randomStr();
  var UUID=req.body.UUID;
  var UID=req.body.UID;
  let t = ''+UID+UUID;
  var link = new Buffer(t).toString('base64');
  var Share_date=getDateStr();
  var Create_date=Share_date;
  var sql_str = "select * from file_share where UUID = '"+UUID+"' and UID = '"+UID+"';";
  connection.query(sql_str,(err,results)=>{
    if(err) throw err;
    if(results[0]!=undefined){
      sql_str = "UPDATE file_share set Link = '"+link+"' where UID = '"+UID+"' AND UUID = '"+UUID+"';"
      Code = results[0].Code;
    }else{
      sql_str="INSERT INTO File_Share (Link,Code,UUID,UID,Share_date,Create_date,Save_Times)"+
          "VALUES ('"+link+"','"+Code+"','"+UUID+"','"+UID+"','"+Share_date+"','"+Create_date+"',0);";
    }
    // console.log(sql_str)
    connection.query(sql_str,function(error,results,fields){
      if(error) throw(error);
      sql_str =
          res.json({link:link,code:Code});
    })
  })

});


app.get('/get_sharefile_by_link',function(req,res,next){
  var Link=req.query.Link;
  var Code = req.query.Code;
  var sql_str="SELECT UID,UUID,Share_date,Save_Times,Code "+
      "FROM File_Share "+
      "WHERE Link ='"+Link+"' ;";
  connection.query(sql_str,function(error,results,fields){
    if(error) throw(error);
    if(results[0]==undefined){
      res.status(208).send();
    }else{
      console.log(results[0]);
      if(Code!=results[0].Code){
        res.status(403).send();
      }else{
        let UID = results[0].UID;
        let UUID = results[0].UUID;
        let Share_date = results[0].Share_date;
        let Save_Times = results[0].Save_Times;
        sql_str = "SELECT Real_File.UUID,File_Name,Size,State,Front_path,Collect,Mtime,Path "+
            "FROM Real_File,Pri_files Where Real_File.UUID='"+UUID+"' AND Real_File.UUID = Pri_Files.UUID";
        connection.query(sql_str,(err,results)=>{
          res.json({file:results[0],sharedate:Share_date,savetimes:Save_Times,from:UID});
        })
      }
    }
  });
});

app.get('/get_user_file',function(req,res,next){
  var UID = req.query.UID;
  var Del = req.query.Del;
  var PageSize = req.query.PageSize;
  var State = req.query.State
  var SkipNum = (req.query.PageNum-1)*10;
  var Collect = req.query.Collect;
  var Share = req.query.Share;

  let keyword=req.query.keyword;
  var fuzzy_sql_str = "";
  if(typeof(keyword)!="undefined"){
    fuzzy_sql_str=" AND File_Name LIKE \"%"+keyword+"%\" ";
  }
  const end_sql = " AND Real_File.UUID = Pri_Files.UUID order by Mtime DESC LIMIT "+SkipNum+","+PageSize+";";
  const head_sql = "SELECT Real_File.UUID,File_Name,Size,State,Front_path,Collect,Mtime,Path "+
      "FROM Real_File,Pri_files "+
      "WHERE UID = '"+UID+"' ";
  const del_sql = " AND Del = " +Del;
  const state_sql = " AND State="+State;
  const collect_sql = " AND Collect="+Collect;
  var sql_str;
  var sql_str_="SELECT Real_File.UUID,File_Name,Size,State,Front_path,Collect,Mtime,Path "+
      "FROM Real_File,Pri_files "+
      "WHERE UID ='"+UID+"'AND Del = " +Del+
      " AND Real_File.UUID = Pri_Files.UUID order by Mtime DESC LIMIT "+SkipNum+","+PageSize+";";
  //根据参数动态搭配sql语句
  if(Collect==1) sql_str = head_sql+collect_sql;
  else if(Del==1) sql_str = head_sql+del_sql;
  else if(State==0) sql_str = head_sql+del_sql;
  else sql_str = head_sql+state_sql+del_sql;
  sql_str = sql_str + fuzzy_sql_str +end_sql;
  //如果是请求分享的文件
  if(Share==1) sql_str = "select real_file.UUID,Share_date as Mtime,Link,Save_Times,Code,File_Name,Size,State "+
      "from file_share,real_file where UID = '"+UID+"' and real_file.UUID=file_share.UUID "+
      "order by Share_date DESC LIMIT "+SkipNum+","+PageSize+";"

  connection.query(sql_str,function(error,results,fields){
    if(error) throw(error);
    res.json(results);
  });
});

app.get('/get_numof_file',function(req,res,next){
  var UID = req.query.UID;
  var State = req.query.State;
  let Del = req.query.Del;
  let Collect = req.query.Collect;
  let keyword=req.query.keyword;
  let Share=req.query.Share;
  var fuzzy_sql_str = "";
  if(typeof(keyword)!="undefined"){
    fuzzy_sql_str=" AND File_Name LIKE \"%"+keyword+"%\" ";
  }

  const head_sql = "SELECT COUNT(*) FROM Real_File,Pri_files WHERE UID ='"+UID+"' ";
  const state_sql = " AND State="+State;
  const end_sql=" AND Real_File.UUID = Pri_Files.UUID;";
  const del_sql=" AND Del="+Del;
  const collect_sql=" AND Collect="+Collect;
  if(Collect==1) sql_str = head_sql+collect_sql;
  else if(Del==1) sql_str = head_sql+del_sql;
  else if(State==0) sql_str = head_sql+del_sql;
  else sql_str = head_sql+state_sql+del_sql;
  sql_str+=fuzzy_sql_str+end_sql;
  // console.log(sql_str);

  if(Share==1) sql_str = "select COUNT(*) "+
      "from file_share,real_file where UID = '"+UID+"' and real_file.UUID=file_share.UUID;"

  connection.query(sql_str,function(error,results,fields){
    if(error) throw(error);
    res.json(results);
  });
});
app.get('/download',(req,res)=>{
  // let UUID = req.query.UUID;
  // let sql_str = "select Path,File_Name from pri_files,real_file where pri_files.UUID = '"+"917515db74ea8d1aee6a246cfbcc0b45"+
  // "' AND pri_files.UUID = real_file.UUID LIMIT 1;"
  // connection.query(sql_str,(err,results)=>{
  //   if(err) throw err;
  //   console.log(results[0]);

  // res.download(__dirname+results[0].Path,results[0].File_Name,(err)=>{
  // 	if(err) console.log(err);
  // 	else console.log('ok');
  // });
  // res.json(results)
  // })
})

app.post('/delete_file',function(req,res,next){
  let UID=req.body.UID;
  let UUID=req.body.UUID;
  let tail=req.body.tail;
  //预处理，查看文件是否在回收站
  let before_sql = "select Del from pri_files where UUID = '"+UUID+"' AND UID = '"+UID+"';";
  connection.query(before_sql,(err,results)=>{
    if(err){
      res.status(403).send();
      throw err;
    }
    if(results[0].Del===0){//不在回收站，修改Del即可
      let sql_str="UPDATE Pri_Files SET Del = 1 "+
          "WHERE UUID ='"+UUID+"' AND UID ='"+UID+"';";
      connection.query(sql_str,function(error){
        if(error){
          res.status(403).send();
          throw(error);
        }
        res.status(200).send();
      });
    }else{//在回收站，则需彻底删除
      var sql_str = "delete from pri_files where UID = '"+UID+"' AND UUID = '"+UUID+"';";
      connection.query(sql_str,(err)=>{
        if(err) throw err;
        //查看实际文件的Fcount是否>1
        sql_str = "select Fcount from real_file where UUID = '"+UUID+"';";
        connection.query(sql_str,(err,results)=>{
          if(err) throw err;
          let fcount = results[0].Fcount;
          if(fcount==1) {
            sql_str = "delete from real_file where UUID = '"+UUID+"';";//等于1则彻底删除
            let file_path="/public/uploads/"+UUID+'.'+tail;
            file_path=path.join(__dirname,file_path);
            // console.log(file_path);
            deleteFile(file_path);
          }
          else sql_str = "UPDATE real_file set Fcount = Fcount-1 where UUID = '"+UUID+"';";//大于1则Fcount--
          console.log(sql_str)
          connection.query(sql_str,(err)=>{
            if(err){
              res.status(403).send();
              throw err;
            }
            res.status(200).send();
          })
        })
      });

    }
  })
});

app.get('/collect_file',function(req,res,next){
  // authioritation里放的是token
  let UUID=req.query.UUID;
  let UID = req.query.UID;
  sql_str = "UPDATE pri_files set Collect = 1-Collect where UID = '"+UID+"' AND UUID = '"+UUID+"'";
  connection.query(sql_str,function(error,results){
    if(error) throw(error);
    res.status(200).json();
  })
});
//修改密码
app.post('/change_pwd',(req,res,next)=>{
  let UID = req.body.UID;
  let old_pwd = req.body.old_pwd;
  let new_pwd = req.body.new_pwd;
  var sql_str = "select Password from users where UID = '"+UID+"';"
  connection.query(sql_str,(err,results)=>{
    if(err) throw err;
    if(results[0].Password!=old_pwd){
      res.status(403).send();
    }else{
      sql_str = "update users set Password = '"+new_pwd+"' where UID = '"+UID+"';";
      connection.query(sql_str,(err)=>{
        if(err) throw err;
        res.status(200).send();
      })
    }
  })
})
//获取用户头像
app.get('/get_avatar',(req,res)=>{
  let UID = req.query.UID;
  let sql_str = "select Avatar from users where UID = '"+UID+"';";
  connection.query(sql_str,(err,results)=>{
    if(err) throw err;
    res.json(results[0].Avatar);
  })
})
//设定用户头像
app.post('/set_avatar',(req,res)=>{
  let avatar = req.body.avatar;
  let UID = req.body.UID;
  let sql_str = "update users set Avatar = '"+avatar+"' where UID = '"+UID+"';";
  connection.query(sql_str,(err)=>{
    if(err) throw err;
    res.status(200).send();
  })
})

//添加链接文件
app.post('/add_link_file',(req,res,next)=>{
  let UID = req.body.UID;
  let UUID = req.body.UUID;
  let Path = req.body.Path;
  let from = req.body.from;
  let datestr = getDateStr();
  var sql_str = "select * from pri_files where UUID = '"+UUID+"' and UID = '"+UID+"';";
  connection.query(sql_str,(err,results)=>{
    if(err) throw err;
    if(results[0]!=undefined){
      res.status(405).send();
      return;
    }
    sql_str = "Update Real_File set Fcount = Fcount+1 "+
        "Where UUID = '"+UUID+"';";
    connection.query(sql_str,(err,results)=>{
      if(err) throw err;
      sql_str = "Update file_share set Save_Times = Save_Times+1 "+
          "Where UUID = '"+UUID+"' AND UID='"+from+"';"
      connection.query(sql_str,(err)=>{
        if(err) throw err;
        sql_str = "INSERT INTO pri_files (UUID,UID,Path,MTime,Collect,Del,Front_Path) "+
            "VALUES ('"+UUID+"','"+UID+"','"+Path+"','"+datestr+"',0,0,"+"''"+");";
        connection.query(sql_str,(err)=>{
          if(err) throw err;
          res.status(200).send();
        })
      })
    })
  })
})

//获取空间详情
app.get('/get_file_size',function(req,res,next){
  // let State=req.query.State;
  let UID=to_sql_str(req.query.UID);
  let state_sql_str='';
  let sql_str="SELECT State,SUM(Size) as Space FROM Real_File,Pri_files WHERE Real_File.UUID=Pri_Files.UUID AND UID="+UID+" GROUP BY State order by State;";
  // console.log(sql_str);
  connection.query(sql_str,function(error,results){
    if(error) throw(error);
    let result = [];
    result.push({Space:0});
    result.push({Space:0});
    result.push({Space:0});
    result.push({Space:0});
    result.push({Space:0});
    for(let i=0;i<5;i++){
      if(results[i]!=undefined){
        let idx = results[i].State==-1?5:results[i].State;
        result[idx-1].Space = results[i].Space;
      }
    }

    console.log(result);
    res.json(result);
  });
});
//修改文件名
app.post('/change_file_name',function(req,res,next){
  // let State=req.query.State;
  let UUID=req.body.UUID;
  let NAME=req.body.NAME;
  let sql_str="UPDATE real_file set File_Name = '"+NAME+"' where UUID = '"+UUID+"';";
  console.log(sql_str);
  connection.query(sql_str,function(error,results){
    if(error) throw(error);
    res.json(results);
  });
});
// 注册用户
app.post('/signup',function(req,res,next){
  let username=req.body.username;
  let password=req.body.password;
  //添加示例文件
  let sql_str="insert into users values ('"+username+"','','"+password+"','/public/avatar/default.jpeg');";
  connection.query(sql_str,function(error,results){
    if(error) throw(error);
    let datestr = getDateStr();
    sql_str="insert into pri_files values ('51f2b07b03f99877c037c551dd3a2f58','"+username+"','/public/uploads/51f2b07b03f99877c037c551dd3a2f58.mp4','"+datestr+"',0,0,'');"
    console.log(sql_str);
    connection.query(sql_str,(err,res)=>{
      if(err) throw err;
      res.status(200).send();
      return;
    })
  });
});
//判断用户名是否存在
app.post('/judge_uid',function(req,res,next){
  let username=req.body.username;
  let sql_str="select * from users where UID='"+username+"';";
  connection.query(sql_str,function(error,results){
    if(error) throw(error);
    if(results[0]==undefined) res.status(200).send();
    else res.status(205).send();
    return;
  });
});
//恢复文件
app.post('/recycle',(req,res)=>{
  let UID=req.body.UID;
  let UUID = req.body.UUID;
  let sql_str = "update pri_files set Del = 0 where UID = '"+UID+"' and UUID = '"+UUID+"';";
  connection.query(sql_str,function(error,results){
    if(error) throw(error);
    res.status(200).send();
  });
})
















// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(9000, () => {
  console.log('服务器已启动!!!');
})

module.exports = app;
