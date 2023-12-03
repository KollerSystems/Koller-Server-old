import { Router } from 'express';
import { knx, roleMappings } from '../index.js';
import { getPermittedFields } from '../helpers/helpers.js';

const school = Router({ mergeParams: false });

school.get('/', async (req, res, next) => {
  let data = {};
  data.Groups = await knx('group').select(getPermittedFields('group', roleMappings.byID[res.locals.roleID])).where('Old', false);
  data.Classes = await knx('class').select(getPermittedFields('class', roleMappings.byID[res.locals.roleID])).where('Old', false);

  res.header('Content-Type', 'application/json').status(200).send(data).end();

  next();
});

export { school };