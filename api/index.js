import express from 'express';
import knex from 'knex';

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


const knx = knex({
  client: "mysql",
  connection: {
    user: options.databaseLoginData.user,
    password: options.databaseLoginData.password,
    database: 'kollegium'
  }
});

app.listen(80);
// knx.destroy();

let a = null;
export { a as conn, knx, options }