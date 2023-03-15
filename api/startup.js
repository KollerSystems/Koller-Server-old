import { knx, permMappings, roleMappings } from './index.js'

function treeifyPerms(arr) {
  const tree = {};
  arr.forEach(rowData => {
    if (!(rowData.Table in tree)) tree[rowData.Table] = {};
    tree[rowData.Table][rowData.Field] = { read: {}, write: {} };
    Object.keys(rowData).slice(2).forEach(groupPermKey => { // slice(2): Table & Field kihagyása
      tree[rowData.Table][rowData.Field][groupPermKey.endsWith("Read") ? "read" : "write"][groupPermKey.match(/.+(?=Read|Write)/g)[0]] = Boolean(rowData[groupPermKey][0]);
    });
  });
  return tree;
}
async function extendMissingPermissions() {
  const columnInfo = await knx('permissions').columnInfo();
  const { Table, Field, ...permInfos } = columnInfo; // Table & Field kihagyása
  const defaultValues = { read: {}, write: {} };
  for (let permInfo in permInfos)
    defaultValues[permInfo.endsWith("Read") ? "read" : "write"][permInfo.match(/.+(?=Read|Write)/g)[0]] = (permInfos[permInfo].defaultValue == "b\'0\'" ? false : true);

  for (let table in permMappings) {
    let columns = await knx(table).columnInfo();
    for (let column in columns) {
      if (column in permMappings[table]) continue;
      permMappings[table][column] = { ...defaultValues }
    }
  }
}

async function checkDatabase() { // TODO: nem linkelt user típus
  const problems = { missingUsers: {}, undeclaredPermTables: [], partialPermTables: {} };

  // meghatározatlan összeköttetések user és az adott felhasználó altábla közt
  for (let roleID in roleMappings) {
    const roleName = roleMappings[roleID];
    const missingIDs = await knx('user').select('*').whereNotExists(knx(roleName).select('*').whereRaw(`user.ID = ${roleName}.ID`)).andWhere('Role', roleID); // whereRaw-on kívül hibásan adnak vissza adatot

    if (missingIDs.length > 0) problems.missingUsers[roleName] = missingIDs.reduce((_, cur, i) => { missingIDs[i] = cur.GID; return missingIDs }, 0);
  }

  // definiálatlan permissziók keresése a használt táblákon
  // definiálatlan mezők keresése definiált permisszió táblákon
  const usedTables = [ 'student', 'teacher' ];
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
  console.warn(`Missing permission definition for: ${problems.undeclaredPermTables.join(", ")}`);
  for (let table in problems.partialPermTables) {
    console.warn(`Partially defined ${table}: ${problems.partialPermTables[table].join(", ")} missing!`);
  }
}

export { treeifyPerms, extendMissingPermissions, checkDatabase }