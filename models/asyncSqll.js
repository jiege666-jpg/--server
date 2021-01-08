const connection = require('./Setting')

function Sql_async(result, sql) {
    return new Promise((resolve, reject) => {
        connection.query(sql, (error, result1) => {
            result1 = result1.filter(item2 => {
                if (item2.length !== 0) {
                    return item2
                }
            })
            setTimeout(() => {
                resolve(result1)
            }, 1000);
        })
    })
}

module.exports = Sql_async