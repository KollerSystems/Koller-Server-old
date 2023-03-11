import express from 'express';
import knex from 'knex';
import { createWriteStream } from 'fs';
import process from 'node:process';

import { oauth } from './routes/oauth.js';
import { user } from './routes/user.js';
import { checkToken, handleNotFound, logRequest, treeifyPerms, extendMissingPermissions } from './helpers.js';

import { readFile } from 'fs/promises';
const options = JSON.parse(
  await readFile(
    new URL('./options.json', import.meta.url)
  )
);

let logFileStream = (options.logging.logFile != "") ? createWriteStream(options.logging.logFile, { 'flags': options.logging.overwriteLog ? 'w' : 'a' }) : undefined;

const app = express();
const api = express.Router();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', (req, res, next) => { res.locals.incomingTime = new Date(); next() });

api.use(checkToken);

app.use('/oauth', oauth);
app.use('/api', api);
api.use('/user', user);

app.use('/', handleNotFound);
app.use('/', logRequest);

const knx = knex({
  client: 'mysql',
  connection: {
    user: options.databaseLoginData.user,
    password: options.databaseLoginData.password,
    database: 'kollegium'
  }
});

const roleMappings = (await knx('role_name').select('Role', 'Table')).reduce((map, entry) => { map[entry.Role] = entry.Table; return map }, {});
const permMappings = treeifyPerms(await knx('permissions').select('*'));
if (options.api.extendPermissions) await extendMissingPermissions(permMappings);

let server = app.listen(80, err => {
  if (err) server.close(() => console.error("Server could not start listening!"));
  console.log(`Server started listening on port ${options.api.port}!`);
});


server.on('close', () => {
  setTimeout(() => {
    console.log("Exit timed out!")
    process.exit(0);
  }, options.api.exitTimeout);

  if (logFileStream ?? "") logFileStream.destroy();
  knx.destroy();

  process.exit(1);
});

process.on('SIGINT', () => {
  server.close(() => console.log("Server terminated from console!"));
});

export { knx, options, roleMappings, logFileStream }