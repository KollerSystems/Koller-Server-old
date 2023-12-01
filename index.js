import express from 'express';
import knex from 'knex';
import { createWriteStream } from 'fs';
import { WebSocketServer } from 'ws';
import process from 'node:process';
import EventEmitter from 'node:events';

import { oauth } from './routes/oauth.js';
import { users } from './routes/users.js';
import { crossings } from './routes/crossings.js';
import { rooms } from './routes/rooms.js';
import { timetable } from './routes/timetable.js';

import { checkToken, handleNotFound, logRequest, handleRouteAccess, classicErrorSend } from './helpers/helpers.js';
import { treeifyMaps, extendMissingPermissions } from './startup.js';
import { handleWebsocket } from './reader.js';

import { readFile } from 'fs/promises';
const options = JSON.parse(
  await readFile(
    new URL('./options.json', import.meta.url)
  )
);

let logFileStream = (options.logging.logFile != '') ? createWriteStream(options.logging.logFile, { 'flags': options.logging.overwriteLog ? 'w' : 'a' }) : undefined;

process.env.TZ = 'UTC';

const app = express();
const api = express.Router();

app.use('/', (req, res, next) => {
  res.locals.incomingTime = new Date();
  if ([ 'POST', 'PUT', 'PATCH' ].includes(req.method) && req.get('Content-Type') == undefined)
    return classicErrorSend(res, 400, 'Invalid Content-Type value or header missing!');
  next();
});

app.use(express.raw());
app.use(express.json({ 'type': 'application/json' }));
app.use((err, req, res, _next) => {
  classicErrorSend(res, 400, 'Invalid data in body!');
});
app.use(express.urlencoded({ extended: true }));


api.use(checkToken);
api.use(handleRouteAccess);

app.use('/oauth', oauth);
app.use('/api', api);
api.use('/users', users);
api.use('/crossings', crossings);
api.use('/rooms', rooms);
api.use('/timetable', timetable);

app.use('/', handleNotFound);
app.use('/', logRequest);


const knx = knex({
  client: 'mysql',
  connection: {
    host: options.databaseLoginData.host,
    port: options.databaseLoginData.port,
    user: options.databaseLoginData.user,
    password: options.databaseLoginData.password,
    database: 'kollegium'
  }
});


const roleMappings = {};
roleMappings.byID = (await knx('role_name').select('Role', 'Table')).reduce((map, entry) => { map[entry.Role] = entry.Table; return map; }, {});
roleMappings.byRole = Object.fromEntries(Object.entries(roleMappings.byID).map(([ k, v ]) => [ v, k ]));
const permMappings = treeifyMaps(await knx('permissions').select('*'), 'perms');
const routeAccess = treeifyMaps(await knx('route_access').select('*'), 'routes');

if (options.api.extendPermissions) await extendMissingPermissions();


let server = app.listen(options.api.port, async err => {
  if (err) {
    await server.close(() => console.error('Server terminated - unable to start listening due to error:'));
    console.error(err);
    process.exit(1);
  }
  console.log(`Server started listening on port ${options.api.port}!`);
});


const websocketServer = new WebSocketServer({ 'port': options.readerConnection.websocket.port, 'path': options.readerConnection.websocket.path });
websocketServer.on('connection', handleWebsocket);

const crossEvent = new EventEmitter();

server.on('close', () => {
  setTimeout(() => {
    console.log('Server terminated - timeout!');
    process.exit(1);
  }, options.api.exitTimeout);

  server.closeAllConnections();
  for (const client of websocketServer.clients) {
    client.close(1012);
  }
  if (logFileStream ?? '') logFileStream.destroy();
  knx.destroy();
});

process.on('SIGINT', async () => {
  await server.close(() => console.log('Server terminated - SIGINT!'));
  process.exit(0);
});

export { knx, options, roleMappings, permMappings, routeAccess, logFileStream, crossEvent };