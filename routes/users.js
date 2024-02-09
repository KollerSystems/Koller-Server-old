import { Router } from 'express';
import { knx, roleMappings } from '../index.js';
import { addCoalesces, classicErrorSend, filterByPermission, getPermittedFields, selectCoalesce } from '../helpers/helpers.js';
import { setupBatchRequest } from '../helpers/batchRequests.js';
import { isEmptyObject } from '../helpers/misc.js';

const users = Router({ mergeParams: false });


users.post('/mifare', async (req, res, next) => {
  if (req.get('Content-Type') != 'application/octet-stream') return classicErrorSend(res, 400, 'Invalid Content-Type used on resource!');

  const permittedFields = getPermittedFields('mifare_tags', roleMappings.byID[res.locals.roleID]);
  if (permittedFields.length == 0) return classicErrorSend(res, 'missing_permissions');
  if (isEmptyObject(req.body)) return classicErrorSend(res, 'missing_data');

  const tag = await knx('mifare_tags').first(permittedFields).where('Bytes', req.body);

  if (tag == undefined) return classicErrorSend(res, 'missing_resource');

  tag.Bytes = tag.Bytes.toJSON().data;
  res.header('Content-Type', 'application/json').status(200).send(tag).end();

  next();
});

users.get('/me', async (req, res, next) => {
  const userdata = await knx(roleMappings.byID[res.locals.roleID]).first('*').where('UID', res.locals.UID);

  const [ rootdata, classdata, groupdata, contactdata ] = await Promise.all([
    knx('user').first(getPermittedFields('user', roleMappings.byID[res.locals.roleID])).where('UID', res.locals.UID ?? -1),
    knx('class').first(getPermittedFields('class', roleMappings.byID[res.locals.roleID])).where('ID', userdata?.ClassID ?? -1),
    knx('group').first(getPermittedFields('group', roleMappings.byID[res.locals.roleID])).where('ID', userdata?.GroupID ?? -1),
    knx('contacts').first(getPermittedFields('contacts', roleMappings.byID[res.locals.roleID])).where('ID', userdata?.ContactID ?? -1)
  ]);


  for (let key in rootdata)
    userdata[key] = rootdata[key];

  if (userdata?.ClassID ?? '') userdata.Class = classdata;
  delete userdata.ClassID;

  if (userdata?.GroupID ?? '') userdata.Group = groupdata;
  delete userdata?.GroupID;

  if (userdata?.ContactID ?? '') userdata.Contacts = await contactdata;
  delete userdata?.ContactID;

  res.header('Content-Type', 'application/json').status(200).send(userdata).end();
  next();
});

users.get('/:id(-?\\d+)', async (req, res, next) => { // regexp: /-?\d+/
  const user = await knx('user').first('*').where('UID', req.params.id);
  if (user == undefined) return classicErrorSend(res, 'missing_resource');

  const userData = await knx(roleMappings.byID[user.Role]).first('*').where('UID', user.UID);
  const filteredData = filterByPermission(userData, roleMappings.byID[user.Role], roleMappings.byID[res.locals.roleID]);

  const [ rootdata, classdata, groupdata, contactdata ] = await Promise.all([
    knx('user').first(getPermittedFields('user', roleMappings.byID[res.locals.roleID])).where('UID', res.locals.UID ?? -1),
    knx('class').first(getPermittedFields('class', roleMappings.byID[res.locals.roleID])).where('ID', userData?.ClassID ?? -1),
    knx('group').first(getPermittedFields('group', roleMappings.byID[res.locals.roleID])).where('ID', userData?.GroupID ?? -1),
    knx('contacts').first(getPermittedFields('contacts', roleMappings.byID[res.locals.roleID])).where('ID', userData?.ContactID ?? -1)
  ]);

  for (let key in rootdata)
    user[key] = rootdata[key];

  if (userData?.ClassID ?? '') filteredData.Class = classdata;
  delete filteredData.ClassID;

  if (userData?.GroupID ?? '') filteredData.Group = groupdata;
  delete filteredData.GroupID;

  if (userData?.ContactID ?? '') filteredData.Contacts = await contactdata;
  delete filteredData.ContactID;

  if (isEmptyObject(filteredData)) return classicErrorSend(res, 'missing_permissions');
  res.header('Content-Type', 'application/json').status(200).send(filteredData).end();

  next();
});

users.get('/', async (req, res, next) => {
  // const allowedUsersRegexp = new RegExp(options.api.batchRequests.allowedRoles.join('|')); // regexp: /student|teacher|.../

  const fields = selectCoalesce([
    { 'fields': getPermittedFields('user', roleMappings.byID[res.locals.roleID], false), 'table': 'user' },
    { 'fields': getPermittedFields('student', roleMappings.byID[res.locals.roleID], false), 'table': 'student' },
    { 'fields': getPermittedFields('teacher', roleMappings.byID[res.locals.roleID], false), 'table': 'teacher' }
  ]);
  let query = knx('user');
  addCoalesces(query, fields.coalesces);
  query.select(...fields.selects).leftJoin('student', 'student.UID', 'user.UID').leftJoin('teacher', 'teacher.UID', 'user.UID');


  let users = await setupBatchRequest(query, req.query, req.url, {}, [
    { 'flexible': true, 'point': 'Class', 'join': [ 'ClassID', 'ID' ], 'query': { 'fields': getPermittedFields('class', roleMappings.byID[res.locals.roleID], false), 'table': 'class' } },
    { 'flexible': true, 'point': 'Group', 'join': [ 'GroupID', 'ID' ], 'query': { 'fields': getPermittedFields('group', roleMappings.byID[res.locals.roleID], false), 'table': 'group' } },
    { 'flexible': true, 'point': 'Contacts', 'join': [ 'ContactID', 'ID' ], 'query': { 'fields': getPermittedFields('contacts', roleMappings.byID[res.locals.roleID], false), 'table': 'contacts' } }
  ], { 'ClassID': undefined, 'GroupID': undefined, 'ContactID': undefined });
  for (let i = 0; i < users.length; i++) {
    Object.keys(users[i]).forEach((k) => users[i][k] == null && delete users[i][k]);
  }

  res.header('Content-Type', 'application/json').status(200).send(users).end();

  next();
});

export { users };