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

if (options.api.ignoreParameterCase) app.use(toLowerKeys);
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

const roleMappings = (await knx('role_name').select('Role', 'Table')).reduce((map, entry) => {map[entry.Role] = entry.Table; return map}, {});

app.listen(80, err => {
  if (err) console.error("Server could not start listening!"); // throw error => kapcsolatok lezárása
  console.log(`Server started listening on port ${options.api.port}!`);
});
// knx.destroy();

let a = null;
export { knx, options, roleMappings }