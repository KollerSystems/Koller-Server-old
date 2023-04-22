import { knx, options, permMappings, roleMappings } from './index.js'
import { has } from './misc.js'
const perms = ["Read", "Write"];

function setIfMissingKey(obj, key, defaultValue = {}) {
  if (!has(obj, key)) obj[key] = defaultValue;
}

function treeifyMaps(arr, mapType = "perms") {
  const tree = {};
  if (mapType == "perms") {
    for (let row of arr) {
      row.Role = roleMappings.byID[row.Role];
      setIfMissingKey(tree, row.Table);
      setIfMissingKey(tree[row.Table], row.Field);
      setIfMissingKey(tree[row.Table][row.Field], row.Role);
      for (let perm of perms)
        tree[row.Table][row.Field][row.Role][perm.toLowerCase()] = Boolean(row[perm][0]);
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
  } else if (mapType == "routes") {
    for (let row of arr) {
      setIfMissingKey(tree, row.Route);
      setIfMissingKey(tree[row.Route], row.Role);
      tree[row.Route][row.Role].accessible = Boolean(row.Accessible[0]);
      tree[row.Route][row.Role].hide = Boolean(row.Hide[0]);
    }
  }


  return tree;
}
async function extendMissingPermissions() {
  const permColumnInfo = await knx('permissions').columnInfo();

  const defaults = {};
  for (let perm of perms)
    defaults[perm] = (permColumnInfo[perm].defaultValue == "b'0'" ? false : true);

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

async function checkDatabase() { // TODO: nem linkelt user típus && route access check
  const problems = { missingUsers: {}, undeclaredPermTables: [], partialPermTables: {} };

  // meghatározatlan összeköttetések user és az adott felhasználó altábla közt
  for (let roleID in roleMappings.byID) {
    const roleName = roleMappings.byID[roleID];
    const missingIDs = await knx('user').select('*').whereNotExists(knx(roleName).select('*').whereRaw(`user.ID = ${roleName}.ID`)).andWhere('Role', roleID); // whereRaw-on kívül hibásan adnak vissza adatot

    if (missingIDs.length > 0) problems.missingUsers[roleName] = missingIDs.reduce((_, cur, i) => { missingIDs[i] = cur.GID; return missingIDs }, 0);
  }

  // definiálatlan permissziók keresése a használt táblákon
  // definiálatlan mezők keresése definiált permisszió táblákon
  const usedTables = ['student', 'teacher', 'mifare_tags']; // TODO: lekérhető táblák meghatározása adatbázisban
  for (let table of usedTables) {
    if (permMappings[table] == undefined) {
      problems.undeclaredPermTables.push(table);
      continue;
    };

    problems.partialPermTables[table] = [];
    let columns = await knx(table).columnInfo();
    for (let column in columns) {
      if (column in permMappings[table]) continue;
      problems.partialPermTables[table].push(column);
    }
    if (problems.partialPermTables[table].length == 0) delete problems.partialPermTables[table];
  }


  for (let userType in problems.missingUsers)
    console.warn(`Missing ${userType} defined in user: ${problems.missingUsers[userType].join(", ")}`);
  if (problems.undeclaredPermTables.length > 0) console.warn(`Missing permission definition for: ${problems.undeclaredPermTables.join(", ")}`);
  for (let table in problems.partialPermTables) {
    console.warn(`Partially defined ${table}: ${problems.partialPermTables[table].join(", ")} missing!`);
  }
}

function checkOptions() {
  let problems = { nonexistantRolesAllowed: [], defaultOutOfRange: false };

  // nem létező (elírt) role-ok keresése
  for (let role of options.api.batchRequests.allowedRoles)
    if (!Object.values(roleMappings.byID).includes(role)) problems.nonexistantRolesAllowed.push(role);

  // alapértelmezett limit nagyobb mint a maximális
  problems.defaultOutOfRange = options.api.batchRequests.defaultLimit > options.api.batchRequests.maxLimit;

  if (problems.nonexistantRolesAllowed.length > 0) console.warn(`Non-existant role allowed for batch requests: ${problems.nonexistantRolesAllowed.join(", ")}`);
  if (problems.defaultOutOfRange) console.warn("The default batch request limit is bigger than the set max limit!");
}

export { treeifyMaps, extendMissingPermissions, checkDatabase, checkOptions }