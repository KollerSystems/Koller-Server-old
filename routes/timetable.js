import { Router } from 'express';
import { knx, roleMappings } from '../index.js';
import { setupBatchRequest } from '../helpers/batchRequests.js';
import { classicErrorSend, getPermittedFields } from '../helpers/helpers.js';
import { remove } from '../helpers/misc.js';

const timetable = Router({ mergeParams: false });

timetable.get('/', async () => {
  // TODO: összefűzni az összes lekérést, órarendet csinálni belőle
});

// tanár elől el van rejtve, de nem kéne elrejteni, csak nem szűrni ClassIDra
timetable.get('/mandatory', async (req, res, next) => {
  const fields = [].concat(
    getPermittedFields('mandatory_program', roleMappings.byID[res.locals.roleID], true),
    remove(getPermittedFields('program_types', roleMappings.byID[res.locals.roleID], true), 'program_types.ID'),
    remove(getPermittedFields('program_time', roleMappings.byID[res.locals.roleID], true), 'program_time.ID')
  );

  const userClassID = (await knx(roleMappings.byID[res.locals.roleID]).first('ClassID').where('UID', res.locals.UID)).ClassID;
  const query = knx('mandatory_program').select(fields).leftJoin('program_types', 'program_types.ID', 'mandatory_program.ProgramID').leftJoin('program_time', 'program_time.ID', 'TimeID').where('ClassID', userClassID);

  const mandatoryPrograms = await setupBatchRequest(query, req.query, req.url, [
    { 'flexible': true, 'point': 'Class', 'join': [ 'ClassID', 'ID' ], 'query': { 'fields': getPermittedFields('class', roleMappings.byID[res.locals.roleID], false), 'table': 'class' } }
  ], { 'ClassID': undefined  } /* , { 'Date': q => q.whereBetween('Date', weekRange()) } */ );

  res.header('Content-Type', 'application/json').status(200).send(mandatoryPrograms).end();

  next();
});

timetable.get('/mandatory/:id(-?\\d+)', async (req, res, next) => {
  const userClass = await knx('student').first(getPermittedFields('class', roleMappings.byID[res.locals.roleID], true).concat('ClassID')).leftJoin('class', 'class.ID', 'student.ClassID').where('student.UID', res.locals.UID);

  const fields = [].concat(
    getPermittedFields('mandatory_program', roleMappings.byID[res.locals.roleID], true),
    remove(getPermittedFields('program_types', roleMappings.byID[res.locals.roleID], true), 'program_types.ID'),
    remove(getPermittedFields('program_time', roleMappings.byID[res.locals.roleID], true), 'program_time.ID')
  );

  const query = await knx('mandatory_program').first(fields).leftJoin('program_types', 'program_types.ID', 'mandatory_program.ProgramID').leftJoin('program_time', 'program_time.ID', 'TimeID').where('mandatory_program.ID', req.params.id).where('mandatory_program.ClassID', userClass.ClassID);

  if (query == undefined) return classicErrorSend(res, 'missing_resource');

  query.Class = userClass;
  delete query.ClassID;
  delete query.Class.ClassID;

  res.header('Content-Type', 'application/json').status(200).send(query).end();

  next();
});

timetable.get('/mandatory/types', async (req, res, next) => {
  const query = knx('program_types').select(getPermittedFields('program_types', roleMappings.byID[res.locals.roleID])).where('Type', 1);

  const mandatoryTypes = await setupBatchRequest(query, req.query, req.url);

  res.header('Content-Type', 'application/json').status(200).send(mandatoryTypes).end();

  next();
});

timetable.get('/mandatory/types/:id(-?\\d+)', async (req, res, next) => {
  const query = await knx('program_types').first(getPermittedFields('program_types', roleMappings.byID[res.locals.roleID])).where('Type', 1).where('ID', req.params.id);

  if (query == undefined) return classicErrorSend(res, 'missing_resource');
  res.header('Content-Type', 'application/json').status(200).send(query).end();

  next();
});

export { timetable };