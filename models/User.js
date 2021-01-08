/*
能操作users集合数据的Model
 */
// 1.引入mongoose
const connection = require('./Setting')
const md5 = require('blueimp-md5')

const sql = 'SELECT * FROM users WHERE username="admin"'

// 创建User表
// connection.create

connection.query(sql, (error,result) => {
    if (result.length===0) {
        // 先对数据加密
        const pass = md5('admin')
        // 如果不存在则初始化默认超级管理员
        connection.query(`INSERT INTO users(username,password,role_id) VALUES('admin','${pass}',1)`,(error1,result1) => {
            if (error1) {
                console.log('初始化超级管理员用户失败',error1)
                return
            }
            console.log('初始化用户: 用户名: admin 密码为: admin')
        })
    }
})

// 4. 向外暴露Model
module.exports = sql