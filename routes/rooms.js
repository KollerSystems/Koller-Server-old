import { Router } from 'express';
import { knx, roleMappings } from '../index.js';
import { setupBatchRequest } from '../helpers/batchRequests.js';
import { classicErrorSend, getPermittedFields, filterByPermission } from '../helpers/helpers.js';
import { isEmptyObject } from '../helpers/misc.js';

const rooms = Router({ mergeParams: false });

rooms.get('/', async (req, res, next) => {
  let data = knx('dorm_room').select(getPermittedFields('dorm_room', roleMappings.byID[res.locals.roleID]));

  const fieldsPermitted = getPermittedFields('resident', roleMappings.byID[res.locals.roleID]).concat('Name', 'Class');
  // fieldsPermitted.splice(fieldsPermitted.indexOf('RID'), 1);

  data = await setupBatchRequest(data, req.query, req.url, {}, [
    { 'flexible': true, 'point': 'Group', 'join': [ 'GroupID', 'ID' ], 'query': { 'fields': getPermittedFields('group', roleMappings.byID[res.locals.roleID], false), 'table': 'group' } },
    { 'flexible': true, 'point': 'Annexe', 'join': [ 'AID', 'ID' ], 'query': { 'fields': getPermittedFields('annexe', roleMappings.byID[res.locals.roleID], false), 'table': 'annexe' } },
    { 'flexible': false, 'point': 'Residents', 'callback': async parent => {
      return await knx('resident').select(fieldsPermitted).joinRaw('natural join student').join('class', 'class.ID', 'student.ClassID').where('RID', parent.RID);
    } }
  ], { 'GroupID': undefined, 'AID': undefined });

  res.header('Content-Type', 'application/json').status(200).send(data).end();

  next();
});

rooms.get('/me', async (req, res, next) => {
  const prequery = await knx('student').first('RID').where('UID', res.locals.UID); // kell lennie UIDnak, nem kell check
  let data = await knx('dorm_room').first(getPermittedFields('dorm_room', roleMappings.byID[res.locals.roleID])).where('RID', prequery.RID);
  const postquery = await knx('resident').select(getPermittedFields('resident', roleMappings.byID[res.locals.roleID]).concat('Name', 'Class')).joinRaw('natural join student').join('class', 'class.ID', 'student.ClassID').where('RID', prequery.RID);

  const [ groupdata, annexdata ] = await Promise.all( [
    knx('group').first(getPermittedFields('group', roleMappings.byID[res.locals.roleID])).where('ID', data.GroupID ?? -1),
    knx('annexe').first(getPermittedFields('annexe', roleMappings.byID[res.locals.roleID])).where('ID', data.AID ?? -1)
  ] );

  if (data.GroupID ?? '') data.Group = groupdata;
  delete data.GroupID;

  if (data.AID ?? '') data.Annexe = annexdata;
  delete data.AID;

  data.Residents = postquery;
  data.UID = parseInt(res.locals.UID, 10);

  res.header('Content-Type', 'application/json').status(200).send(data).end();
  next();
});

rooms.get('/:id(-?\\d+)', async (req, res, next) => {
  const data = await knx('dorm_room').first('*').where('RID', req.params.id);
  if (data == undefined) return classicErrorSend(res, 'missing_resource');

  const filteredData = filterByPermission(data, 'dorm_room', roleMappings.byID[res.locals.roleID]);
  if (isEmptyObject(filteredData)) return classicErrorSend(res, 'missing_permissions');

  const [ groupdata, annexdata ] = await Promise.all([
    knx('group').first(getPermittedFields('group', roleMappings.byID[res.locals.roleID])).where('ID', filteredData.GroupID ?? -1),
    knx('annexe').first(getPermittedFields('annexe', roleMappings.byID[res.locals.roleID])).where('ID', filteredData.AID ?? -1)
  ]);

  if (filteredData.GroupID ?? '') filteredData.Group = groupdata;
  delete filteredData.GroupID;

  if (filteredData.AID ?? '') filteredData.Annexe = annexdata;
  delete filteredData.AID;

  filteredData.Residents = await knx('resident').select(getPermittedFields('resident', roleMappings.byID[res.locals.roleID]).concat([ 'Name', 'Picture', 'Class' ])).joinRaw('natural join student').join('class', 'class.ID', 'student.ClassID').where('RID', req.params.id);
  res.header('Content-Type', 'application/json').status(200).send(filteredData).end();

  next();
});

export { rooms };