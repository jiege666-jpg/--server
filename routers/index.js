/*
用来定义路由的路由器模块
 */
const express = require('express')
const md5 = require('blueimp-md5')
const svgCaptcha = require('svg-captcha')

const UserModel = require('../models/UserModel')
const CategoryModel = require('../models/CategoryModel')
const ProductModel = require('../models/ProductModel')
const RoleModel = require('../models/RoleModel')
const connection = require('../models/Setting')
const User = require('../models/User')
const async = require('async')
const url = require('url')
const jwt = require('jsonwebtoken');
const asyncSql = require('../models/asyncSqll')



// 得到路由器对象
const router = express.Router()
// console.log('router', router)

// 指定需要过滤的属性
const filter = { password: 0, __v: 0 }

// 生成token


// 获取用户信息的路由(根据cookie中的userid)
/*router.get('/user', (req, res) => {
  // 从请求的cookie得到userid
  const userid = req.cookies.userid
  // 如果不存在, 直接返回一个提示信息
  if (!userid) {
    return res.send({status: 1, msg: '请先登陆'})
  }
  // 根据userid查询对应的user
  UserModel.findOne({_id: userid}, filter)
    .then(user => {
      if (user) {
        res.send({status: 0, data: user})
      } else {
        // 通知浏览器删除userid cookie
        res.clearCookie('userid')
        res.send({status: 1, msg: '请先登陆'})
      }
    })
    .catch(error => {
      console.error('获取用户异常', error)
      res.send({status: 1, msg: '获取用户异常, 请重新尝试'})
    })
})*/


// 添加分类
router.post('/manage/category/add', (req, res) => {
  const { categoryName, parentId } = req.body
  CategoryModel.create({ name: categoryName, parentId: parentId || '0' })
    .then(category => {
      res.send({ status: 0, data: category })
    })
    .catch(error => {
      console.error('添加分类异常', error)
      res.send({ status: 1, msg: '添加分类异常, 请重新尝试' })
    })
})

// 获取分类列表
router.get('/manage/category/list', (req, res) => {
  const parentId = req.query.parentId || '0'
  CategoryModel.find({ parentId })
    .then(categorys => {
      res.send({ status: 0, data: categorys })
    })
    .catch(error => {
      console.error('获取分类列表异常', error)
      res.send({ status: 1, msg: '获取分类列表异常, 请重新尝试' })
    })
})

// 更新分类名称
router.post('/manage/category/update', (req, res) => {
  const { categoryId, categoryName } = req.body
  CategoryModel.findOneAndUpdate({ _id: categoryId }, { name: categoryName })
    .then(oldCategory => {
      res.send({ status: 0 })
    })
    .catch(error => {
      console.error('更新分类名称异常', error)
      res.send({ status: 1, msg: '更新分类名称异常, 请重新尝试' })
    })
})

// 根据分类ID获取分类
router.get('/manage/category/info', (req, res) => {
  const categoryId = req.query.categoryId
  console.log(categoryId)
  CategoryModel.findOne({ _id: categoryId })
    .then(category => {
      console.log(categoryId)
      res.send({ status: 0, data: category })
    })
    .catch(error => {
      console.error('获取分类信息异常', error)
      res.send({ status: 1, msg: '获取分类信息异常, 请重新尝试' })
    })
})


// 添加产品
router.post('/manage/product/add', (req, res) => {
  const product = req.body
  ProductModel.create(product)
    .then(product => {
      res.send({ status: 0, data: product })
    })
    .catch(error => {
      console.error('添加产品异常', error)
      res.send({ status: 1, msg: '添加产品异常, 请重新尝试' })
    })
})

// 获取产品分页列表
router.get('/manage/product/list', (req, res) => {
  const { pageNum, pageSize } = req.query
  ProductModel.find({})
    .then(products => {
      res.send({ status: 0, data: pageFilter(products, pageNum, pageSize) })
    })
    .catch(error => {
      console.error('获取商品列表异常', error)
      res.send({ status: 1, msg: '获取商品列表异常, 请重新尝试' })
    })
})

// 搜索产品列表
router.get('/manage/product/search', (req, res) => {
  const { pageNum, pageSize, searchName, productName, productDesc } = req.query
  let contition = {}
  if (productName) {
    contition = { name: new RegExp(`^.*${productName}.*$`) }
  } else if (productDesc) {
    contition = { desc: new RegExp(`^.*${productDesc}.*$`) }
  }
  ProductModel.find(contition)
    .then(products => {
      res.send({ status: 0, data: pageFilter(products, pageNum, pageSize) })
    })
    .catch(error => {
      console.error('搜索商品列表异常', error)
      res.send({ status: 1, msg: '搜索商品列表异常, 请重新尝试' })
    })
})

// 更新产品
router.post('/manage/product/update', (req, res) => {
  const product = req.body
  ProductModel.findOneAndUpdate({ _id: product._id }, product)
    .then(oldProduct => {
      res.send({ status: 0 })
    })
    .catch(error => {
      console.error('更新商品异常', error)
      res.send({ status: 1, msg: '更新商品名称异常, 请重新尝试' })
    })
})

// 更新产品状态(上架/下架)
router.post('/manage/product/updateStatus', (req, res) => {
  const { productId, status } = req.body
  console.log(productId)
  ProductModel.findOneAndUpdate({ _id: productId }, { $set: { status } })
    // ProductModel.findOne({"_id":"5ca9e5bbb49ef916541160d0"})
    .then(oldProduct => {
      console.log(oldProduct)
      res.send({ status: 0 })
    })
    .catch(error => {
      console.error('更新产品状态异常', error)
      res.send({ status: 1, msg: '更新产品状态异常, 请重新尝试' })
    })
})



/* ------------------------------------------------------------------------------------------- */


// 保存图形验证码的值
let x


// 登录
router.post('/login', (req, res) => {
  // 获取用户名，密码，图形验证码
  const { username, password } = req.body
  // 生成token
  let payload = { ...username, ...password };
  let secret = 'I_LOVE_JING';
  let token = jwt.sign(payload, secret);
  // 根据username和password查询数据库users, 如果没有, 返回提示错误的信息, 如果有, 返回登陆成功信息(包含user)
  const sql = `SELECT * FROM users WHERE username="${username}" AND password="${md5(password)}"`

  // 从请求体中获取用户输入的验证码
  const captchas = req.body.captchas.toLowerCase()

  // 从session中获取验证码
  console.log(x, captchas)

  if (x === captchas) {
    try {
      connection.query(sql, (error, user) => {
        if (user.length !== 0) { //表示登录成功
          // 生成一个cookie(userid: user._id), 并交给浏览器保存
          res.cookie('userid', user[0].user_id, { maxAge: 1000 * 60 * 60 * 24 })
          if (user[0].role_id) {
            connection.query(`SELECT * FROM roles WHERE role_id=${user[0].role_id}`, (error1, result1) => {
              user[user.length - 1].menus = result1
              user[0].password = md5(user[0].password)
              res.send({ status: 200, data: user, token })
            })
          } else {
            user[user.length - 1].menus = []
            res.send({ status: 200, data: user, token })
          }
        } else { // 登录失败
          res.send({ status: 400, message: '用户名或者密码不正确！' })
        }
      })
    } catch (error) {
      res.send({ status: 404, message: '登录异常，请重新尝试' })
    }
  } else {
    res.send({ status: 301, msg: '验证码错误' })
  }
})

// 添加用户
router.post('/manage/user/add', (req, res) => {
  // 读取请求参数数据
  let { username, password, email, phone, role_id, status, mainPic } = req.body
  let { token } = req.headers.authorization
  try {
    connection.query(`SELECT * FROM users WHERE username="${username}"`, (error, user) => {
      // 如果user有值(存在)
      if (user.length !== 0) {
        // 返回提示错误的信息
        res.send({ status: 301, message: '此用户已存在' })
      } else { // user不存在
        // 获取当前时间
        let time = Date.now()
        role_id = role_id !== undefined ? role_id : 1
        const sql = `INSERT INTO users(username,password,email,phone,role_id,create_time,status,mainPic) VALUES('${username}','${md5(password)}','${email}',${phone},${role_id},'${time}',${status},'${mainPic}')`
        // 保存
        connection.query(sql, (error, result) => {
          // 返回包含user的json数据
          connection.query(`SELECT * FROM users WHERE username="${username}"`, (error, user) => {
            res.send({ status: 0, data: user })
          })
        })
      }
    })
  } catch (error) {
    console.error('注册异常', error)
    res.send({ status: 1, msg: '添加用户异常, 请重新尝试' })
  }

})

// 更新用户
router.post('/manage/user/update', (req, res) => {
  const user = req.body
  try {
    connection.query(`SELECT * FROM users WHERE username="${user.username}"`, (error, data) => {
      const sql = `UPDATE users SET username='${user.username}',password='${user.password}',email='${user.email}',phone=${user.phone},role_id=${user.role_id},status=${user.status},mainPic='${user.mainPic}' WHERE user_id=${data[0].user_id}`
      connection.query(sql, (error, update) => {
        connection.query(`SELECT * FROM users WHERE user_id="${data[0].user_id}"`, (error, data1) => {
          // 返回数据
          res.send({ status: 200, data: data1 })
        })
      })
    })
  } catch (error) {
    console.error('更新用户异常', error)
    res.send({ status: 1, msg: '更新用户异常, 请重新尝试' })
  }
})

// 删除用户
router.post('/manage/user/delete', (req, res) => {
  const { user_id } = req.body
  connection.query(`DELETE FROM users WHERE user_id=${user_id}`, (error, data) => {
    if (!error) {
      res.send({ status: 200, msg: '删除成功！' })
    }
  })
})

//  根据id获取指定的用户
router.get('/users/:id', (req, res) => {
  const id = req.params.id
  console.log(id)
  connection.query(`SELECT *FROM users WHERE user_id=${id}`, (error, result) => {
    res.send({ status: 200, data: result })
  })
})

// 获取所有用户列表
router.get('/users', (req, res) => {
  const { pagenum, pagesize, query } = req.query
  if (query) {
    try {
      connection.query(`SELECT * FROM users WHERE username='${query}'`, (error, datas) => {
        if (error) throw error
        res.send({ status: 200, data: { users: datas, total: datas.length } })
      })
    } catch (error) {
      console.error('获取用户列表异常', error)
      res.send({ status: 1, msg: '获取用户列表异常, 请重新尝试' })
    }
  } else {
    try {
      connection.query(`SELECT * FROM users `, (error, datas) => {
        if (error) throw error
        let { start } = pageFilter(datas, pagenum, pagesize)
        connection.query(`SELECT * FROM users LIMIT ${pagesize} OFFSET ${start}`, (error, user) => {
          async.map(user, function (item, callback) {
            connection.query(`SELECT * FROM roles WHERE role_id=${item.role_id}`, (error, role) => {
              console.log(item);
              item.role_name = role[0].role_name
              callback(null, item)
            })
          }, function (err, results) {
            res.send({ status: 200, data: { users: results, total: datas.length } })
          })
        })
      })
    } catch (error) {
      console.error('获取用户列表异常', error)
      res.send({ status: 1, msg: '获取用户列表异常, 请重新尝试' })
    }
  }
})

// 根据用户的id修改角色
router.post('/users/:id/role', (req, res) => {
  const id = req.params.id
  const rId = req.body.rid
  connection.query(`UPDATE users SET role_id=${rId} WHERE user_id=${id}`, (error, result1) => {
    res.send({ status: 200, msg: '更新成功' })
  })
})

// 根据用户的id修改状态
router.post('/users/:id/state/:status', (req, res) => {
  const { id, status } = req.params
  connection.query(`UPDATE users SET status=${status} WHERE user_id=${id}`, (error, result) => {
    res.send({ status: 200, msg: '更新状态成功' })
  })
})

// 添加角色
router.post('/roles', (req, res) => {
  const { role_name, role_Desc, status } = req.body
  console.log(role_name, role_Desc)
  try {
    connection.query(`SELECT * FROM roles WHERE role_name='${role_name}'`, (error, data) => {
      if (data.length === 0) { // 角色不存在
        connection.query(`INSERT INTO roles (role_name,role_Desc,status) VALUES('${role_name}','${role_Desc}',${status})`, (error, data1) => {
          connection.query(`SELECT * FROM roles WHERE role_name='${role_name}'`, (error, data2) => {
            res.send({ status: 200, data: data2 })
          })
        })
      } else {
        res.send({ status: 404, message: '角色已存在' })
      }
    })
  } catch (error) {
    console.error('添加角色异常', error)
    res.send({ status: 404, msg: '添加角色异常, 请重新尝试' })
  }
})

// 删除角色
router.delete('/roles/:id', (req, res) => {
  let id = (req.url).match(/[0-9]/ig)
  id = id.join('') * 1
  connection.query(`DELETE FROM roles WHERE role_id=${id}`, (error, result) => {
    res.send({ status: 200, msg: '删除成功' })
  })
})


// 获取角色列表
router.get('/roles', (req, res) => {
  connection.query('SELECT * FROM roles', (error, result) => {
    res.send({ status: 200, data: result })
  })
})


// 获取角色列表的权限
// router.get('/rights/tree', (req, res) => {
//   let arr = []
//   let arr1 = []
//   async.map(arr, function (item1, callback) {
//     connection.query(`SELECT * FROM permission WHERE ps_id=${item1} AND ps_level=0`, (error, result1) => {
//       if (result1) {
//         callback(null, ...result1)
//       }
//     })
//   }, function (error, results) {
//     results = results.filter(item => {
//       if (item) {
//         return item
//       }
//     })
//     async.map(results, (item1, callback) => {
//       connection.query(`SELECT * FROM permission WHERE ps_pid=${item1.ps_id}`, (error, result) => {
//         if (result) {
//           item1.children = result
//           arr1.push(item1)
//           callback(null, arr1)
//         }
//       })
//     }, (error, result1s) => {
//       res.send({ status: 200, data: arr1 })
//     })
//   })
// })

router.get('/rights/tree', (req, res) => {
  let arr = []
  let arr1 = []
  connection.query(`SELECT * FROM permission WHERE ps_level=0`, (error, result1) => {
    if (result1) {
      result1 = result1.filter(item => {
        if (item) {
          return item
        }
      })
      async.map(result1, (item1, callback) => {
        connection.query(`SELECT * FROM permission WHERE ps_pid=${item1.ps_id}`, (error, result) => {
          if (result) {
            item1.children = result
            arr1.push(item1)
            callback(null, arr1)
          }
        })
      }, (error, result1s) => {
        res.send({ status: 200, data: arr1 })
      })
    }
  })
})

router.get('/roles/rights', (req, res) => {
  const ps_ids = req.query.ps_ids || ''
  let arr = []
  let arr2 = []
  let arr3 = []
  arr = ps_ids.split(',')
  arr2 = [...arr]
  async.map(arr, function (item1, callback) {
    connection.query(`SELECT * FROM permission WHERE ps_id=${item1} AND ps_level=0`, (error, result1) => {
      if (result1) {
        callback(null, ...result1)
      }
    })
  }, function (error, results) {
    results = results.filter(item => {
      if (item) {
        return item
      }
    })
    arr3 = [...results]
    // 获取ps_level不为零的部分
    results.forEach(item2 => {
      arr2.forEach((item3, index) => {
        if (item2.ps_id === item3 * 1) {
          arr2.splice(index, 1)
        }
      })
    })
    async.map(arr2, (item1, callback) => {
      connection.query(`SELECT * FROM permission WHERE ps_id=${item1}`, (error, result) => {
        if (result) {
          callback(null, ...result)
        }
      })
    }, (error, result1s) => {
      arr3.forEach(item => {
        item.children = []
        result1s.forEach(item1 => {
          if (item.ps_id === item1.ps_pid) {
            item.children.push(item1)
          }
        })
      })
      res.send({ status: 200, data: arr3 })
    })
  })
})


// 根据role_id获取指定角色
router.get('/roles/:id', (req, res) => {
  let id = (req.url).match(/[0-9]/ig)
  id = id.join('') * 1
  connection.query(`SELECT * FROM roles WHERE role_id=${id}`, (error, result) => {
    res.send({ status: 200, data: result })
  })
})

// 根据role_id修改指定的角色
router.post(`/roles/:id`, (req, res) => {
  let id = (req.url).match(/[0-9]/ig)
  id = id.join('') * 1
  const { role_name, role_Desc } = req.body
  connection.query(`UPDATE roles SET role_name="${role_name}",role_Desc="${role_Desc}" WHERE role_id=${id}`, (error, result) => {
    res.send({ status: 200, data: result })
  })
})

// 删除对应角色的id
router.delete('/roles/:id/rights/:rightId', (req, res) => {
  let roleId = req.params.id
  let rightId = req.params.rightId
  console.log(roleId, rightId);
  connection.query(`SELECT * FROM roles WHERE role_id=${roleId}`, (error, result) => {
    if (result) {
      if (result[0].ps_ids.indexOf(rightId) + 1 > 0) {
        // result[0].ps_ids.splice(result[0].ps_ids.indexOf(rightId),1)
        let data = result[0].ps_ids.split(',')
        let index = data.findIndex(item => item === rightId)
        if (data.splice(index, 1).length !== 0) {
          data = data.join(',')
          connection.query(`UPDATE roles SET ps_ids='${data}' WHERE role_id=${roleId}`, (error, result1) => {
            if (result1) {
              res.send({ status: 200, msg: '删除成功' })
            }
          })
        }
      }
    }

  })
})

// 更新角色(设置权限)
router.post('/manage/role/update', (req, res) => {
  const role = req.body
  let { authorization } = req.headers
  let time = Date.now()
  if (authorization) {
    try {
      connection.query(`UPDATE roles SET auth_name="${role.auth_name}",auth_time="${time}" WHERE role_id=${role.role_id}`, (error, data) => {
        connection.query(`SELECT * FROM rights WHERE role_id=${role.role_id} `, (error, data1) => {
          if (!data1[0].item.includes(role.right)) {
            let newRight = data1[0].item + ',' + role.right
            connection.query(`UPDATE rights SET item="${newRight}" WHERE role_id=${role.role_id}`, (error, data2) => {
              connection.query(`SELECT * FROM roles WHERE role_id=${role.role_id}`, (error, roles) => {
                connection.query(`SELECT * FROM rights WHERE role_id=${role.role_id}`, (error, data4) => {
                  console.log(data4)
                  roles[0].menus = data4
                  res.send({ status: 0, data: roles })
                })
              })
            })
          } else {
            res.send({ status: 0, message: '添加的权限已经存在' })
          }
        })
      })
    } catch (error) {
      console.error('更新角色异常', error)
      res.send({ status: 1, msg: '更新角色异常, 请重新尝试' })
    }
  } else {
    res.send({ status: 200, msg: '用户没有登录' })
  }

})

// 获取左侧菜单栏列表
router.get('/menus', (req, res) => {
  let { authorization } = req.headers
  // 获取左侧菜单栏
  if (authorization) {
    try {
      connection.query(`SELECT * FROM menus`, (error, result) => {
        if (result.length !== 0) {
          const itemList = Object.keys(result[0])
          let items = []
          let indexs
          let path = [[{ id: 0, Cname: '用户列表', path: 'users' }], [{ id: 1, Cname: '角色列表', path: 'roles' }, { id: '2', Cname: '权限列表', path: 'rights' }], [{ id: '3', Cname: '数据列表', path: 'goods' }, { id: '4', Cname: '数据展现', path: 'showData' }], [{ id: '5', Cname: '控制列表', path: 'controls' }]]
          itemList.forEach((item, index) => {
            if (item.includes('item')) {
              indexs = (index - 1) / 2
              items.push({ children: path[indexs], name: result[0][item] })
            }
          })
          res.send({ status: 200, data: items })
        }
      })
    } catch (error) {
      res.send({ status: 404, message: '请求出现异常' })
    }
  } else {
    res.send({ status: 404, message: '用户没有登录' })
  }
})

// 获取传感数据列表(根据日期搜索相应数据并返回)(数据列表)
router.get('/goods', (req, res) => {
  let { pagesize, pagenum, query } = req.query
  let { authorization } = req.headers
  let List = []
  console.log(pagesize, pagenum, query)
  if (authorization) {
    if (query) {
      connection.query(`SELECT * FROM data`, (error, result) => {
        result.forEach((item, index) => {
          let time = new Date(item.create_time * 1).getMonth() + 1
          if (query * 1 === time) {
            List.push(item)
          }
          if (index === result.length - 1) {
            res.send({ status: 200, data: List, total: List.length })
          }
        })
      })

    } else {
      connection.query('SELECT * FROM data', (error, result) => {
        let { start } = pageFilter(result, pagenum, pagesize)
        connection.query(`SELECT * FROM data LIMIT ${pagesize} OFFSET ${start}`, (error, goods) => {
          res.send({ status: 200, data: goods, total: result.length })
        })
      })
    }
  } else {
    res.send({ status: 404, message: '用户没有登录' })
  }

})

// 获取传感数据（数据展现）
router.get('/goods/show', (req, res) => {
  connection.query(`SELECT * FROM data`, (error, result) => {
    res.send({ status: 200, data: result })
  })
})

// 获取一次性图形验证码
router.get('/captcha', (req, res) => {
  var captcha = svgCaptcha.create({
    ignoreChars: '0o1l',
    noise: 2,
    color: true
  })
  req.session.captcha = captcha.text.toLowerCase();
  x = captcha.text.toLowerCase();
  console.log(req.session)

  res.type('svg')
  res.send(captcha.data)
})

// 修改密码
router.post('/UpdatePassword', (req, res) => {
  // 获取数据
  let { username, password, newPassword, checkPassword } = req.body
  password = md5(password)
  newPassword = md5(newPassword)
  connection.query(`SELECT * From users WHERE username="${username}" AND password="${password}"`, (error, result) => {
    if (result) {
      connection.query(`UPDATE users SET password="${newPassword}" WHERE username="${username}"`, (error, results) => {
        if (results) {
          res.send({ status: 200, msg: '修改成功' })
        }
      })
    } else {
      res.send({ status: 301, msg: '用户名或者密码错误' })
    }
  })
})

// 保存今日数据
router.post('/ToDay', (req, res) => {
  let toDay = req.body
  let highTemp, lowTemp, highHum, highCO2, count, create_time
  create_time = getTime(Math.round(new Date().getTime() / 1000))
  toDay.forEach(item => {
    switch (item.name) {
      case '今日浏览数量':
        count = item.count
        break;
      case '今日最高温度':
        highTemp = item.count
      case '今日最低温度':
        lowTemp = item.count
      case '今日最高湿度':
        highHum = item.count
      default:
        highCO2 = item.count
        break;
    }
  })
  const selectSql = `SELECT * FROM toDay WHERE create_time="${create_time}"`
  const updateSql = `UPDATE toDay SET highTemp="${highTemp}",lowTemp="${lowTemp}",highHum="${highHum}",highCO2="${highCO2}",count=${count} WHERE create_time="${create_time}"`
  const insertSql = `INSERT INTO toDay(highTemp,lowTemp,highHum,highCO2,count,create_time) VALUES("${highTemp}","${lowTemp}","${highHum}","${highCO2}",${count},"${create_time}")`
  connection.query(selectSql, (error, result) => {
    if (result.length !== 0) {
      connection.query(updateSql, (erro, result1) => {
        if (result1) {
          console.log('数据更新成功')
          res.send({ status: 200, message: '数据更新成功' })
        }
      })
    } else {
      connection.query(insertSql, (error, result2) => {
        if (result2) {
          console.log('数据添加成功')
          res.send({ status: 200, message: '数据添加成功' })
        }
      })
    }
  })
})

// 获取当月的数据
router.post('/MonthDate', (req, res) => {
  let { searchTime } = req.body
  const y = searchTime.split('-')[0]
  const m = searchTime.split('-')[1]
  let arr = []
  connection.query('SELECT * FROM today ', (error, result) => {
    if (result.length !== 0) {
      result.forEach(item => {
        let index = item.create_time.indexOf(y) === 0 ? item.create_time.indexOf(y) + 1 : item.create_time.indexOf(y)
        if (index !== -1 && item.create_time.indexOf(m)) {
          arr.push(item)
        }
      })
      console.log(arr);
      res.send({ status: 200, data: arr })
    } else {
      res.send({ status: 404, msg: '没有找到当月的数据' })
    }
  })
})

/*
得到指定数组的分页信息对象
 */
function pageFilter(arr, pageNum, pageSize) {
  // 当前是第几页
  pageNum = pageNum * 1
  // 每一页的数量
  pageSize = pageSize * 1
  // 总数量
  const total = arr.length
  // 总页数
  const pages = Math.floor((total + pageSize - 1) / pageSize)
  const start = pageSize * (pageNum - 1)
  const end = start + pageSize <= total ? start + pageSize : total
  const list = []
  for (var i = start; i < end; i++) {
    list.push(arr[i])
  }

  return {
    pageNum,
    total,
    pages,
    pageSize,
    list,
    start,
    end
  }
}

/* 
  转换为当前时间
*/
function getTime() {
  const ts = arguments[0] || 0
  let t, y, m, d
  t = ts ? new Date(ts * 1000) : new Date
  y = t.getFullYear()
  m = t.getMonth() + 1
  d = t.getDate()
  return (y < 10 ? '0' + y : y) + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d)
}


require('./file-upload')(router)


module.exports = router