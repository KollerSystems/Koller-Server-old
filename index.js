import express from 'express';
import knex from 'knex';
import { createWriteStream, readFileSync } from 'fs';
import { createServer } from 'https';
import { WebSocketServer } from 'ws';
import process from 'node:process';
import EventEmitter from 'node:events';

import { oauth } from './routes/oauth.js';
import { users } from './routes/users.js';
import { crossings } from './routes/crossings.js';
import { rooms } from './routes/rooms.js';
import { timetable } from './routes/timetable.js';
import { institution } from './routes/insitution.js';

import { checkToken, handleNotFound, logRequest, handleRouteAccess, classicErrorSend } from './helpers/helpers.js';
import { treeifyMaps, extendMissingPermissions, mountTree } from './startup.js';
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
    return classicErrorSend(res, 'Invalid Content-Type value or header missing!');
  next();
});

app.use(express.raw());
app.use(express.json({ 'type': 'application/json' }));
app.use((err, req, res, _next) => {
  classicErrorSend(res, 'invalid_data');
});
app.use(express.urlencoded({ extended: true }));


api.use(checkToken);
api.use(handleRouteAccess);

const routeTree = {
  '/': app,
  '/oauth': oauth,
  '/api': {
    '/': api,
    '/users': users,
    '/crossings': crossings,
    '/rooms': rooms,
    '/timetable': timetable,
    '/institution': institution
  }
};

mountTree(routeTree);

app.use('/', handleNotFound);
app.use('/', logRequest);


const knx = knex({
  client: 'mysql',
  connection: {
    ...options.databaseLoginData,
    database: 'kollegium',
    typeCast: function(field, next) {
      if (field.type == 'BIT' && field.length == 1) {
        return (field.string() == '\x00' ? 0 : 1);
      }
      return next();
    }
  }
});


const roleMappings = {};
roleMappings.byID = (await knx('role_name').select('Role', 'Table')).reduce((map, entry) => { map[entry.Role] = entry.Table; return map; }, {});
roleMappings.byRole = Object.fromEntries(Object.entries(roleMappings.byID).map(([ k, v ]) => [ v, k ]));
const permMappings = treeifyMaps(await knx('permissions').select('*'), 'perms');
const routeAccess = treeifyMaps(await knx('route_access').select('*'), 'routes');
const errors = treeifyMaps(await knx('errors').select('*'), 'errors');

if (options.api.extendPermissions) await extendMissingPermissions();

const startHandler = async err => {
  if (err) {
    await servers.at(-1).close(() => console.error('Server terminated - unable to start listening due to error:'));
    console.error(err);
    process.exit(1);
  }
  console.log('Server started listening!');
};

const servers = [];

const httpsConfig = {};
for (let item of [ 'cert', 'ca', 'key' ]) {
  if (options.api.https[item + 'Path'] ?? '') httpsConfig[item] = readFileSync(options.api.https[item + 'Path']);
}
if (options.api.https.use) servers.push(createServer(httpsConfig, app).listen(options.api.https.port, startHandler));
if (!options.api.https.require) servers.push(app.listen(options.api.port, startHandler));


const websocketServer = new WebSocketServer({ 'port': options.readerConnection.websocket.port, 'path': options.readerConnection.websocket.path });
websocketServer.on('connection', handleWebsocket);

const crossEvent = new EventEmitter();

servers.forEach(server => {
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
});

process.on('SIGINT', async () => {
  let terminated = Array(servers.length).fill(false);
  for (let i = 0, server = servers[i]; i < servers.length; server = servers[++i]) {
    server?.close(() => {
      console.log('Server terminated - SIGINT!');
      terminated[i] = true;
      if (terminated.every(v => v)) process.exit(0);
    });
  }
});

export { knx, options, roleMappings, permMappings, routeAccess, errors, logFileStream, crossEvent };