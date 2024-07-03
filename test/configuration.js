import { readFile } from 'fs/promises';
import { expect } from 'chai';
import knex from 'knex';

const parameters = JSON.parse(
  await readFile(
    new URL('./params.json', import.meta.url)
  )
);

let options;
try {
  options = JSON.parse(
    await readFile(
      new URL('../options.json', import.meta.url)
    )
  );
} catch (err) {
  options = {};
}

const knx = knex({
  client: 'mysql',
  connection: {
    ...options.databaseLoginData,
    database: 'kollegium'
  }
});

const roleMappings = (await knx('role_name').select('Role', 'Table')).reduce((map, entry) => { map[entry.Role] = entry.Table; return map; }, {});

after(() => {
  knx.destroy();
});

describe('Checking server configuration', async function() {
  it('valid JSON', () => {
    expect(options).to.be.an('object');
    expect(options).to.not.be.empty;
  });

  function type(v) {
    return (typeof v == 'object' ? (Array.isArray(v) ? 'array' : 'object') : typeof v);
  }
  function getPathDisplay(objectName, depth) {
    let str = objectName;
    for (let key of depth) str += `.${key}`;
    return str;
  }
  function getValue(obj, depth) {
    let curr = obj;
    for (let key of depth) {
      if (curr[key] == undefined) return undefined;
      curr = curr?.[key];
    }
    return curr;
  }
  function checkSpecialities(key, value, depth) {
    if (typeof value == 'number') expect(value, getPathDisplay('options', depth)).to.be.at.least(0);

    const specials = [ 'port' ];
    if (!specials.includes(key)) return;

    switch (key) {
      case 'port':
        expect(value, getPathDisplay('options', depth)).to.be.above(0).and.to.be.below(2**16);
    }
  }
  function recurseCheck(object, depth) {
    for (let key in object) {
      const currentDepth = depth.concat(key);
      const valueInTree = getValue(options, currentDepth);
      expect(valueInTree, getPathDisplay('options', currentDepth)).to.exist;
      if (type(object[key]) == 'object') {
        recurseCheck(object[key], currentDepth);
      } else {
        expect(valueInTree, getPathDisplay('options', currentDepth)).to.be.an(object[key]);
        checkSpecialities(key, valueInTree, currentDepth);
      }
    }
  }
  it('all parameters correctly set', () => {
    recurseCheck(parameters.config.tree, []);

    expect(options.api.batchRequests.maxLimit).to.be.at.least(options.api.batchRequests.defaultLimit);
    expect(options.api.port).to.not.be.equal(options.readerConnection.websocket.port);
  });

  it('existing roles in options.json', () => {
    for (let role of options.api.batchRequests.allowedRoles)
      expect(Object.values(roleMappings).includes(role), role).to.be.true;
  });

  it('database tables exist', async () => {
    for (let table of parameters.database.tables) {
      expect(await knx(table).columnInfo(), table).to.not.be.empty;
    }
  });

  it('user definitions exist', async () => {
    for (let roleID in roleMappings) {
      const roleName = roleMappings[roleID];
      const missingIDs = await knx('user').select('*').whereNotExists(knx(roleName).select('*').whereRaw(`user.UID = ${roleName}.UID`)).andWhere('Role', roleID);
      expect(missingIDs, `${roleMappings[roleID]}: ${missingIDs}`).to.be.empty;
    }
  });

  it('room definitions exist', async () => {
    const missingRIDs = await knx('dorm_room').select('*').whereNotExists(knx('resident').select('*').whereRaw('dorm_room.RID = resident.RID'));
    expect(missingRIDs, missingRIDs).to.be.empty;
  });

  // ez az alatta lévő gyorsabb, nem mélységi változata, a másik skippelhető ez NEM: a permisszió kibővítéshez kell a tábla neve
  it('permissions are declared for tables', async () => {
    for (let table of parameters.database.reqPermDefinitions) {
      expect(await knx('permissions').first('*').where('Table', table), `table: ${table}`).to.not.be.undefined;
    }
  });

  it(`permissions are declared for all fields${options.api.extendPermissions ? ' - SKIP' : ''}`, async () => {
    if (options.api.extendPermissions) return;

    for (let table of parameters.database.reqPermDefinitions) {
      const columns = Object.keys(await knx(table).columnInfo());
      for (let roleID in roleMappings) {
        for (let column of columns) {
          expect(await knx('permissions').first('*').where({ 'Table': table, 'Role': roleID, 'Field': column }), `table: ${table}; role: ${roleID}; field: ${column}`).to.not.be.undefined;
        }
      }
    }
  });

  // TODO: nem linkelt user típus(pld student nincs userben); "route access check"
});