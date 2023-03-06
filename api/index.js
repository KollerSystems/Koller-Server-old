import express from 'express';
import knex from 'knex';
import { createWriteStream } from 'fs';

import { oauth } from './routes/oauth.js';
import { user } from './routes/user.js';
import { checkToken, toLowerKeys, logRequest } from './helpers.js';

import { readFile } from 'fs/promises';
const options = JSON.parse(
  await readFile(
    new URL('./options.json', import.meta.url)
  )
);

let logFileStream = (options.logging.logFile != "") ? createWriteStream(options.logging.logFile) : undefined;

const app = express();
const api = express.Router();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', (req, res, next) => { res.locals.incomingTime = new Date(); next() });

if (options.api.ignoreParameterCase) app.use(toLowerKeys);
api.use(checkToken);

app.use('/oauth', oauth);
app.use('/api', api);
api.use('/user', user);

app.use('/', logRequest);

const knx = knex({
  client: 'mysql',
  connection: {
    user: options.databaseLoginData.user,
    password: options.databaseLoginData.password,
    database: 'kollegium'
  }
});

const roleMappings = (await knx('role_name').select('Role', 'Table')).reduce((map, entry) => {map[entry.Role] = entry.Table; return map}, {});

app.listen(80, err => {
  if (err) console.error("Server could not start listening!"); // throw error => kapcsolatok & fájlok lezárása
  console.log(`Server started listening on port ${options.api.port}!`);
});
// knx.destroy();

export { knx, options, roleMappings, logFileStream }