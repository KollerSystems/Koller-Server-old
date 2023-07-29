import { Router } from 'express';
import { knx, roleMappings } from '../index.js';
import { classicErrorSend, filterByPermission, getPermittedFields, setupBatchRequest } from '../helpers.js';
import { isEmptyObject } from '../misc.js';

const rooms = Router({ mergeParams: false });

rooms.get('/', async (req, res, next) => {
  let data = knx('dormroom').select(getPermittedFields('dormroom', roleMappings.byID[res.locals.roleID]));

  if (['0', '1', 'female', 'male'].includes(req.query.gender)) {
    data.where('Gender', (req.query.gender.match(/\d/g)) ? req.query.gender : req.query.gender == 'female' ? 0 : 1);
  }
  if (req.query.group?.match(/[A-Z]\d+/g)) {
    data.where('Group', req.query.group);
  }

  data = await setupBatchRequest(data, req.query);
  res.header('Content-Type', 'application/json').status(200).send(data).end();

  next();
});

rooms.get('/me', async (req, res, next) => {
  const prequery = await knx('student').first('RID').where('UID', res.locals.UID); // kell lennie UIDnak, nem kell check
  let data = await knx('dormroom').first(getPermittedFields('dormroom', roleMappings.byID[res.locals.roleID])).where('RID', prequery.RID);
  const postquery = await knx('resident').select(getPermittedFields('resident', roleMappings.byID[res.locals.roleID])).where('RID', prequery.RID);
  
  data.Coresidents = postquery.filter(v => v.UID != res.locals.UID);
  const meResident = postquery.filter(v => v.UID == res.locals.UID)[0];
  for (let key in meResident)
    data[key] = meResident[key];

  res.header('Content-Type', 'application/json').status(200).send(data).end();
  next();
});

rooms.get('/:id(-?\\d+)', async (req, res, next) => {
  const data = await knx('dormroom').first('*').where('RID', req.params.id);
  if (data == undefined) return classicErrorSend(res, 404, `There is no room with the specified ID!`);

  const filteredData = filterByPermission(data, 'dormroom', roleMappings.byID[res.locals.roleID]);

  if (isEmptyObject(filteredData)) return classicErrorSend(res, 403, "Forbidden!");
  res.header('Content-Type', 'application/json').status(200).send(filteredData).end();

  next();
});

rooms.get('/:id(-?\\d+)/residents', async (req, res, next) => {
  const permittedFields = getPermittedFields('resident', roleMappings.byID[res.locals.roleID]);

  let data = knx('resident').select(permittedFields).where('RID', req.params.id);
  // data = setupBatchRequest(data, req.query);

  res.header('Content-Type', 'application/json').status(200).send(await data).end();

  next();
});

rooms.get('/:id(-?\\d+)/residents/:uid(-?\\d+)', async (req, res, next) => {
  const data = await knx('resident').first('*').where('UID', req.params.uid).where('RID', req.params.id);
  if (data == undefined) return classicErrorSend(res, 404, `There is no resident with the specified UID in the room!`);

  const filteredData = filterByPermission(data, 'resident', roleMappings.byID[res.locals.roleID]);

  if (isEmptyObject(filteredData)) return classicErrorSend(res, 403, "Forbidden!");
  res.header('Content-Type', 'application/json').status(200).send(filteredData).end();

  next();
});

export { rooms };