import { Router } from 'express';
import { knx, permMappings, roleMappings, options } from '../index.js';
import { classicErrorSend, filterByPermission, getPermittedFields } from '../helpers.js';
import { isEmptyObject } from '../misc.js';

const users = Router({ mergeParams: false });


users.post('/mifare', async (req, res, next) => {
  if (req.get('Content-Type') != "application/octet-stream") return classicErrorSend(res, 400, "Invalid Content-Type used on resource!");

  const permittedFields = renameID(getPermittedFields("mifare_tags", roleMappings.byID[res.locals.roleID]));
  if (permittedFields.length == 0) return classicErrorSend(res, 403, "Forbidden!");
  if (isEmptyObject(req.body)) return classicErrorSend(res, 400, "No tag data provided!");

  const tag = await knx('mifare_tags').first(permittedFields).where("Bytes", req.body);

  if (tag == undefined) return classicErrorSend(res, 404, "No such tag found!")

  tag.Bytes = tag.Bytes.toJSON().data;
  res.header('Content-Type', 'application/json').status(200).send(tag).end();

  next();
});


const renameID = fields => {
  fields[fields.indexOf("UID")] = knx.ref('UID').as('ID');
  return fields;
};

users.get('/me', async (req, res, next) => {
  const userdata = await knx(roleMappings.byID[res.locals.roleID]).first('*').where('UID', res.locals.UID);
  userdata.ID = userdata.UID;
  delete userdata.UID;
  res.header('Content-Type', 'application/json').status(200).send(userdata).end();
  next();
});

users.get('/:id(-?\\d+)', async (req, res, next) => { // regexp: /-?\d+/
  const user = await knx('user').first('*').where('UID', req.params.id);
  if (user == undefined) return classicErrorSend(res, 404, "There is no user with specified ID!");

  const userData = await knx(roleMappings.byID[user.Role]).first('*').where('UID', user.UID);
  const filteredData = filterByPermission(userData, roleMappings.byID[user.Role], roleMappings.byID[res.locals.roleID]);

  filteredData.ID = filteredData.UID;
  delete filteredData.UID;

  if (isEmptyObject(filteredData)) return classicErrorSend(res, 403, "Forbidden!");
  res.header('Content-Type', 'application/json').status(200).send(filteredData).end();

  next();
});

users.get('/', async (req, res, next) => {
  const allowedUsersRegexp = new RegExp(options.api.batchRequests.allowedRoles.join("|")); // regexp: /student|teacher|.../

  const limit = (()=>{
    let l = Math.abs(parseInt(req.query.limit)) || options.api.batchRequests.defaultLimit;
    return (l > options.api.batchRequests.maxLimit ? options.api.batchRequests.maxLimit : l);
  })();
  const offset = Math.abs(parseInt(req.query.offset)) || 0;

  let users = [];
  if (req.query.role?.match(allowedUsersRegexp))
    users = await knx(req.query.role).select(renameID(getPermittedFields(req.query.role, roleMappings.byID[res.locals.roleID])))
    .joinRaw("natural join user")
    .where('role', roleMappings.byRole[req.query.role])
    .limit(limit).offset(offset);
  else {
    let limitRemains = limit;
    let offsetRemains = offset
    for (let role of options.api.batchRequests.allowedRoles) {
      if (limitRemains <= 0) break;

      const queried = await knx(role).select(renameID(getPermittedFields(role, roleMappings.byID[res.locals.roleID])))
        .joinRaw("natural join user")
        .where('role', roleMappings.byRole[role])
        .limit(limitRemains).offset(offsetRemains);
      users = users.concat(queried);

      const currentCapacity = (await knx(role).select(knx.count('UID').as("rows")))[0].rows;

      limitRemains -= queried.length;
      offsetRemains -= (currentCapacity - queried.length)
      if (offsetRemains < 0) offsetRemains = 0
    }
  }

  res.header('Content-Type', 'application/json').status(200).send(users).end();

  next();
});

export { users };