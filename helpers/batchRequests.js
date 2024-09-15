import RE2 from 're2';
import { knx, options, tableColumns } from '../index.js';
import { filter, isEmptyObject, tryparse } from './misc.js';

/**
 * lekérdezés objektum
 * @typedef {import('knex').Knex.QueryBuilder} QueryBuilder
 */

/**
 * Olyan objektum, amely szétválasztva tartalmazza az összes és összevonandó mezőneveket.
 * @typedef {Object} FilteredSelect
 * @property {string[]} all Az összes említett mezőnév(coalesce-ben használtak is).
 * @property {Object.<string, string>} coalesce Objektum, amely tartalmazza az összevonandó mezőneveket és a kifejezést amely által ez elérhető.
 */

/**
 * Olyan objektum, mely kulcsai az eredeti mezőnevek, az értékek pedig az újak.
 * @typedef {Object.<string, string>} DefinedRenames
 */

/**
 * Objektum, ami megmutatja a mount-olandó objektumok egyes értékei hol találhatók. Táblát és mezőt is megmutatja (Table.Field).
 * @typedef {Object.<string, Object.<string, string>>} Translation
 */

/**
 * SELECT statement vizsgálatából az azonos nevű mezők kiszűrése és különválasztása COALESCE-el való használatra.
 * @param {QueryBuilder} query
 * @returns {FilteredSelect} különválasztott objektum
 */
function getSelectFields(query) {
  let selectParams = query.toSQL().sql.match(/(?<=select ).+(?= from)/g);
  if (selectParams.length == 1 && selectParams[0] == '*') selectParams = [];
  else if (selectParams != null)
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
/**
 * Egy kérésből megszerzi az érintett(FROM-mal használt) táblák neveit.
 * @param {QueryBuilder} query
 * @returns {string[]} használt táblanevekből array
 */
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

/**
 * Szortírozás-specifikus query paraméterek értelmezése.
 * @param {object} urlparams Express által parsolt query(többnyire ami request objektumon query néven elérhető): objektum querystringből parsolva.
 * @param {FilteredSelect} allowedFields
 * @param {Translation} translation
 * @param {DefinedRenames} renames
 * @returns {{'column': string, 'order': 'desc'|'asc', 'immediate': boolean, 'complex': boolean}[]} szortírozás körülményei és sorrendje
 */
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

/**
 * @typedef {{'field': string, 'value': any, 'operator': '<'|'>'|'<='|'>='|'='|'REGEXP'}} WhereObject
 */
/**
 * Szűrési query paraméterek értelmezése.
 * @param {object} urlparams Express által parsolt query(többnyire ami request objektumon query néven elérhető): objektum querystringből parsolva.
 * @param {FilteredSelect} allowedFields
 * @param {Translation} translation
 * @param {DefinedRenames} renames
 * @returns {{'immediate': WhereObject[], 'postquery': WhereObject[]}} Szűrési beállítások, kérésre rakhatók és utólagos szűrésekként szétválasztva.
 */
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
      optionals.flags = filter(optionals.flags.split(''), [ 'i', 's', 'm' ]).join('');
      try {
        new RE2(value, optionals.flags);
        if (optionals.flags.length != 0) value = '(?' + optionals.flags + ')' + value;
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

  const index = urlparams.indexOf('?');
  urlparams = index == -1 ? undefined : urlparams.slice(index);
  if (urlparams?.startsWith('?')) urlparams = urlparams.slice(1);

  urlparams = urlparams == undefined ? [] : urlparams.split('&');

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

/**
 * Rárakja a kérésre a megadott szűréseket. Dátumok esetében speciálisan kezeli. Ha többször is van ugyanolyan mező említve speciálisan kezeli.
 * @param {QueryBuilder} query
 * @param {WhereObject[]} filters Kérésre rakható "értelmezett" szűrési paraméterek.
 * @param {import('knex').Knex.ColumnInfo[]} columns Minden értintett mező columnInfo-ja.
 * @returns {QueryBuilder} query
 */
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

/**
 * Módosítja a kérést, rátéve a megadott szűréseket.
 * @param {QueryBuilder} query
 * @param {{column: string, order: 'desc'|'asc', immediate?: true, complex: boolean}[]} sorts Azonnal kérésre tehető szortírozási beállítások.
 */
function attachSorts(query, sorts) {
  for (let sort of sorts) {
    query.orderBy(knx.raw(sort.column), sort.order);
  }
}

/**
 * Összehasonlít két értéket egy megadott operációval.
 * @param {any} a hasonlított
 * @param {any} b hasonlító
 * @param {'='|'>'|'<'|'>='|'<='} op komparálási operáció
 * @returns {boolean} hasonlítás eredménye
 */
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
/**
 * Összehasonlít minden comparesArray-ben levő értéket a value-vel. Ha valamelyik hasonlítás értéke true, akkor a kimenet is true.
 * @param {WhereObject[]} comparesArray
 * @param {any} value hasonlító érték
 * @returns {boolean | undefined} eredménye
 */
function compareMultiple(comparesArray, value) {
  let c;
  for (let compare of comparesArray) {
    let v = parseInt(compare.value, 10);
    compare.value = Number.isNaN(v) ? compare.value : v;
    c = c || compareStringOp(compare.value, value, compare.operator);
    // if (c) return c;
  }
  return c;
}

/**
 * Egy objektum kulcsain végigkúszik, visszaadván az elért kulcsot.
 * @param {object} obj Az objektum.
 * @param {string[]} map Kulcsok neveiből álló array, "mélységi" sorrendben.
 * @param {boolean} [tillValue=true] Teljesen végigmenjen-e, vagy utolsó előtti értékig.
 * @returns {any | object} elért érték
 */
function traverse(obj, map, tillValue = true) {
  let c = obj;
  for (let i = 0; i < map.length; i++) {
    if (c == undefined) return undefined;
    if (!tillValue && i+1 == map.length) break;
    c = c[map[i]];
  }
  return c;
}

/**
 * Egy objektumra rak értéket. Ha az érték array, akkor hozzáfűzi. Amennyiben objektum, rárakja. Hogyha primitív, akkor beállítja. Ha nem létezett, létrehozza.
 * @param {object} obj objektum
 * @param {string} key Kulcs ami alá kerüljön.
 * @param {any | object | any[]} value érték
 */
function initializeOrAdd(obj, key, value) {
  if (typeof obj[key] == 'string') obj[key] = undefined;
  if (value?.length >= 0 && typeof value == 'object') {
    if (obj[key] == undefined) obj[key] = [];
    obj[key] = [ ...obj[key], ...value ];
  } else if (typeof value == 'object')
    obj[key] = { ...obj[key], ...value };
  else
    obj[key] = value;
}

/**
 * @typedef {Object} FlexibleMount Query-vel mount-olt, gyorsabb megoldás.
 * @property {true} flexible
 * @property {string} point Kulcs neve, ahová mountolja.
 * @property {string[2]} join Kétértékes array. Két mezőnév amit összefűzzőn a lekérésben.
 * @property {{fields: string[], table: string}} query Kérés paraméterei, visszaadható értékek(mezőnevek) és táblája.
 *
 * @callback MountCallback
 * @param {object} parent Az az objektum, amire mount-olva lesz a függvény kimenetele.
 * @returns {any | Promise<any>}
 *
 * @typedef {Object} NonFlexibleMount Query-vel nem megoldható mount-olási megoldás.
 * @property {false} flexible
 * @property {string} point Kulcs neve, ahová mountolja.
 * @property {MountCallback} callback Függvény, ami belsőleg meg lesz hívva, és a kimenetelét mount-olja.
 *
 * @typedef {FlexibleMount | NonFlexibleMount} MountParameter
 * @property {boolean} flexible
 */
/**
 * @callback OverrideCallback
 * @param {QueryBuilder} query
 * @returns {void}
 */
/**
 * @param {QueryBuilder} query
 * @param {object} urlparams Express által parsolt query(többnyire ami request objektumon query néven elérhető): objektum querystringből parsolva.
 * @param {string} rawUrl Querystring /?-el előtte.
 * @param {{ignoreLimit?: boolean, ignoreOffset?: boolean} =} params Egyéb paraméterek objektumban.
 * @param {MountParameter[] =} mounts Összetett objektum kialakításához paraméterek, ahol a kimenetre más objektumokat helyez, mélységet elérve.
 * @param {Object.<string, string | undefined> =} renames Átnevezések, amikor az érték string. Törlések amikor undefined. Kulcs az eredeti mezőnév.
 * @param {Object.<string, OverrideCallback> =} overrideables Ha nincs a kulcsnév azonnal szűrt mezőnevek közt, akkor meghívja a függvényt, beadva a lekérést paraméterként.
 * @returns {Promise<object[]>} Egy promise, értéke array lekért adatokkal, a beállított paramétereknek megfelelően.
 */
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
    columns = { ...columns, ...tableColumns[table] };
  }

  const trueRenames = {};
  for (let key in renames) {
    if (renames[key] ?? '') {
      trueRenames[renames[key]] = key;
    }
  }

  const selectFields = getSelectFields(query);
  const filterparams = handleFilterParams(rawUrl, selectFields, translation, trueRenames);
  for (let key in overrideables) {
    const index = filterparams.immediate.findIndex(obj => obj.field == key);
    if (index != -1) continue;
    overrideables[key](query);
  }

  attachFilters(query, filterparams.immediate, columns);

  let sortparams = handleSortParams(urlparams, selectFields, translation, trueRenames);
  let immediateSort = [];

  for (let i = 0; i < sortparams.length; i++) {
    if (sortparams[i].immediate) {
      delete sortparams[i].immediate;
      immediateSort.push(sortparams[i]);
    } else {
      break;
    }
  }


  if (!params.ignoreLimit) query = query.limit(limit);
  if (!params.ignoreOffset) query = query.offset(offset);
  attachSorts(query, immediateSort);

  let finalData = await query;
  if (mounts.length == 0) return finalData;

  let mountsEvaluated = [];
  for (let obj of finalData)
    for (let mount of mounts)
      mountsEvaluated.push( mount.flexible ? knx(mount.query.table).first(mount.query.fields).where(mount.join[1], obj[mount.join[0]]) : mount.callback(obj) );
  mountsEvaluated = await Promise.all(mountsEvaluated);

  let mountIndex = 0;
  for (let obj of finalData) {
    for (let mount of mounts) {
      const mountedObj = mountsEvaluated[mountIndex++];
      initializeOrAdd(obj, mount.point, mountedObj);
      if (obj[mount.point] != undefined && isEmptyObject(obj[mount.point])) obj[mount.point] = undefined;
    }
    for (let field in renames) {
      let traversePath = field.split('.');
      let traversed = traverse(obj, traversePath, false);
      if (traversed == undefined) continue;

      if (typeof renames[field] == 'string')
        traversed[renames[field]] = traversed[traversePath.at(-1)];
      delete traversed[traversePath.at(-1)];
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
