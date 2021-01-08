// 通过mysql连接数据库
const mysql = require('mysql')
var connection = mysql.createPool({
    host     : 'localhost',
    user     : 'root',
    password : '964155347',
    database : 'testdb'
  });


module.exports = connection