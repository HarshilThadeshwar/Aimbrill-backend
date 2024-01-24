const Pool = require("pg").Pool;
require('dotenv').config();

const pool = new Pool({
    port: process.env.PG_PORT,
    host: process.env.PG_HOST,
    user: process.env.PG_USERNAME,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
})

pool.connect();

module.exports = pool;
