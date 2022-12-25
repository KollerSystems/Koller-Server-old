import express from 'express';
import mariadb from 'mariadb';

import { oauth } from './routes/oauth.js';
import { user } from './routes/user.js';
import { checkToken, toLowerKeys } from './helpers.js';

import { readFile } from 'fs/promises';
const options = JSON.parse(
  await readFile(
    new URL('./options.json', import.meta.url)
  )
);


const app = express();
const api = express.Router();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (options.ignoreParameterCase) app.use(toLowerKeys);
api.use(checkToken);

app.use('/oauth', oauth);
app.use('/api', api);
api.use('/user', user);

const pool = mariadb.createPool({
  user: options.databaseLoginData.user,
  password: options.databaseLoginData.password,
  database: 'kollegium'
});

let conn;
pool.getConnection().then(res => {
  conn = res;
  app.listen(80);
  if (conn) conn.release();
});

export { conn, options }