import { knx, logFileStream, options, permMappings, routeAccess } from '../index.js';
import { intoTimestamp, generateToken } from './misc.js';

/*
 * OAUTH case sensitivity ignorálása

function lowerCaseObjKeys(obj) {
  for (let key in obj) {
    const val = obj[key];
    delete obj[key];
    obj[key.toLowerCase()] = val;
  }
  return obj;
}
function toLowerKeys(req, res, next) {
  req.query = lowerCaseObjKeys(req.query);
  req.body = lowerCaseObjKeys(req.body);
  next();
}
*/

async function verify(authField) {
  let result = { 'UID': undefined, 'roleID': -1, 'issue': '', 'code': 0 };
  result.code = 400;
  if (authField == undefined) {
    result.issue = 'Authorization header field not present!';
    return result;
  }
  if (!authField.startsWith('Bearer')) {
    result.issue = 'Authorization isn\'t prefixed by "Bearer".';
    return result;
  }

  const bearer = authField.slice(7); // "Bearer " utáni karakterek
  result.code = 401;
  let authEntry = await knx.first('*').from('auth').where('access_token', bearer);
  if (!authEntry) {
    result.issue = 'Invalid access token!';
    return result;
  }

  result.issue = 'Access token expired.';
  if (authEntry.expired) return result; // ? // ?
  if (authEntry.issued.getTime() + (authEntry.expires * 1000) < Date.now()) {
    knx('auth').where('access_token', bearer).limit(1).update('expired', 1);
    return result;
  }

  let userEntry = await knx('user').first('UID', 'Role').where('UID', authEntry.UID);

  result.code = 0;
  result.issue = '';
  result.UID = authEntry.UID;
  result.roleID = userEntry.Role;
  return result;
}
async function checkToken(req, res, next) {
  const verRes = await verify(req.get('Authorization'));
  if (verRes.code != 0) {
    classicErrorSend(res, verRes.code, verRes.issue);
    return;
  }
  res.set('Cache-Control', 'no-store');
  res.locals.UID = verRes.UID;
  res.locals.roleID = verRes.roleID;
  next();
}

function handleNotFound(req, res, next) {
  if (!res.headersSent)
    res.header('Content-Type', 'application/json').status(404).send({ 'error': 'Page not found!' });
  next();
}

function logRequest(req, res, next = () => { }) {
  if (
    (res.statusCode >= 200 && res.statusCode < 300) ||
    (res.statusCode == 404 && options.logging.logNotFound) ||
    (options.logging.logUnsuccessful)
  ) {
    let logLine = '[' + intoTimestamp(res.locals.incomingTime) + (options.logging.logResponseTime ? ` + ${Date.now()-res.locals.incomingTime}ms` : '') + ']' + ` <${res.locals.UID == undefined ? 'no logon' : res.locals.UID}>` + (options.logging.logIP ? ' {' + req.ip + '}' : '') + ` ${req.method} ${req.originalUrl} (${res.statusCode})`;
    if (options.logging.logConsole) console.log(logLine);
    if (options.logging.logFile != '') logFileStream.write(logLine + '\n');
  }
  next();
}


async function generateUniqueToken() {
  // tokenek véletlenszerű újragenerálása amíg nem egyedi
  let accessToken, refreshToken;
  let tokenEntry = undefined;
  do {
    accessToken = generateToken(options.authorization.tokenLength);
    tokenEntry = await knx('auth').first('*').where('access_token', accessToken);
  } while (tokenEntry);
  do {
    refreshToken = generateToken(options.authorization.tokenLength);
    tokenEntry = await knx('auth').first('*').where('refresh_token', refreshToken);
  } while (tokenEntry);

  return { 'access_token': accessToken, 'refresh_token': refreshToken };
}

function classicErrorSend(res, code, text) {
  // console.log(res);
  res.header('Content-Type', 'application/json').status(code).send({ 'error': text }).end();
  logRequest(res.req, res);
}

function filterByPermission(data, table, role, permType = 'read') { // perftest: adat törlése vs új obj létrehozása
  let permittedData = {};
  for (let key in data)
    if (permMappings[table][key][role][permType]) permittedData[key] = data[key];
  return permittedData;
}
function getPermittedFields(table, role, explicit = false, permType = 'read') {
  let allowedFields = [];
  for (let field in permMappings[table]) {
    if (permMappings[table][field][role][permType]) allowedFields.push(explicit ? (table + '.' + field) : field);
  }
  return allowedFields;
}

function handleRouteAccess(req, res, next) {
  let url = (new URL(req.originalUrl, `http://${req.headers.host}`)).pathname;
  url = url.endsWith('/') ? url.slice(0, -1) : url;
  url = url.replace(/(?<=\/)-?\d+(?=\/)?/, ':id');

  if (!(url in routeAccess)) return next();

  if (routeAccess[url][res.locals.roleID].accessible) next();
  else if (routeAccess[url][res.locals.roleID].hide) classicErrorSend(res, 404, 'Page not found!');
  else classicErrorSend(res, 403, 'Not permitted!');
}



// TODO: revision - wasteful?
function addCoalesces(query, coalesces) {
  for (let coalesce of coalesces) {
    query.select(knx.raw(coalesce));
  }
}
function selectCoalesce(tableArr) {
  let fields = {};
  for (let i = 0; i < tableArr.length; i++) {
    // if ((i+1) == tableArr.length) break;
    for (let j = i+1; j < tableArr.length; j++) {
      const dupes = tableArr[i].fields.filter(v => tableArr[j].fields.includes(v));
      for (let dupe of dupes) {
        if (!(dupe in fields)) fields[dupe] = [];

        if (!fields[dupe].includes(tableArr[i].table)) fields[dupe].push(tableArr[i].table);
        if (!fields[dupe].includes(tableArr[j].table)) fields[dupe].push(tableArr[j].table);
      }
    }
  }

  let coalesces = [];
  for (let field in fields) {
    let str = 'COALESCE(';
    for (let table of fields[field]) {
      str += table + '.' + field + ', ';
    }
    str = str.replace(/,\s$/, '') + `) AS ${field}`;
    coalesces.push(str);
  }

  let selects = [];
  for (let tableObj of tableArr) {
    for (let field of tableObj.fields) {
      if (!(field in fields)) selects.push(tableObj.table + '.' + field);
    }
  }

  return { selects, coalesces };
}

/*
async function boilerplateRequestID (req, res, next, suboptions) {
  const data = await knx(suboptions.table).first('*').where(suboptions.searchID, suboptions.IDval);
  if (data == undefined) return classicErrorSend(res, 404, suboptions.errormsg);

  const filteredData = filterByPermission(data, suboptions.table, roleMappings.byID[res.locals.roleID]);

  if (isEmptyObject(filteredData)) return classicErrorSend(res, 403, 'Forbidden!');
  res.header('Content-Type', 'application/json').status(200).send(filteredData).end();

  next();
}

async function boilerplateRequestBatch (req, res, next, suboptions) {
  let data = knx(suboptions.table).select(getPermittedFields(suboptions.table, roleMappings.byID[res.locals.roleID]));
  data = setupBatchRequest(data, req.query);

  for (filter of suboptions.filters) {
    if (req.query[filter.name]?.match(filter.regexp))
      data.where(filter.field, req.query[filter.name]);
  }
  data = await data;

  res.header('Content-Type', 'application/json').status(200).send(data).end();

  next();
}

function attachBoilerplate(method, path, callback, suboptions) {
  method(path, async (req, res, next) => {
    await callback(req, res, next, suboptions);
  });
}*/

export { checkToken, handleNotFound, logRequest, generateUniqueToken, classicErrorSend, filterByPermission, getPermittedFields, handleRouteAccess, addCoalesces, selectCoalesce/* , boilerplateRequestBatch, boilerplateRequestID, attachBoilerplate*/ };