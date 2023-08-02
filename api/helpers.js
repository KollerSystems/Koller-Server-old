import { knx, logFileStream, options, permMappings, routeAccess } from './index.js';
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
  let result = { 'UID': undefined, 'roleID': -1, 'issue': "", 'code': 0 }
  result.code = 400;
  if (authField == undefined) {
    result.issue = "Authorization header field not present!";
    return result;
  }
  if (!authField.startsWith("Bearer")) {
    result.issue = "Authorization isn't prefixed by \"Bearer\".";
    return result;
  }

  const bearer = authField.slice(7); // "Bearer " utáni karakterek
  result.code = 401;
  let authEntry = await knx.first('*').from('auth').where('access_token', bearer);
  if (!authEntry) {
    result.issue = "Invalid access token!"
    return result;
  }

  result.issue = "Access token expired.";
  if (authEntry.expired[0]) return result; // ? // ?
  if (authEntry.issued.getTime() + (authEntry.expires * 1000) < Date.now()) {
    knx('auth').where('access_token', bearer).limit(1).update('expired', 1);
    return result;
  }

  let userEntry = await knx('user').first('UID', 'Role').where('UID', authEntry.UID);

  result.code = 0;
  result.issue = "";
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
  res.locals.roleID = verRes.roleID
  next();
}

function handleNotFound(req, res, next) {
  if (!res.headersSent)
    res.header('Content-Type', 'application/json').status(404).send({ 'error': "Page not found!" });
  next();
}

function logRequest(req, res, next = () => { }) {
  if (
    (res.statusCode >= 200 && res.statusCode < 300) ||
    (res.statusCode == 404 && options.logging.logNotFound) ||
    (options.logging.logUnsuccessful)
  ) {
    let logLine = '[' + intoTimestamp(res.locals.incomingTime) + (options.logging.logResponseTime ? ` + ${Date.now()-res.locals.incomingTime}ms` : '') + ']' + ` <${res.locals.UID == undefined ? "no logon" : res.locals.UID}>` + (options.logging.logIP ? " {" + req.ip + "}" : "") + ` ${req.method} ${req.originalUrl} (${res.statusCode})`;
    if (options.logging.logConsole) console.log(logLine);
    if (options.logging.logFile != "") logFileStream.write(logLine + "\n");
  }
  next();
}


async function generateUniqueToken() {
  let accessToken = generateToken(options.authorization.tokenLength);
  let refreshToken = generateToken(options.authorization.tokenLength);

  // tokenek véletlenszerű újragenerálása amíg nem egyedi
  while (true) {
    let tokenEntry = await knx('auth').first('*').where('access_token', accessToken).orWhere('refresh_token', refreshToken);
    if (!tokenEntry) break;

    if (tokenEntry['access_token'] == accessToken) accessToken = generateToken(options.authorization.tokenLength);
    if (tokenEntry['refresh_token'] == refreshToken) refreshToken = generateToken(options.authorization.tokenLength);
    if (tokenEntry['expired'] && ((tokenEntry['issued'].getTime() + options.authorization.expiry.refreshToken * 1000) < Date.now())) {
      await knx('auth').where('access_token', tokenEntry['access_token']).delete();
      return { 'access_token': accessToken, 'refresh_token': refreshToken };
    }
  }

  return { 'access_token': accessToken, 'refresh_token': refreshToken };
}

function classicErrorSend(res, code, text) {
  res.header('Content-Type', 'application/json').status(code).send({ 'error': text }).end();
  logRequest(res.req, res);
}

function filterByPermission(data, table, role, permType = "read") { // perftest: adat törlése vs új obj létrehozása
  let permittedData = {};
  for (let key in data)
    if (permMappings[table][key][role][permType]) permittedData[key] = data[key];
  return permittedData;
}
function getPermittedFields(table, role, permType = "read") {
  let allowedFields = [];
  for (let field in permMappings[table]) {
    if (permMappings[table][field][role][permType]) allowedFields.push(field);
  }
  return allowedFields;
}

function handleRouteAccess(req, res, next) {
  let url = (new URL(req.originalUrl, `http://${req.headers.host}`)).pathname;
  url = url.endsWith("/") ? url.slice(0,-1) : url;
  url = url.replace(/(?<=\/)-?\d+(?=\/)?/, ":id");

  if (!(url in routeAccess)) return next();

  if (routeAccess[url][res.locals.roleID].accessible) next();
  else if (routeAccess[url][res.locals.roleID].hide) classicErrorSend(res, 404, "Page not found!");
  else classicErrorSend(res, 403, "Not permitted!");
}

function getSelectFields(query) {
  let selectParams = query.toSQL().sql.match(/(?<=select ).+(?= from)/g);
    if (selectParams != null)
      selectParams = selectParams[0].match(/(?<=\`)[A-z]+(?=\`)/g);
    else selectParams = [];
  return selectParams;
}

function handleSortParams(urlparams, allowedFields) {
  if (!(urlparams.sort ?? "")) return [];

  let sortparams = urlparams.sort.replace(', ', ',').split(',');
  let orderparams = urlparams.order?.replace(', ', ',').split(',');

  let sort = [];
  if (!(orderparams ?? "")) {
    for (let param of sortparams) {
      let obj = {};

      obj.column = param.match(/(?<=-?|\+?)([A-z]+)(?=:?)/);
      obj.column = obj.column == null ? undefined : obj.column[0];

      obj.order = param.match(/(\+|-)(?=([A-z]+)\:?)/g);
      if (obj.order == null) {
        obj.order = param.match(/(?<=[A-z]+:)(asc|desc)/g);
        obj.order = obj.order == null ? 'asc' : obj.order[0];
      } else
        obj.order = (obj.order[0] == '+' ? 'asc' : 'desc');

      if (obj.column != undefined) sort.push(obj);
    }
  } else {
    for (let i = 0; i < sortparams.length; i++) {
      let obj = {};

      obj.column = sortparams[i].match(/(?<=-?|\+?)([A-z]+)(?=:?)/);
      obj.column = obj.column == null ? undefined : obj.column[0];

      obj.order = orderparams[i] == undefined ? 'asc' : orderparams[i];

      if (obj.column != undefined) sort.push(obj);
    }
  }

  for (let i = 0; i < sort.length; i++) {
    if (!allowedFields.includes(sort[i].column)) {
      sort.splice(i);
    }
  }

  return sort;
}

function handleFilterParams(urlparams, allowedFields) {
  let filters = [];
  const operators = {
    'lt': '<',
    'gt': '>',
    'lte': '<=',
    'gte': '>=',
    'eq': '='
  };

  if (urlparams.filter == undefined) {
    const operatorPattern = new RegExp(/(lte?|gte?|eq)(?=:.+)/g);
    const valuePattern = new RegExp(/(?<=(lte?|gte?|eq):).+/g);

    for (let allowedField of allowedFields) {
      let fieldValue = urlparams[allowedField];
      if (fieldValue == undefined) continue;

      if (fieldValue.length == undefined && typeof fieldValue == 'object') {
        const ops = Object.keys(fieldValue);
        for (let op of ops) {
          if (typeof fieldValue[op] == 'object') continue;
          if (operators[op] == undefined) continue;

          filters.push({'field': allowedField, 'value': fieldValue[op], 'operator': operators[op]});
        }
      } else {
        const isRHS = fieldValue.includes(':');
        if (typeof fieldValue != 'object' && !isRHS) {
          filters.push({'field': allowedField, 'value': fieldValue, 'operator': operators['eq']});
          continue;
        } else if (isRHS)
          fieldValue = [fieldValue];

        for (let filter of fieldValue) {
          let value = filter.match(valuePattern);
          if (value == null) continue;
          value = value[0];

          let op = filter.match(operatorPattern);
          if (op != null) op = operators[op[0]];
          filters.push({'field': allowedField, 'value': value, 'operator': (op == undefined ? operators['eq'] : op)});
        }
      }
    }
  } else {
    const fieldPattern = new RegExp(/.+(?=\[(lte?|gte?|eq)\]:|:)/g),
    operatorPattern = new RegExp(/(?<=\[)gte?|lte?|eq(?=\])/g),
    valuePattern = new RegExp(/(?<=:).+/g);
    let filterValues = urlparams.filter.replace(', ', ',').split(',');
    for (let filter of filterValues) {
      let field = filter.match(fieldPattern),
      operator = filter.match(operatorPattern),
      value = filter.match(valuePattern);

      // IDEA: ha nincs megadva value érték, lehetne arra filterelni aminek van ilyen mezője
      if (field == null || value == null) continue;
      field = field[0], value = value[0];
      if (operator == null) operator = operators['eq'];

      if (allowedFields.includes(field)) filters.push({field, operator, value});
    }
  }

  return filters;
}

function attachFilters(query, filters) {
  for (let filter of filters) {
    if (filter.value == 'null')
      query.whereNull(filter.field);
    else
      query.where(filter.field, filter.operator, filter.value);
    }
  return query;
}

function setupBatchRequest(query, urlparams) {
  const limit = (()=>{
    let l = parseInt(urlparams.limit?.match((new RegExp(`\\d{1,${options.api.maxDigits}}`, 'm'))).at(0)) || options.api.batchRequests.defaultLimit;
    return (l > options.api.batchRequests.maxLimit ? options.api.batchRequests.maxLimit : l);
  })();
  const offset = parseInt(urlparams.offset?.match((new RegExp(`\\d{1,${options.api.maxDigits}}`, 'm'))).at(0)) || 0;

  attachFilters(query, handleFilterParams(urlparams, getSelectFields(query)));

  query.offset(offset).limit(limit).orderBy(handleSortParams(urlparams, getSelectFields(query)));
  return query;
}

async function boilerplateRequestID (req, res, next, suboptions) {
  const data = await knx(suboptions.table).first('*').where(suboptions.searchID, suboptions.IDval);
  if (data == undefined) return classicErrorSend(res, 404, suboptions.errormsg);

  const filteredData = filterByPermission(data, suboptions.table, roleMappings.byID[res.locals.roleID]);

  if (isEmptyObject(filteredData)) return classicErrorSend(res, 403, "Forbidden!");
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
}

export { checkToken, handleNotFound, logRequest, generateUniqueToken, classicErrorSend, filterByPermission, getPermittedFields, handleRouteAccess,  getSelectFields, handleSortParams, handleFilterParams, attachFilters, setupBatchRequest/*, boilerplateRequestBatch, boilerplateRequestID, attachBoilerplate*/ }