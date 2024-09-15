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

/**
 * Endpoint callback-je ként megadható függvény. Batchrequest-et nem igénylő, "szimpla", egyértékű(ID alapú) és többértékes lekérések kezelése. Request kontextusából eldönti a kezelés menetét.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
const handleBasicRequest = async (req, res, next) => {
  const routeTranslation = {
    'groups': 'group',
    'classes': 'class',
    'annexes': 'annexe'
  };
  const splitroute = req.route.path.split('/');
  const db = routeTranslation[splitroute[1]];
  const single = splitroute.length == 3;

  let data = knx(db)[single ? 'first' : 'select'](getPermittedFields(db, res.locals.roleID));

  if (single) data.where('ID', req.params.id);
  if (db != 'annexe') data.where('Old', 0);

  data = await data;
  if (data == undefined) return classicErrorSend(res, 'missing_resource');

  res.header('Content-Type', 'application/json').status(200).send(data).end();
  next();
};

institution.get('/groups', handleBasicRequest);
institution.get('/groups/:id(-?\\d+)', handleBasicRequest);

institution.get('/classes', handleBasicRequest);
institution.get('/classes/:id(-?\\d+)', handleBasicRequest);

institution.get('/annexes', handleBasicRequest);
institution.get('/annexes/:id(-?\\d+)', handleBasicRequest);

institution.get('/daytypes', async (req, res, next) => {
  const fields = [].concat(
    getPermittedFields('day_type', res.locals.roleID, true),
    remove(getPermittedFields('day_type_names', res.locals.roleID, false), 'ID')
  );
  let data = knx('day_type').select(fields).leftJoin('day_type_names', 'day_type_names.ID', 'TypeID');

  data = await setupBatchRequest(data, req.query, req.url, {}, [
    { 'flexible': false, 'point': 'Lessons', 'callback': async parent => {
      return await knx('lessons').select(getPermittedFields('lessons', res.locals.roleID)).where('VersionID', parent.LessonsVersion);
    } }
  ], { 'LessonsVersion': undefined, 'TypeID': undefined });

  res.header('Content-Type', 'application/json').status(200).send(data).end();

  next();
});

institution.get('/daytypes/:id(-?\\d+)', async (req, res, next) => {
  const fields = [].concat(
    getPermittedFields('day_type', res.locals.roleID, true),
    remove(getPermittedFields('day_type_names', res.locals.roleID, false), 'ID')
  );
  let data = await knx('day_type').first(fields).leftJoin('day_type_names', 'day_type_names.ID', 'TypeID').where('day_type.ID', req.params.id);
  if (data == undefined) return classicErrorSend(res, 'missing_resource');
  data.Lessons = await knx('lessons').select(getPermittedFields('lessons', res.locals.roleID)).where('VersionID', data.LessonsVersion);
  delete data.LessonsVersion;
  delete data.TypeID;

  if (data == undefined) return classicErrorSend(res, 'missing_resource');
  res.header('Content-Type', 'application/json').status(200).send(data).end();

  next();
});

export { institution };
