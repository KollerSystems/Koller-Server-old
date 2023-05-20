import { Router } from 'express';
import { knx, permMappings, roleMappings, options } from '../index.js';
import { classicErrorSend, filterByPermission, getPermittedFields } from '../helpers.js';
import { isEmptyObject } from '../misc.js';

const users = Router({ mergeParams: false });


users.post('/mifare', async (req, res, next) => { // TODO: normálisabb név a pathnak
  // 1 - b69f6669d72c5ce0f0c4bac027cd961c9c9ad06fdaf5e93244297a64fc555a7a
  const permittedFields = getPermittedFields("mifare_tags", roleMappings.byID[res.locals.roleID]);
  if (permittedFields.length == 0) return classicErrorSend(res, 403, "Forbidden!");
  if (isEmptyObject(req.body)) return classicErrorSend(res, 400, "No tag data provided!");

  const tag = await knx('mifare_tags').first(permittedFields).where("Bytes", req.body);

  if (tag == undefined) return classicErrorSend(res, 404, "No such tag found!")

  tag.Bytes = tag.Bytes.toJSON().data;
  res.header('Content-Type', 'application/json').status(200).send(tag).end();

  next();
});


const renameID = fields => {
  fields[fields.indexOf("ID")] = knx.ref('GID').as('ID'); // vagy nem is kell alias?
  return fields;
};

users.get('/me', async (req, res, next) => {
  const userdata = await knx(roleMappings.byID[res.locals.roleID]).first('*').where('ID', res.locals.ID);
  userdata.ID = parseInt(res.locals.GID);
  res.header('Content-Type', 'application/json').status(200).send(userdata).end();
  next();
});

users.get('/:id(\\d+)', async (req, res, next) => { // regexp: /\d+/
  const user = await knx('user').first('*').where('GID', req.params.id);
  if (user == undefined) return classicErrorSend(res, 404, "There is no user with specified ID!");

  const userData = await knx(roleMappings.byID[user.Role]).first('*').where('ID', user.ID);
  console.log(userData)
  const filteredData = filterByPermission(userData, roleMappings.byID[user.Role], roleMappings.byID[res.locals.roleID]);

  if (isEmptyObject(filteredData)) return classicErrorSend(res, 403, "Forbidden!");
  res.header('Content-Type', 'application/json').status(200).send(filteredData).end();

  next();
});

users.get('/', async (req, res, next) => {
  const allowedUsersRegexp = new RegExp(options.api.batchRequests.allowedRoles.reduce((str, role) => { str += (role + "|"); return str })); // regexp: /student|teacher|.../

  const limit = (()=>{
    let l = Math.abs(parseInt(req.query.limit)) || options.api.batchRequests.defaultLimit;
    return (l > options.api.batchRequests.maxLimit ? options.api.batchRequests.maxLimit : l);
  })();
  const offset = Math.abs(parseInt(req.query.offset)) || 0;

  let users = [];
  if ((req.query.role ?? "") && (req.query.role.match(allowedUsersRegexp)))
    users = await knx(req.query.role).select(renameID(getPermittedFields(req.query.role, roleMappings.byID[res.locals.roleID])))
    .joinRaw("natural join user")
    .where('role', roleMappings.byRole[req.query.role])
    .limit(limit).offset(offset);
  else {
    let limitUsage = limit;
    let prevOffset = offset;
    for (let role of options.api.batchRequests.allowedRoles) { // lehet hogy semmit nem ad vissza engedett mezőkre getpermittedfields?
      if (limitUsage <= 0) break;
      users = users.concat(await knx(role).select(renameID(getPermittedFields(role, roleMappings.byID[res.locals.roleID])))
      .joinRaw("natural join user")
      .where('role', roleMappings.byRole[role])
      .limit(limitUsage).offset(prevOffset));

      const currentCapacity = (await knx(role).select(knx.count('ID').as("rows")))[0].rows;
      const delta = (currentCapacity - prevOffset);
      limitUsage -= (limit >= delta) ? delta : limit;
      prevOffset = 0;
    }
  }

  res.header('Content-Type', 'application/json').status(200).send(users).end();

  next();
});

export { users };