import { Router } from 'express';
import { knx, permMappings, roleMappings, options } from '../index.js';
import { classicErrorSend, filterByPermission, getPermittedFields } from '../helpers.js';
import { isEmptyObject } from '../misc.js';

const users = Router({ mergeParams: false });

users.get('/me', async (req, res, next) => {
  res.header('Content-Type', 'application/json').status(200).send(await knx(roleMappings[res.locals.roleID]).first('*').where('ID', res.locals.ID)).end();
  next();
});

users.get('/:id(\\d+)', async (req, res, next) => { // regexp: /\d+/
  const user = await knx('user').first('*').where('GID', req.params.id);
  if (user == undefined) return classicErrorSend(res, 404, "There is no user with specified ID!");

  const userData = await knx(roleMappings[user.Role]).first('*').where('ID', user.ID);
  const filteredData = filterByPermission(userData, permMappings[roleMappings[user.Role]], roleMappings[res.locals.roleID]);

  if (isEmptyObject(filteredData)) return classicErrorSend(res, 403, "Forbidden!");
  res.header('Content-Type', 'application/json').status(200).send(filteredData);

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
    users = await knx(req.query.role).select(getPermittedFields(permMappings, req.query.role, roleMappings[res.locals.roleID])).limit(limit).offset(offset);
  else {
    let limitUsage = limit;
    let prevOffset = offset;
    for (let role of options.api.batchRequests.allowedRoles) { // TODO: teszt 2+ felhasználó típussal
      if (limitUsage <= 0) break;

      users = users.concat(await knx(role).select(getPermittedFields(permMappings, role, roleMappings[res.locals.roleID])).limit(limitUsage).offset(prevOffset));

      const currentCapacity = (await knx(role).select(knx.count('ID').as("rows")))[0].rows;
      const delta = (currentCapacity - prevOffset);
      limitUsage -= (limit >= delta) ? delta : limit;
      prevOffset = 0;
    }
  }

  res.header('Content-Type', 'application/json').status(200).send(users);

  next();
});

export { users };