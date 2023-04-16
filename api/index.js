import express from 'express';
import knex from 'knex';
import { createWriteStream } from 'fs';
import { WebSocketServer } from 'ws';
import process from 'node:process';

import { oauth } from './routes/oauth.js';
import { users } from './routes/users.js';
import { checkToken, handleNotFound, logRequest } from './helpers.js';
import { treeifyPerms, extendMissingPermissions, checkDatabase, checkOptions } from './startup.js';
import { handleWebsocket } from './reader.js';

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
api.use('/users', users);

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
if (options.errorChecking.extendPermissions) await extendMissingPermissions();
if (options.errorChecking.database) await checkDatabase();
if (options.errorChecking.options) checkOptions();


let server = app.listen(80, async err => {
  if (err) {
    await server.close(() => console.error("Server terminated - unable to start listening due to error:"));
    console.error(err);
    process.exit(1)
  }
  console.log(`Server started listening on port ${options.api.port}!`);
});


const websocketServer = new WebSocketServer({ 'port': options.readerConnection.websocket.port, 'path': options.readerConnection.websocket.path });
websocketServer.on('connection', handleWebsocket);


server.on('close', () => {
  setTimeout(() => {
    console.log("Server terminated - timeout!")
    process.exit(1);
  }, options.api.exitTimeout);

  server.closeAllConnections();
  for (const client of websocketServer.clients) {
    client.close(1012);
  }
  if (logFileStream ?? "") logFileStream.destroy();
  knx.destroy();
});

process.on('SIGINT', async () => {
  await server.close(() => console.log("Server terminated - SIGINT!"));
  process.exit(0);
});

export { knx, options, roleMappings, permMappings, logFileStream }