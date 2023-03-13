import { Router } from 'express';
import { knx, permMappings, roleMappings,  } from '../index.js';
import { classicErrorSend, getPermitted } from '../helpers.js';
import { isEmptyObject } from '../misc.js';

const user = Router({ mergeParams: false });

user.get('/me', async (req, res, next) => {
  res.header('Content-Type', 'application/json').status(200).send(await knx(roleMappings[res.locals.roleID]).first('*').where('ID', res.locals.ID)).end();
  next();
});

// Rossz adatbázis beállításkor (pld: hiányzó mező permisszióknál vagy hiányzó role)
user.get('/:id(\\d+)', async (req, res, next) => { // regexp: /\d+/
  const user = await knx('user').first('GID', 'ID', 'Role').where('GID', req.params.id);
  if (user == undefined) return classicErrorSend(res, 404, "There is no user with specified ID!");

  const userData = await knx(roleMappings[user.Role]).first('*').where('ID', user.ID);
  const filteredData = getPermitted(userData, permMappings[roleMappings[user.Role]], roleMappings[res.locals.roleID]);

  if (isEmptyObject(filteredData)) return classicErrorSend(res, 403, "Forbidden!"); // untested
  res.header('Content-Type', 'application/json').status(200).send(filteredData);

  next();
});

export { user };