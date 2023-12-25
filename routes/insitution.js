import { Router } from 'express';
import { knx, roleMappings } from '../index.js';
import { getPermittedFields, classicErrorSend } from '../helpers/helpers.js';
import { setupBatchRequest } from '../helpers/batchRequests.js';
import { remove } from '../helpers/misc.js';

const institution = Router({ mergeParams: false });

institution.get('/', async (req, res, next) => {
  // intézmény adatai
  res.header('Content-Type', 'application/json').status(200).send({}).end();
  next();
});

institution.get('/groups', async (req, res, next) => {
  const data = await knx('group').select(getPermittedFields('group', roleMappings.byID[res.locals.roleID])).where('Old', 0);
  res.header('Content-Type', 'application/json').status(200).send(data).end();

  next();
});
institution.get('/groups/:id(-?\\d+)', async (req, res, next) => {
  const data = await knx('group').first(getPermittedFields('group', roleMappings.byID[res.locals.roleID])).where('ID', req.params.id).where('Old', 0);
  if (data == undefined) return classicErrorSend(res, 'missing_resource');
  res.header('Content-Type', 'application/json').status(200).send(data).end();

  next();
});

institution.get('/classes', async (req, res, next) => {
  const data = await knx('class').select(getPermittedFields('class', roleMappings.byID[res.locals.roleID])).where('Old', 0);
  res.header('Content-Type', 'application/json').status(200).send(data).end();

  next();
});
institution.get('/classes/:id(-?\\d+)', async (req, res, next) => {
  const data = await knx('class').first(getPermittedFields('class', roleMappings.byID[res.locals.roleID])).where('ID', req.params.id).where('Old', 0);
  if (data == undefined) return classicErrorSend(res, 'missing_resource');
  res.header('Content-Type', 'application/json').status(200).send(data).end();

  next();
});

institution.get('/daytypes', async (req, res, next) => {
  const fields = [].concat(
    getPermittedFields('day_type', roleMappings.byID[res.locals.roleID], true),
    remove(getPermittedFields('day_type_names', roleMappings.byID[res.locals.roleID], false), 'ID')
  );
  let data = knx('day_type').select(fields).leftJoin('day_type_names', 'day_type_names.ID', 'TypeID');

  data = await setupBatchRequest(data, req.query, req.url, {}, [
    { 'flexible': false, 'point': 'Lessons', 'callback': async parent => {
      return await knx('lessons').select(getPermittedFields('lessons', roleMappings.byID[res.locals.roleID])).where('VersionID', parent.LessonsVersion);
    } }
  ], { 'LessonsVersion': undefined, 'TypeID': undefined });

  res.header('Content-Type', 'application/json').status(200).send(data).end();

  next();
});

institution.get('/daytypes/:id(-?\\d+)', async (req, res, next) => {
  const fields = [].concat(
    getPermittedFields('day_type', roleMappings.byID[res.locals.roleID], true),
    remove(getPermittedFields('day_type_names', roleMappings.byID[res.locals.roleID], false), 'ID')
  );
  let data = await knx('day_type').first(fields).leftJoin('day_type_names', 'day_type_names.ID', 'TypeID').where('day_type.ID', req.params.id);
  if (data == undefined) return classicErrorSend(res, 'missing_resource');
  data.Lessons = await knx('lessons').select(getPermittedFields('lessons', roleMappings.byID[res.locals.roleID])).where('VersionID', data.LessonsVersion);
  delete data.LessonsVersion;
  delete data.TypeID;

  if (data == undefined) return classicErrorSend(res, 'missing_resource');
  res.header('Content-Type', 'application/json').status(200).send(data).end();

  next();
});

export { institution };