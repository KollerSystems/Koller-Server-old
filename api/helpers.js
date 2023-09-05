import { knx, logFileStream, options, permMappings, routeAccess } from './index.js';
import { intoTimestamp, generateToken, cmp, tryparse } from './misc.js';
import { parse } from 'node:url';

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
  if (authEntry.expired[0]) return result; // ? // ?
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

function getSelectFields(query) {
  let selectParams = query.toSQL().sql.match(/(?<=select ).+(?= from)/g);
  if (selectParams != null)
    selectParams = selectParams[0].match(/(?<=`)[A-z]+(?=`)/g);
  else selectParams = [];
  return selectParams;
}

function handleSortParams(urlparams, allowedFields) {
  if (!(urlparams.sort ?? '')) return [];

  const isCertain = field => !field.match(/\./g) && allowedFields.includes(field);

  let sortparams = urlparams.sort.replace(', ', ',').split(',');
  let orderparams = urlparams.order?.replace(', ', ',').split(',');

  let sort = [];
  if (!(orderparams ?? '')) {
    for (let param of sortparams) {
      let obj = {};

      obj.column = param.match(/(?<=-?|\+?)(([A-z]|\.)+)(?=:?)/);
      obj.column = obj.column == null ? undefined : obj.column[0];

      obj.order = param.match(/(\+|-)(?=([A-z]+):?)/g);
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
      obj.column = sortparams[i].match(/(?<=-?|\+?)(([A-z]|\.)+)(?=:?)/);
      obj.column = obj.column == null ? undefined : obj.column[0];

      obj.order = orderparams[i] == undefined ? 'asc' : orderparams[i];

      if (obj.column != undefined) sort.push(obj);
    }
  }

  for (let i = 0; i < sort.length; i++) {
    sort[i].immediate = isCertain(sort[i].column);
  }

  return sort;
}

function handleFilterParams(urlparams, allowedFields) {
  /* styles:
   * ?RID[lte]=17
   * ?RID=lte:17
   * ?filter=RID[lte]:17
  **/
  let filters = { 'immediate': [], 'postquery': [] };
  let filtersMap = { 'immediate': [], 'postquery': [] };

  const isCertain = field => !field.match(/\./g) && allowedFields.includes(field);
  const filterType = (obj, field) => obj[isCertain(field) ? 'immediate' : 'postquery'];
  const pushTo = (field, value, operator) => {
    const index = filterType(filtersMap, field).findIndex(v => v.field == field && v.operator == operator);
    if (index == -1) {
      filterType(filtersMap, field).push({ field, operator });
      filterType(filters, field).push({ field, value, operator });
    } else {
      const valueAtIndex = filterType(filters, field)[index];
      if (Array.isArray(valueAtIndex)) filterType(filters, field)[index].push({ field, value, operator });
      else {
        filterType(filters, field)[index] = [ valueAtIndex, { field, value, operator } ];
      }
    }
  };

  const operators = {
    'lt': '<',
    'gt': '>',
    'lte': '<=',
    'gte': '>=',
    'eq': '='
  };

  urlparams = parse(urlparams).query;
  urlparams = urlparams == null ? [] : urlparams.split('&');

  for (let urlparam of urlparams) {
    const splitparam = urlparam.split('=');
    const key = splitparam[0], value = splitparam[1];

    if (key == undefined || value == undefined) continue;

    if ([ 'filter', 'filters' ].includes(key)) {
      const fieldPattern = new RegExp(/([A-Z]|[a-z])+((?=\[(lte?|gte?|eq)\]:)|(?=:))/g),
        operatorPattern = new RegExp(/(?<=\[)gte?|lte?|eq(?=\])/g),
        valuePattern = new RegExp(/(?<=:).+/g);
      let filterValues = value.replace(', ', ',').split(',');
      for (let filter of filterValues) {
        let field = filter.match(fieldPattern),
          operator = filter.match(operatorPattern),
          value = filter.match(valuePattern);

        // IDEA: ha nincs megadva value érték, lehetne arra filterelni aminek van ilyen mezője
        if (field == null || value == null) continue;
        field = field[0], value = value[0];
        if (operator == null) operator = operators['eq'];
        else
          operator = operators[operator[0]];
        if (operator == undefined) operator = operators['eq'];

        pushTo(field, value, operator);
      }
    } else {
      if ([ 'limit', 'offset', 'sort', 'order' ].includes(key)) continue;

      if (key.match(/\[(lte?|gte?|eq)\]/g)) {
        // RID[gte]=3
        let operator = key.match(/(?<=\[)gte?|lte?|eq(?=\])/g)?.[0];
        if (!operator) operator = 'eq';

        const field = key.match(/.+(?=\[(gte?|lte?|eq)\])/g)?.[0];
        if (!field) continue;

        pushTo(field, tryparse(value), operators[operator]);
      } else if (value.match(/(gte?|lte?|eq):/g)) {
        // RID=gt:3
        const val = value.match(/(?<=:).+/g)?.[0];
        if (!val) continue;

        let operator = value.match(/(gte?|lte?|eq)(?=:)/g)?.[0];
        if (!operator) operator = 'eq';

        pushTo(key, tryparse(val), operators[operator]);
      } else {
        pushTo(key, tryparse(value), operators['eq']);
      }
    }
  }

  return filters;
}

function attachFilters(query, filters) {
  for (let filter of filters) {
    if (Array.isArray(filter)) {
      query.where(builder => {
        for (let f of filter)
          builder.orWhere(f.field, f.operator, f.value);
      });
    } else {
      if (filter.value == 'null')
        query.whereNull(filter.field);
      else
        query.where(filter.field, filter.operator, filter.value);
    }
  }
  return query;
}

async function handleMounts(data, mounts) {
  data = await data;
  for (let i = 0; i < data.length; i++) {
    for (let mount of mounts) {
      data[i][mount.mountPoint] = await mount.callback(data[i]);
    }
  }
  return data;
}

function compareStringOp(a, b, op) {
  switch (op) {
    case '=':
      return a == b;
    case '>':
      return a > b;
    case '<':
      return a < b;
    case '>=':
      return a >= b;
    case '<=':
      return a <= b;
  }
}
function compareMultiple(comparesArray, value) {
  let c;
  for (let compare of comparesArray) {
    let v = parseInt(compare.value, 10);
    compare.value = Number.isNaN(v) ? compare.value : v;
    c = c || compareStringOp(compare.value, value, compare.operator);
  }
  return c;
}

function traverse(obj, map) {
  let c = obj;
  for (let key of map) {
    if (c == undefined) return undefined;
    c = c[key];
  }
  return c;
}
async function setupBatchRequest(query, urlparams, rawUrl, mounts = []) {
  const limit = (() => {
    let l = parseInt(urlparams.limit?.match((new RegExp(`\\d{1,${options.api.maxDigits}}`, 'm'))).at(0), 10) || options.api.batchRequests.defaultLimit;
    return (l > options.api.batchRequests.maxLimit ? options.api.batchRequests.maxLimit : l);
  })();
  const offset = parseInt(urlparams.offset?.match((new RegExp(`\\d{1,${options.api.maxDigits}}`, 'm'))).at(0), 10) || 0;

  const filterparams = handleFilterParams(rawUrl, getSelectFields(query));
  attachFilters(query, filterparams.immediate);

  let sortparams = handleSortParams(urlparams, getSelectFields(query));
  let immediateSort = [];

  for (let i = 0; i < sortparams.length; i++) {
    if (sortparams[i].immediate) {
      delete sortparams[i].immediate;
      immediateSort.push(sortparams[i]);
    } else {
      break;
    }
  }

  const data = query.offset(offset).limit(limit).orderBy(immediateSort);
  if (mounts.length == 0) return await data;
  const finalData = await handleMounts(data, mounts);

  for (let filter of filterparams.postquery) {
    const isOrRel = Array.isArray(filter);
    let traversePath = (isOrRel ? filter[0] : filter).field.split('.');

    if (isOrRel) {
      for (let i = 0; i < finalData.length; i++) {
        const traversed = traverse(finalData[i], traversePath);
        if (traversed == undefined) continue;

        if (!compareMultiple(filter, traversed)) {
          delete finalData[i];
        }
      }
    } else {
      let v = parseInt(filter.value, 10);
      filter.value = Number.isNaN(v) ? filter.value : v;

      for (let i = 0; i < finalData.length; i++) {
        const traversed = traverse(finalData[i], traversePath);
        if (traversed == undefined) continue;

        if (!compareStringOp(traversed, filter.value, filter.operator)) {
          delete finalData[i];
        }
      }
    }
  }


  let collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  return finalData.filter(v => v != null).sort((a, b) => {
    for (let sort of sortparams) {
      let traversePath = sort.column.split('.');

      let travA = traverse(a, traversePath), travB = traverse(b, traversePath);
      let compared = cmp(travA, travB, sort.order == 'desc', urlparams.nulls == 'last', collator.compare);
      if (compared != undefined && compared != 0) return compared;
    }
    return 0;
  });
}

// TODO: revision - wasteful?
function addCoalesces(query, coalesces) {
  for (let coalesce of coalesces) {
    query.select(knx.raw(coalesce));
  }
}
function selectCoalesce(tableArr) {
  const findDupFields = (checkedTableObj, checkedTables) => {
    let tables = [];
    for (let tableObj of tableArr) {
      if (checkedTableObj.table == tableObj.table || checkedTables.includes(tableObj.table)) continue;

      const found = tableObj.fields.filter(field => checkedTableObj.fields.indexOf(field) != -1);
      if (found.length > 0) tables.push({ 'fields': found, 'table': tableObj.table });
    }
    return tables;
  };

  let checkedTables = [];
  let duplicateFields = {};
  for (let tableObj of tableArr) {
    const allDuplicates = findDupFields(tableObj, checkedTables);
    checkedTables.push(tableObj.table);
    for (let duplicates of allDuplicates) {
      for (let field of duplicates.fields) {
        if (!(field in duplicateFields)) duplicateFields[field] = [];

        if (!duplicateFields[field].includes(duplicates.table)) duplicateFields[field].push(duplicates.table);
        if (!duplicateFields[field].includes(tableObj.table)) duplicateFields[field].push(tableObj.table);
      }
    }
  }

  let coalesces = [];
  for (let field in duplicateFields) {
    let selectStr = '';
    selectStr += 'COALESCE(';
    for (let i = 0; i < duplicateFields[field].length; i++) {
      const tables = duplicateFields[field];
      selectStr += tables[i] + '.' + field + (i+1 == tables.length ? `) AS ${field}` : ', ');
    }
    coalesces.push(selectStr);
  }

  let selects = [];
  for (let tableObj of tableArr) {
    const fields = tableObj.fields.filter(field => {
      if (duplicateFields?.[field] ?? '') return !duplicateFields[field].includes(tableObj.table);
      return true;
    });
    for (let field of fields) {
      selects.push(tableObj.table + '.' + field);
    }
  }
  return { coalesces, selects };
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

export { checkToken, handleNotFound, logRequest, generateUniqueToken, classicErrorSend, filterByPermission, getPermittedFields, handleRouteAccess,  getSelectFields, handleSortParams, handleFilterParams, attachFilters, setupBatchRequest, addCoalesces, selectCoalesce/* , boilerplateRequestBatch, boilerplateRequestID, attachBoilerplate*/ };