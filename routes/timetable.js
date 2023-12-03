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
  const mandatoryProgramFields = getPermittedFields('mandatory_programs', roleMappings.byID[res.locals.roleID], true);
  const mandatoryProgramTypeFields = remove(getPermittedFields('mandatory_program_types', roleMappings.byID[res.locals.roleID], true), 'mandatory_program_types.ID');

  const userClassID = (await knx(roleMappings.byID[res.locals.roleID]).first('ClassID').where('UID', res.locals.UID)).ClassID;
  // const userClass = await knx('class').first('*').where('ID', userClassID);

  const query = knx('mandatory_program_types').joinRaw('NATURAL JOIN mandatory_programs');
  query.select(mandatoryProgramFields.concat(mandatoryProgramTypeFields)).where('ClassID', userClassID);

  // Nem kell, hiszen azt lehet tudni hogy a felhasználó melyik osztályba jár. // ?
  const mandatoryPrograms = await setupBatchRequest(query, req.query, req.url, [
    { 'flexible': true, 'point': 'Class', 'join': [ 'ClassID', 'ID' ], 'query': { 'fields': getPermittedFields('class', roleMappings.byID[res.locals.roleID], false), 'table': 'class' } }
  ], { 'ClassID': undefined } /* , { 'Date': q => q.whereBetween('Date', weekRange()) } */ );

  res.header('Content-Type', 'application/json').status(200).send(mandatoryPrograms).end();

  next();
});

timetable.get('/mandatory/:id(-?\\d+)', async (req, res, next) => {
  const userClassID = (await knx(roleMappings.byID[res.locals.roleID]).first('ClassID').where('UID', res.locals.UID)).ClassID;

  const permittedFields = getPermittedFields('mandatory_program_types', roleMappings.byID[res.locals.roleID]).concat(getPermittedFields('mandatory_programs', roleMappings.byID[res.locals.roleID]));
  const data = await knx('mandatory_program_types').joinRaw('NATURAL JOIN mandatory_programs').first(permittedFields).where('ID', req.params.id).where('ClassID', userClassID);

  if (data == undefined) return classicErrorSend(res, 404, 'There is no mandatory program with the specified ID!');
  res.header('Content-Type', 'application/json').status(200).send(data).end();

  next();
});

timetable.get('/mandatory/types/', async (req, res, next) => {
  const permittedFields = getPermittedFields('mandatory_program_types', roleMappings.byID[res.locals.roleID]);
  const query = knx('mandatory_program_types').select(permittedFields);

  const mandatoryProgramTypes = await setupBatchRequest(query, req.query, req.url);

  res.header('Content-Type', 'application/json').status(200).send(mandatoryProgramTypes).end();

  next();
});

timetable.get('/mandatory/types/:id(-?\\d+)', async (req, res, next) => {
  const permittedFields = getPermittedFields('mandatory_program_types', roleMappings.byID[res.locals.roleID]);
  const data = await knx('mandatory_program_types').first(permittedFields).where('TypeID', req.params.id);

  if (data == undefined) return classicErrorSend(res, 404, 'There is no mandatory program type with the specified ID!');
  res.header('Content-Type', 'application/json').status(200).send(data).end();

  next();
});

export { timetable };