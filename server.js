/*
应用的启动模块
1. 通过express启动服务器
2. 通过mongoose连接数据库
  说明: 只有当连接上数据库后才去启动服务器
3. 使用中间件
 */
const mongoose = require('mongoose')
const express = require('express')
const connection = require('./models/Setting')
const cors = require('cors')
const app = express() // 产生应用对象
const session = require('express-session')

app.use(cors())


app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");//允许所有来源访问 
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");//允许访问的方式 
  res.header("X-Powered-By",' 3.2.1')
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
});

// 设置session
app.use(session({
  secret: '12345',
  cookie: {maxAge: 1000*60*60*24 },  //设置maxAge是80000ms，即80s后session和相应的cookie失效过期
  resave: false,
  saveUninitialized: true,
}));


// 声明使用静态中间件
app.use(express.static('public'))
// 声明使用解析post请求的中间件
app.use(express.urlencoded({extended: true})) // 请求体参数是: name=tom&pwd=123
app.use(express.json()) // 请求体参数是json结构: {name: tom, pwd: 123}
// 声明使用解析cookie数据的中间件
const cookieParser = require('cookie-parser')
app.use(cookieParser())


// 声明使用路由器中间件
const indexRouter = require('./routers')
app.use('/', indexRouter)  //

const fs = require('fs')



connection.getConnection((error,connection) => {
  if (error) {
    console.log('连接数据库失败',error)
  }
  console.log('连接mysql数据库成功')
  // 只有当连接数据库后才开启服务器
  app.listen('5000', () => {
    console.log('服务器启动成功,请访问：http://localhost:5000')
  })
})




