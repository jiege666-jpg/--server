
const connection = require('./Setting')

function Sql_async(result) {
    let arr = []
    let obj = {}
    let count = 0
    let x = 0
    return new Promise((resolve, reject) => {
        result.forEach((item, index) => {
            item.forEach((item1, index1) => {
                if (item1.children) {
                    item1.children.forEach(item2 => {
                        item2.children = item2.children ? item2.children : []
                        if (item2.children) {
                            item2.children.forEach(item3 => {
                                const sql = `SELECT ps_name,ps_id,ps_api_path FROM permission WHERE ps_pid=${item3.ps_id} AND ps_level=3`
                                connection.query(sql, (error, result1) => {
                                    if (result === null) {
                                        reject(null)
                                    } else {
                                        item3.children = result1
                                        if (item3.children) {
                                            arr.push(item1)

                                        }
                                        if (index === result.length - 1) {
                                            arr = arr.reduce((item, next) => {
                                                obj[next.role_name] ? '' : obj[next.role_name] = true && item.push(next)
                                                return item
                                            }, [])
                                            resolve(arr)
                                        }
                                    }
                                })
                            })
                        }
                    })
                }

            })
        })
    })
}

module.exports = Sql_async