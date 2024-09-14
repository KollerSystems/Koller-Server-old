import { knx, permMappings, roleMappings } from './index.js';
import { setIfMissingKey } from './helpers/misc.js';
const perms = [ 'Read', 'Write' ];

/**
 * Adatbázis bejegyzésekből egy fastruktúrát alakít ki (objektumokból).
 * @param {object[]} arr RowDataPacket-eket tartalmazó array
 * @param {'perms'|'routes'|'errors'} mapType feldolgozás módszere, feldolgozandó adat típusa
 * @returns {object} Fastrukturált objektum, a paramétereknek megfelelő módon.
 */
function treeifyMaps(arr, mapType = 'perms') {
  const tree = {};
  if (mapType == 'perms') {
    for (let row of arr) {
      row.Role = roleMappings.byID[row.Role];
      setIfMissingKey(tree, row.Table);
      setIfMissingKey(tree[row.Table], row.Field);
      setIfMissingKey(tree[row.Table][row.Field], row.Role);
      for (let perm of perms)
        tree[row.Table][row.Field][row.Role][perm.toLowerCase()] = Boolean(row[perm]);
    }

    /* User központú mapping
    for (let row of arr) {
      if (!tables.includes(row.Table)) tables.push(row.Table);

      row.Role = roleMappings.byID[row.Role];
      setIfMissingKey(tree, row.Role);

      for (let perm of perms) {
        const keyname = perm.toLowerCase();
        setIfMissingKey(tree[row.Role], keyname);
        setIfMissingKey(tree[row.Role][keyname], row.Table);
        tree[row.Role][keyname][row.Table][row.Field] = Boolean(row[perm][0]);
      }
    }*/
  } else if (mapType == 'routes') {
    for (let row of arr) {
      setIfMissingKey(tree, row.Route);
      setIfMissingKey(tree[row.Route], row.Role);
      tree[row.Route][row.Role].accessible = Boolean(row.Accessible);
      tree[row.Route][row.Role].hide = Boolean(row.Hide);
    }
  } else if (mapType == 'errors') {
    for (let row of arr) {
      tree[row.Keyword] = { 'code': row.Code, 'description': row.Description };
    }
  }


  return tree;
}
/**
 * Permissziós táblában nem megnevezett mezők engedélyeinek alapértelmezettre állítása.
 */
async function extendMissingPermissions() {
  const permColumnInfo = await knx('permissions').columnInfo();
  const defaults = {};
  for (let perm of perms)
    defaults[perm] = (permColumnInfo[perm].defaultValue == '0' ? false : true);

  for (let table in permMappings) {
    let columns = await knx(table).columnInfo();
    for (let column in columns) {
      if (column in permMappings[table]) continue;
      setIfMissingKey(permMappings[table], column);
      for (let role in roleMappings.byRole) {
        setIfMissingKey(permMappings[table][column], role);
        for (let perm of perms)
          permMappings[table][column][role][perm.toLowerCase()] = defaults[perm];
      }
    }
  }

  /* User központú mapping
  for (let user in permMappings) {
    for (let access in permMappings[user]) {
      for (let table in permMappings[user][access]) {
        for (let field in tableInfos[table]) {
          if (!has(permMappings[user][access][table], field))
            permMappings[user][access][table][field] = defaults[access];
        }
      }
    }
  }*/
}
/**
 * Rekurzívan mountol egy fastruktúrált objektumot, mely kulcsnevei az endpointok, értékei a router-ek.
 * @param {object} tree Fastruktúrált objektum. Ha kulcshoz tartozó érték egy objektum, akkor a fő route-ot azon belül '/' kulccsal jelöljük.
 */
function mountTree(tree) {
  for (let routeName in tree) {
    if (routeName == '/') continue;
    if (typeof tree[routeName] == 'function')
      tree['/'].use(routeName, tree[routeName]);
    else {
      tree['/'].use(routeName, tree[routeName]['/']);
      mountTree(tree[routeName]);
    }
  }
}

/**
 * ColumnInfo-k lekérdezése.
 * @param {string[]} tablesArr Lekérdezendő táblák nevei. Üres lista vagy undefined ha minden.
 * @returns {Promise<Object.<string, import('knex').Knex.ColumnInfo>>} Objektumba rendezve, kulcsok a táblanevek, értékek a ColumnInfo-k.
 */
async function queryTableColumns(tablesArr) {
  if (tablesArr == undefined) tablesArr = [];
  if (tablesArr?.length == 0) {
    const query = await knx.raw('show tables');
    for (let rowObj of query[0]) {
      tablesArr.push(Object.values(rowObj)[0]);
    }
  }

  const tables = {};
  for (let table of tablesArr)
    tables[table] = await knx(table).columnInfo();

  return tables;
}

export { treeifyMaps, extendMissingPermissions, mountTree, queryTableColumns };
