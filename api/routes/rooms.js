import { Router } from 'express';
import { knx, roleMappings } from '../index.js';
import { classicErrorSend, filterByPermission, getPermittedFields, setupBatchRequest } from '../helpers.js';
import { isEmptyObject } from '../misc.js';

const rooms = Router({ mergeParams: false });

rooms.get('/', async (req, res, next) => {
  let data = knx('dormroom').select(getPermittedFields('dormroom', roleMappings.byID[res.locals.roleID]));

  // TODO: setupBatchRequestben megoldani a filteringet
  if (['0', '1', 'female', 'male'].includes(req.query.Gender)) {
    data.where('Gender', (req.query.Gender.match(/\d/g)) ? req.query.Gender : req.query.Gender == 'female' ? 0 : 1);
  }
  if (req.query.Group?.match(/(L|F)\d+/g)) {
    data.where('Group', req.query.Group);
  }

  data = await setupBatchRequest(data, req.query);
  const fieldsPermitted = getPermittedFields('resident', roleMappings.byID[res.locals.roleID]).concat('Name');
  for (let i = 0; i < data.length; i++) {
    data[i].residents = await knx('resident').select(fieldsPermitted).joinRaw('natural join student').where('RID', data[i].RID);
  }
  res.header('Content-Type', 'application/json').status(200).send(data).end();

  next();
});

rooms.get('/me', async (req, res, next) => {
  const prequery = await knx('student').first('RID').where('UID', res.locals.UID); // kell lennie UIDnak, nem kell check
  let data = await knx('dormroom').first(getPermittedFields('dormroom', roleMappings.byID[res.locals.roleID])).where('RID', prequery.RID);
  const postquery = await knx('resident').select(getPermittedFields('resident', roleMappings.byID[res.locals.roleID])).where('RID', prequery.RID);

  data.residents = postquery;
  data.UID = parseInt(res.locals.UID);

  res.header('Content-Type', 'application/json').status(200).send(data).end();
  next();
});

rooms.get('/:id(-?\\d+)', async (req, res, next) => {
  const data = await knx('dormroom').first('*').where('RID', req.params.id);
  if (data == undefined) return classicErrorSend(res, 404, `There is no room with the specified ID!`);


  const filteredData = filterByPermission(data, 'dormroom', roleMappings.byID[res.locals.roleID]);
  if (isEmptyObject(filteredData)) return classicErrorSend(res, 403, "Forbidden!");

  filteredData.residents = await knx('resident').select(getPermittedFields('resident', roleMappings.byID[res.locals.roleID]).concat(['Name', 'Picture'])).joinRaw('natural join student').where('RID', req.params.id);
  res.header('Content-Type', 'application/json').status(200).send(filteredData).end();

  next();
});

export { rooms };