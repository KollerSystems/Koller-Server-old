import { Router } from 'express';
import { knx, roleMappings } from '../index.js';
import { addCoalesces, classicErrorSend, filterByPermission, getPermittedFields, selectCoalesce, setupBatchRequest } from '../helpers.js';
import { isEmptyObject } from '../misc.js';

const users = Router({ mergeParams: false });


users.post('/mifare', async (req, res, next) => {
  if (req.get('Content-Type') != 'application/octet-stream') return classicErrorSend(res, 400, 'Invalid Content-Type used on resource!');

  const permittedFields = getPermittedFields('mifare_tags', roleMappings.byID[res.locals.roleID]);
  if (permittedFields.length == 0) return classicErrorSend(res, 403, 'Forbidden!');
  if (isEmptyObject(req.body)) return classicErrorSend(res, 400, 'No tag data provided!');

  const tag = await knx('mifare_tags').first(permittedFields).where('Bytes', req.body);

  if (tag == undefined) return classicErrorSend(res, 404, 'No such tag found!');

  tag.Bytes = tag.Bytes.toJSON().data;
  res.header('Content-Type', 'application/json').status(200).send(tag).end();

  next();
});

users.get('/me', async (req, res, next) => {
  const userdata = await knx(roleMappings.byID[res.locals.roleID]).first('*').where('UID', res.locals.UID);
  const classdata = await knx('class').first('*').where('ID', userdata.ClassID ?? -1);
  if (userdata.ClassID ?? '') userdata.Class = classdata;
  delete userdata.ClassID;
  res.header('Content-Type', 'application/json').status(200).send(userdata).end();
  next();
});

users.get('/:id(-?\\d+)', async (req, res, next) => { // regexp: /-?\d+/
  const user = await knx('user').first('*').where('UID', req.params.id);
  if (user == undefined) return classicErrorSend(res, 404, 'There is no user with specified ID!');

  const userData = await knx(roleMappings.byID[user.Role]).first('*').where('UID', user.UID);
  const filteredData = filterByPermission(userData, roleMappings.byID[user.Role], roleMappings.byID[res.locals.roleID]);
  const classdata = await knx('class').first('*').where('ID', userData.ClassID ?? -1);
  if (userData.ClassID ?? '') filteredData.Class = classdata;
  delete filteredData.ClassID;

  if (isEmptyObject(filteredData)) return classicErrorSend(res, 403, 'Forbidden!');
  res.header('Content-Type', 'application/json').status(200).send(filteredData).end();

  next();
});

users.get('/', async (req, res, next) => {
  // const allowedUsersRegexp = new RegExp(options.api.batchRequests.allowedRoles.join('|')); // regexp: /student|teacher|.../

  const fields = selectCoalesce([
    { 'fields': [ 'UID', 'Role' ], 'table': 'user' },
    { 'fields': getPermittedFields('student', roleMappings.byID[res.locals.roleID], false), 'table': 'student' },
    { 'fields': getPermittedFields('teacher', roleMappings.byID[res.locals.roleID], false), 'table': 'teacher' }
  ]);
  let query = knx('user');
  addCoalesces(query, fields.coalesces);
  query.select(...fields.selects).leftJoin('student', 'student.UID', 'user.UID').leftJoin('teacher', 'teacher.UID', 'user.UID');

  let users = await setupBatchRequest(query, req.query, req.url, [ { 'flexible': true, 'point': 'Class', 'join': [ 'ClassID', 'ID' ], 'query': { 'fields': getPermittedFields('class', roleMappings.byID[res.locals.roleID], false), 'table': 'class' } } ], { 'ClassID': undefined });
  for (let i = 0; i < users.length; i++) {
    Object.keys(users[i]).forEach((k) => users[i][k] == null && delete users[i][k]);
  }

  res.header('Content-Type', 'application/json').status(200).send(users).end();

  next();
});

export { users };