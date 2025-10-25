const mysql = require("mysql2/promise");
const util = require("util");
require("dotenv").config();

//conexion con la db
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { "rejectUnauthorized": true },
});

module.exports = pool;
