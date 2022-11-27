import express from 'express';
import mariadb from 'mariadb';

import { oauth } from './routes/oauth.js';
import { user } from './routes/user.js';
import { checkToken } from './helpers.js';

import { readFile } from 'fs/promises';
const options = JSON.parse(
  await readFile(
    new URL('./options.json', import.meta.url)
  )
);


const app = express();
const api = express.Router();

api.use(express.json());
api.use(express.urlencoded({ extended: true }));

api.use(checkToken);

app.use('/oauth', oauth);
app.use('/api', api);
api.use('/user', user);

const pool = mariadb.createPool({
  user: 'root',
  password: '',
  database: 'kollegium'
});

let conn;
pool.getConnection().then(res => {
  conn = res;
  app.listen(80);
  if (conn) conn.release();
});

export { conn, options }