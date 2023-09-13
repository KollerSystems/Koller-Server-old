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
    selectParams = selectParams[0].match(/(\w+\([\w.`, ]+\)( AS \w+)?)|([\w.`]+( AS \w+)?)/g);
  else selectParams = [];
  const fields = { 'all': [], 'coalesce': {} };
  for (let selectParam of selectParams) {
    let renameMatch = selectParam.match(/(?<=AS `?)\w+/g);
    let fieldMatch = selectParam.match(/[\w`]+$/g);

    const pushElem = renameMatch?.[0]?.replaceAll('`', '') || fieldMatch?.[0].replaceAll('`', '');
    if (pushElem != null) fields.all.push(pushElem);

    let coalesceMatch = selectParam.match(/(COALESCE|coalesce)\(.+\)/g);
    if (!(coalesceMatch ?? '')) continue;

    let fieldIdentities = coalesceMatch[0].slice(9, -1).replaceAll(', ', ',').split(',');
    let fieldName = fieldIdentities[0].match(/(?<=\.`?)\w+/g)?.[0];
    if (!(fieldName ?? '')) continue;

    const regexp = new RegExp(`(?<=\\.\`?)${fieldName}`, 'g');
    const sameFields = fieldIdentities.slice(1).every(identity => (identity.match(regexp)?.[0] ?? ''));
    if (sameFields) fields.coalesce[fieldName] = coalesceMatch[0];
  }

  return fields;
}

function handleSortParams(urlparams, allowedFields, translation) {
  if (!(urlparams.sort ?? '')) return [];

  const isCertain = field => allowedFields.all.includes(field) || (traverse(translation, field.split('.')) != undefined);

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
    sort[i].complex = false;
    let traversed = traverse(translation, sort[i].column.split('.'));
    if (traversed ?? '') sort[i].column = traversed;
    if (sort[i].column in allowedFields.coalesce) {
      sort[i].column = allowedFields.coalesce[sort[i].column];
      sort[i].complex = true;
    }
  }

  return sort;
}

function handleFilterParams(urlparams, allowedFields, translation) {
  /* styles:
   * ?RID[lte]=17
   * ?RID=lte:17
   * ?filter=RID[lte]:17
  **/
  let filters = { 'immediate': [], 'postquery': [] };
  let filtersMap = { 'immediate': [], 'postquery': [] };

  const isCertain = field => allowedFields.all.includes(field) || (traverse(translation, field.split('.')) ?? '');
  const filterType = (obj, field) => obj[isCertain(field) ? 'immediate' : 'postquery'];
  const pushTo = (field, value, operator) => {
    const index = filterType(filtersMap, field).findIndex(v => v.field == field && v.operator == operator);
    if (index == -1) {
      let traversed = traverse(translation, field.split('.'));

      filterType(filtersMap, field).push({ field, operator });
      filterType(filters, field).push({ 'field': traversed || allowedFields.coalesce[field] || field, value, operator });
    } else {
      let traversed = traverse(translation, field.split('.'));

      const valueAtIndex = filterType(filters, field)[index];
      if (Array.isArray(valueAtIndex)) filterType(filters, field)[index].push({ 'field': traversed || allowedFields.coalesce[field] || field, value, operator });
      else {
        filterType(filters, field)[index] = [ valueAtIndex, { 'field': traversed || allowedFields.coalesce[field] || field, value, operator } ];
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
    const key = splitparam[0], value = decodeURIComponent(splitparam[1]);

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
      if ([ 'limit', 'offset', 'sort', 'order', 'nulls' ].includes(key)) continue;
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
          builder.orWhere(knx.raw(f.field), f.operator, f.value);
      });
    } else {
      if (filter.value == 'null')
        query.whereNull(filter.field);
      else
        query.where(knx.raw(filter.field), filter.operator, filter.value);
    }
  }
  return query;
}

function attachSorts(query, sorts) {
  const simplesorts = sorts.filter(v => !v.complex);
  query.orderBy(simplesorts);
  for (let sort of sorts) {
    if (!sort.complex) continue;
    query.orderBy(knx.raw(sort.column), sort.order);
  }
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

function traverse(obj, map, tillValue = true) {
  let c = obj;
  for (let i = 0; i < map.length; i++) {
    if (c == undefined) return undefined;
    if (!tillValue && i+1 == map.length) break;
    c = c[map[i]];
  }
  return c;
}
async function setupBatchRequest(query, urlparams, rawUrl, mounts = [], renames = {}) {
  const limit = (() => {
    let l = parseInt(urlparams.limit?.match((new RegExp(`\\d{1,${options.api.maxDigits}}`, 'm'))).at(0), 10) || options.api.batchRequests.defaultLimit;
    return (l > options.api.batchRequests.maxLimit ? options.api.batchRequests.maxLimit : l);
  })();
  const offset = parseInt(urlparams.offset?.match((new RegExp(`\\d{1,${options.api.maxDigits}}`, 'm'))).at(0), 10) || 0;

  let translation = {};
  for (let mount of mounts) {
    if (!mount.flexible) continue;

    query.leftJoin(mount.query.table, mount.join[0], mount.query.table + '.' + mount.join[1]);
    translation[mount.point] = {};
    for (let field of mount.query.fields)
      translation[mount.point][field] = mount.query.table + '.' + field;
  }

  const filterparams = handleFilterParams(rawUrl, getSelectFields(query), translation);
  attachFilters(query, filterparams.immediate);

  let sortparams = handleSortParams(urlparams, getSelectFields(query), translation);
  let immediateSort = [];

  for (let i = 0; i < sortparams.length; i++) {
    if (sortparams[i].immediate) {
      delete sortparams[i].immediate;
      immediateSort.push(sortparams[i]);
    } else {
      break;
    }
  }

  const data = query.offset(offset).limit(limit);
  attachSorts(data, immediateSort);

  if (mounts.length == 0) return await data;

  let finalData = await query;

  for (let obj of finalData) {
    for (let mount of mounts) {
      if (mount.flexible) {
        obj[mount.point] = await knx(mount.query.table).first(mount.query.fields).where(mount.join[1], obj[mount.join[0]]);
      } else {
        obj[mount.point] = await mount.callback(obj);
      }
    }
    for (let field in renames) {
      let traversePath = field.split('.');
      let traversed = traverse(obj, traversePath, false);
      if (traversed == undefined) continue;

      if (renames[field] == undefined) {
        delete traversed[traversePath.at(-1)];
      } else if (typeof renames[field] == 'string') {
        let v = traversed[traversePath.at(-1)];
        delete traversed[traversePath.at(-1)];
        traversed[renames[field]] = v;
      }
    }
  }

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
  if (filterparams.postquery.length > 0) finalData = finalData.filter(v => v != null);

  /*
  // más a sortja ennek, és az SQLnek, így teljesen összekeveri
  let collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  return finalData.sort((a, b) => {
    for (let sort of sortparams) {
      if (sort.immediate) continue;
      let traversePath = sort.column.split('.');

      let travA = traverse(a, traversePath), travB = traverse(b, traversePath);
      let compared = cmp(travA, travB, sort.order == 'desc', urlparams.nulls == 'last', collator.compare);
      if (compared != undefined && compared != 0) return compared;
    }
    return 0;
  }); */
  return finalData;
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

export { checkToken, handleNotFound, logRequest, generateUniqueToken, classicErrorSend, filterByPermission, getPermittedFields, handleRouteAccess,  getSelectFields, handleSortParams, handleFilterParams, attachFilters, setupBatchRequest, addCoalesces, selectCoalesce/* , boilerplateRequestBatch, boilerplateRequestID, attachBoilerplate*/ };