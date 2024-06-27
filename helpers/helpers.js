import { knx, logFileStream, options, permMappings, routeAccess, errors } from '../index.js';
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


/**
 * @typedef {import('express').Request} Request express request callback típus
 * @typedef {import('express').Response} Response express response callback típus
 * @typedef {import('express').NextFunction} Next express next callback típus
 * @typedef {'read'|'write'} PermType engedély neve, típusa
 */

/**
 * Lecsekkolja az adatbázisban egy Bearer token érvényességét.
 * @param {string} authField Authorization mező értéke
 * @returns {Promise<{UID: number, roleID: number}> | string} hozzá tartozó adatok vagy hiba kódneve
 */
async function verify(authField) {
  let result = { 'UID': undefined, 'roleID': -1 };
  if (authField == undefined)
    return 'missing_auth_field';
  if (!authField.startsWith('Bearer'))
    return 'missing_bearer_prefix';

  const bearer = authField.slice(7); // "Bearer " utáni karakterek
  let authEntry = await knx.first('*').from('auth').where('access_token', bearer);
  if (!authEntry)
    return 'invalid_token';

  if (authEntry.expired) return 'token_expired';
  if (authEntry.issued.getTime() + (authEntry.expires * 1000) < Date.now()) {
    knx('auth').where('access_token', bearer).limit(1).update('expired', 1);
    return 'token_expired';
  }

  let userEntry = await knx('user').first('UID', 'Role').where('UID', authEntry.UID);

  result.UID = authEntry.UID;
  result.roleID = userEntry.Role;
  return result;
}
/**
 * Middleware. Authentikáció ellenőrzése, kezelése.
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
async function checkToken(req, res, next) {
  const verRes = await verify(req.get('Authorization'));
  if (typeof verRes == 'string') {
    return classicErrorSend(res, verRes);
  }
  res.set('Cache-Control', 'no-store');
  res.locals.UID = verRes.UID;
  res.locals.roleID = verRes.roleID;
  next();
}

/**
 * Middleware. Nem található oldalak, erőforrások kezelése.
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
function handleNotFound(req, res, next) {
  if (!res.headersSent)
    classicErrorSend(res, 'missing_resource');
  next();
}

/**
 * Middleware. Bejövő kérések loggolása a konfiguráció szerint.
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
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


/**
 * Véletlenszerűen generál access és refresh tokeneket amíg nem egyediek.
 * @returns {Promise<{access_token: string, refresh_token: string}>}
 */
async function generateUniqueToken() {
  let tokens = [];
  for (let i = 0; i < 2; i++) {
    let tokenEntry = undefined;
    do {
      tokens[i] = generateToken(options.authorization.tokenLength);
      tokenEntry = await knx('auth').first('*').where(i ? 'refresh_token' : 'access_token', tokens[i]);
    } while (tokenEntry);
  }
  return { 'access_token': tokens[0], 'refresh_token': tokens[1] };
}

/**
 * Egy általános hiba visszaküldése és loggolása.
 * @param {Response} res
 * @param {string} keyword hiba kódneve
 * @param {number} [code] hibakód
 * @param {string} [description] hiba hosszú leírása
 */
function classicErrorSend(res, keyword, code=errors[keyword].code, description=errors[keyword].description) {
  res.header('Content-Type', 'application/json').status(code).send({ 'error': keyword, 'status_code': code, 'error_description': description }).end();
  logRequest(res.req, res);
}

/**
 * Egy adatbázisból lekért adathalmazon az engedhető tulajdonságok átengedése a szűrőn.
 * @param {Object[]} data forrás adathalmaz
 * @param {string} table forrás tábla neve
 * @param {string} role lekérő szerepének(engedélycsoportjának) neve
 * @param {PermType} permType engedély szempontjából a művelet neve
 * @returns {Object[]} szűrt adathalmaz
 */
function filterByPermission(data, table, role, permType = 'read') { // perftest: adat törlése vs új obj létrehozása
  let permittedData = {};
  for (let key in data)
    if (permMappings[table][key][role][permType]) permittedData[key] = data[key];
  return permittedData;
}
/**
 * Megszerzi a lekérhető mezőneveket engedélyek szerint egy táblán.
 * @param {string} table A kérdéses tábla.
 * @param {string} role lekérő szerepének(engedélycsoportjának) neve
 * @param {boolean} explicit kell-e jelezni a tábla viszonyát a mezőnevekkel (pld. tableName.fieldName)
 * @param {PermType} permType engedély szempontjából a művelet neve
 * @returns {string[]} A lekérő szempontjából látható mezőnevek.
 */
function getPermittedFields(table, role, explicit = false, permType = 'read') {
  let allowedFields = [];
  for (let field in permMappings[table]) {
    if (permMappings[table][field][role][permType]) allowedFields.push(explicit ? (table + '.' + field) : field);
  }
  return allowedFields;
}

/**
 * Middleware. Az elérési útvonalhoz kapcsolódó engedélyek kezelése.
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
function handleRouteAccess(req, res, next) {
  let url = (new URL(req.originalUrl, `http://${req.headers.host}`)).pathname;
  url = url.endsWith('/') ? url.slice(0, -1) : url;
  url = url.replace(/(?<=\/)-?\d+(?=\/)?/, ':id');

  if (!(url in routeAccess)) return next();

  if (routeAccess[url][res.locals.roleID]?.accessible) next();
  else if (routeAccess[url][res.locals.roleID]?.hide) classicErrorSend(res, 'missing_resource');
  else classicErrorSend(res, 'missing_permissions');
}

/**
 * Rárakja egy lekérésre a megadott COALESCE kifejezéseket, a SELECT statementbe.
 * @param {import('knex').Knex.QueryBuilder} query lekérés
 * @param {string[]} coalesces COALESCE kifejezések
 */
function addCoalesces(query, coalesces) {
  for (let coalesce of coalesces) {
    query.select(knx.raw(coalesce));
  }
}
/**
 * A megadott mezők(és tábláik) alapján a duplikált(azonos típusú, név alapján) mezőket összepárosítja.
 * @param {{fields: string[], table: string}[]} tableArr táblák és mezőiket tartalmazó array
 * @returns {{selects: string[], coalesces: string[]}} A kiszűrt COALESCE-be helyezett mezők, és a különállók.
 * @todo revision - wasteful?
 */
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