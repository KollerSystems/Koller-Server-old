import XRegExp from 'xregexp';
import { knx, options } from '../index.js';
import { isEmptyObject, tryparse } from './misc.js';
import { parse } from 'node:url';

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
function getFromFields(query) {
  let froms = [];
  const sql = query.toSQL().sql;

  let descartesFrom = sql.match(/(?<=from )(([\w`]+, )+)?[\w`]+/gi)?.[0]?.replaceAll(', ', ',')?.split(',');
  if (descartesFrom ?? '') froms.push(...descartesFrom);

  let joins = sql.match(/(?<=join )[\w`]+/gi);
  if (joins ?? '') froms.push(...joins);

  for (let i = 0; i < froms.length; i++)
    froms[i] = froms[i].replaceAll('`', '');

  return froms;
}

function handleSortParams(urlparams, allowedFields, translation, renames) {
  if (!(urlparams.sort ?? '')) return [];

  const isCertain = field => {
    if (allowedFields.all.includes(field)) return true;
    const traversed = traverse(translation, field.split('.'));
    if (traversed != undefined && !(traversed instanceof Object)) return true;
    return false;
  };

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

      obj.column = renames[obj.column] || obj.column;
      if (obj.column != undefined) sort.push(obj);
    }
  } else {
    for (let i = 0; i < sortparams.length; i++) {
      let obj = {};
      obj.column = sortparams[i].match(/(?<=-?|\+?)(([A-z]|\.)+)(?=:?)/);
      obj.column = obj.column == null ? undefined : obj.column[0];

      obj.order = orderparams[i] == undefined ? 'asc' : orderparams[i];

      obj.column = renames[obj.column] || obj.column;
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

function handleFilterParams(urlparams, allowedFields, translation, renames) {
  /* styles:
   * ?RID[lte]=17
   * ?RID=lte:17
   * ?filter=RID[lte]:17
  **/
  let filters = { 'immediate': [], 'postquery': [] };
  let filtersMap = { 'immediate': [], 'postquery': [] };

  const isCertain = field => allowedFields.all.includes(field) || (traverse(translation, field.split('.')) ?? '');
  const filterType = (obj, field) => obj[isCertain(field) ? 'immediate' : 'postquery'];
  const pushTo = (field, value, operator, optionals = {}) => {
    field = renames[field] || field;
    if (operator == 'REGEXP') {
      try {
        new XRegExp(value, optionals.flags);
      } catch (err) {
        value = '';
      }
    }

    const index = filterType(filtersMap, field).findIndex(v => v.field == field && v.operator == operator);
    if (index == -1) {
      let traversed = traverse(translation, field.split('.'));
      if (traversed instanceof Object) return;

      filterType(filtersMap, field).push({ field, operator });
      filterType(filters, field).push({ 'field': traversed || allowedFields.coalesce[field] || field, value, operator });
    } else {
      let traversed = traverse(translation, field.split('.'));
      if (traversed instanceof Object) return;

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
    'eq': '=',
    'reg': 'REGEXP'
  };

  urlparams = parse(urlparams).query;
  urlparams = urlparams == null ? [] : urlparams.split('&');

  for (let urlparam of urlparams) {
    const splitparam = urlparam.split('=');
    const key = splitparam[0], value = decodeURIComponent(splitparam[1]);

    if (key == undefined || value == undefined) continue;

    if ([ 'filter', 'filters' ].includes(key)) {
      const fieldPattern = new RegExp(/([A-Z]|[a-z]|\.)+((?=\[(lte?|gte?|eq)\]:)|(?=:))/g),
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

        const regexp = value.match(/(?<=\/).+(?=\/)/g);
        if (regexp ?? '') {
          pushTo(field, regexp[0], operators['reg'], { 'flags': value.match(/[gimsuy]+$/gi)?.[0] || '' });
        } else
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
        const regexp = value.match(/(?<=\/).+(?=\/)/g);
        if (regexp ?? '') {
          pushTo(key, regexp[0], operators['reg'], { 'flags': value.match(/[gimsuy]+$/gi)?.[0] || '' });
        } else
          pushTo(key, tryparse(value), operators['eq']);
      }
    }
  }

  return filters;
}

function attachFilters(query, filters, columns) {
  const prettifyDateArr = (arr, extend = false) => {
    let str = arr[0].toString();
    for (let i = 1; i < arr.length; i++) {
      str += '-' + arr[i].toString().padStart(2, '0');
    }
    if (extend) {
      for (let i = arr.length; i < 3; i++) {
        str += '-00';
      }
    }
    return str;
  };
  const fieldValues = filter => {
    const column = columns[filter.field];
    if (column?.type == 'date') {
      if (filter.operator == '=') {
        filter.operator = 'like';
        filter.value = prettifyDateArr(filter.value.toString().split('-')) + '%';
      } else {
        const split = filter.value.toString().split('-');
        if (split.length < 3) {
          const i = split.length - 1;
          let f = [ '<=', '>' ].includes(filter.operator) ? 1 : 0;
          f = f == -2 ? 0 : f;
          split[i] = Number(split[i]) + f;
        }

        filter.value = prettifyDateArr(split, true);
      }

    } else {
      filter.field = knx.raw(filter.field);
    }
    return [ filter.field, filter.operator, filter.value ];
  };

  const addWhere = (root, f, or = false) => {
    if (f.operator == 'REGEXP')
      root.whereRaw(`${f.field} REGEXP ?`, [ f.value ]);
    else
      root[or ? 'orWhere' : 'where'](...fieldValues(f));
  };
  for (let filter of filters) {
    if (Array.isArray(filter)) {
      query.where(builder => {
        for (let f of filter)
          addWhere(builder, f, true);
      });
    } else {
      if (filter.value == 'null')
        query.whereNull(filter.field);
      else
        addWhere(query, filter);
    }

  }
  return query;
}

function attachSorts(query, sorts) {
  for (let sort of sorts) {
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

function initializeOrAdd(obj, key, value) {
  if (value?.length >= 0 && typeof value == 'object') {
    if (obj[key] == undefined) obj[key] = [];
    obj[key] = [ ...obj[key], ...value ];
  } else if (typeof value == 'object')
    obj[key] = { ...obj[key], ...value };
  else
    obj[key] = value;
}
async function setupBatchRequest(query, urlparams, rawUrl, params = {}, mounts = [], renames = {}, overrideables = {}) {
  const limit = (() => {
    let l = parseInt(urlparams.limit?.match((new RegExp(`\\d{1,${options.api.maxDigits}}`, 'm')))?.at(0), 10) || options.api.batchRequests.defaultLimit;
    return (l > options.api.batchRequests.maxLimit ? options.api.batchRequests.maxLimit : l);
  })();
  const offset = parseInt(urlparams.offset?.match((new RegExp(`\\d{1,${options.api.maxDigits}}`, 'm')))?.at(0), 10) || 0;

  let translation = {};
  for (let mount of mounts) {
    if (!mount.flexible) continue;

    query.leftJoin(mount.query.table, mount.join[0], mount.query.table + '.' + mount.join[1]);
    if (!(translation[mount.point] ?? '')) translation[mount.point] = {};
    for (let field of mount.query.fields)
      translation[mount.point][field] = mount.query.table + '.' + field;
  }

  const tables = getFromFields(query);
  let columns = {};
  for (let table of tables) {
    const cInfo = await knx(table).columnInfo();
    columns = { ...columns, ... cInfo };
  }

  const trueRenames = {};
  for (let key in renames) {
    if (renames[key] ?? '') {
      trueRenames[renames[key]] = key;
    }
  }

  const filterparams = handleFilterParams(rawUrl, getSelectFields(query), translation, trueRenames);

  for (let key in overrideables) {
    const index = filterparams.immediate.findIndex(obj => obj.field == key);
    if (index != -1) continue;
    overrideables[key](query);
  }

  attachFilters(query, filterparams.immediate, columns);

  let sortparams = handleSortParams(urlparams, getSelectFields(query), translation, trueRenames);
  let immediateSort = [];

  for (let i = 0; i < sortparams.length; i++) {
    if (sortparams[i].immediate) {
      delete sortparams[i].immediate;
      immediateSort.push(sortparams[i]);
    } else {
      break;
    }
  }

  let data = query;
  if (!params.ignoreLimit) data = data.limit(limit);
  if (!params.ignoreOffset) data = data.offset(offset);
  attachSorts(data, immediateSort);

  if (mounts.length == 0) return await data;

  let finalData = await query;

  for (let obj of finalData) {
    for (let mount of mounts) {
      if (mount.flexible) {
        const mountedObj = await knx(mount.query.table).first(mount.query.fields).where(mount.join[1], obj[mount.join[0]]);
        initializeOrAdd(obj, mount.point, mountedObj);
      } else {
        const mountedObj = await mount.callback(obj);
        initializeOrAdd(obj, mount.point, mountedObj);
      }
      if (obj[mount.point] != undefined && isEmptyObject(obj[mount.point])) obj[mount.point] = undefined;
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

export { getSelectFields, handleSortParams, handleFilterParams, attachFilters, setupBatchRequest };