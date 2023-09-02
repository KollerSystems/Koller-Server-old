import { Router } from 'express';
import { knx, roleMappings } from '../index.js';
import { getPermittedFields, setupBatchRequest } from '../helpers.js';
import { remove } from '../misc.js';

const timetable = Router({ mergeParams: false });

timetable.get('/', async () => {
  // TODO: összefűzni az összes lekérést, órarendet csinálni belőle
});

timetable.get('/mandatory', async (req, res, next) => {
  const mandatoryProgramFields = getPermittedFields('mandatory_programs', roleMappings.byID[res.locals.roleID], true);
  const mandatoryProgramTypeFields = remove(getPermittedFields('mandatory_program_types', roleMappings.byID[res.locals.roleID], true), 'mandatory_program_types.ID');

  const userClassID = (await knx(roleMappings.byID[res.locals.roleID]).first('ClassID').where('UID', res.locals.UID)).ClassID;
  // const userClass = await knx('class').first('*').where('ID', userClassID);

  const query = knx('mandatory_program_types').joinRaw('NATURAL JOIN mandatory_programs');
  query.select(mandatoryProgramFields.concat(mandatoryProgramTypeFields)).where('ClassID', userClassID);

  // Nem kell, hiszen azt lehet tudni hogy a felhasználó melyik osztályba jár.
  const mandatoryPrograms = await setupBatchRequest(query, req.query/* , [ { 'mountPoint': 'Class', 'callback': async parent => {
    delete parent.ClassID;
    return userClass;
  } } ] */);

  res.header('Content-Type', 'application/json').status(200).send(mandatoryPrograms).end();

  next();
});

export { timetable };