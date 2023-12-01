import { Router } from 'express';
import { knx, roleMappings } from '../index.js';
import { setupBatchRequest } from '../helpers/batchRequests.js';
import { classicErrorSend, getPermittedFields, filterByPermission } from '../helpers/helpers.js';
import { isEmptyObject } from '../helpers/misc.js';

const rooms = Router({ mergeParams: false });

rooms.get('/', async (req, res, next) => {
  let data = knx('dorm_room').select(getPermittedFields('dorm_room', roleMappings.byID[res.locals.roleID]));

  const fieldsPermitted = getPermittedFields('resident', roleMappings.byID[res.locals.roleID]).concat('Name');
  // fieldsPermitted.splice(fieldsPermitted.indexOf('RID'), 1);

  data = await setupBatchRequest(data, req.query, req.url, [ { 'flexible': false, 'point': 'Residents', 'callback': async parent => {
    return await knx('resident').select(fieldsPermitted).joinRaw('natural join student').where('RID', parent.RID);
  } } ]);

  res.header('Content-Type', 'application/json').status(200).send(data).end();

  next();
});

rooms.get('/me', async (req, res, next) => {
  const prequery = await knx('student').first('RID').where('UID', res.locals.UID); // kell lennie UIDnak, nem kell check
  let data = await knx('dorm_room').first(getPermittedFields('dorm_room', roleMappings.byID[res.locals.roleID])).where('RID', prequery.RID);
  const postquery = await knx('resident').select(getPermittedFields('resident', roleMappings.byID[res.locals.roleID]).concat('Name')).joinRaw('natural join student').where('RID', prequery.RID);

  data.Residents = postquery;
  data.UID = parseInt(res.locals.UID, 10);

  res.header('Content-Type', 'application/json').status(200).send(data).end();
  next();
});

rooms.get('/:id(-?\\d+)', async (req, res, next) => {
  const data = await knx('dorm_room').first('*').where('RID', req.params.id);
  if (data == undefined) return classicErrorSend(res, 404, 'There is no room with the specified ID!');


  const filteredData = filterByPermission(data, 'dorm_room', roleMappings.byID[res.locals.roleID]);
  if (isEmptyObject(filteredData)) return classicErrorSend(res, 403, 'Forbidden!');

  filteredData.Residents = await knx('resident').select(getPermittedFields('resident', roleMappings.byID[res.locals.roleID]).concat([ 'Name', 'Picture' ])).joinRaw('natural join student').where('RID', req.params.id);
  res.header('Content-Type', 'application/json').status(200).send(filteredData).end();

  next();
});

export { rooms };