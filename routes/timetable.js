import { Router } from 'express';
import { knx, roleMappings } from '../index.js';
import { setupBatchRequest } from '../helpers/batchRequests.js';
import { addCoalesces, classicErrorSend, getPermittedFields, selectCoalesce } from '../helpers/helpers.js';
import { deleteProperty, remove } from '../helpers/misc.js';

const timetable = Router({ mergeParams: false });

timetable.get('/', async (req, res, next) => {
  const studyGroupID = (await knx('study_group_attendees').first('GroupID').where('UID', res.locals.UID))?.GroupID;
  const userClassID = (await knx(roleMappings.byID[res.locals.roleID]).first('ClassID').where('UID', res.locals.UID)).ClassID;

  const fields = selectCoalesce([
    { 'fields': getPermittedFields('program', roleMappings.byID[res.locals.roleID], false), 'table': 'program' },
    { 'fields': getPermittedFields('mandatory_program', roleMappings.byID[res.locals.roleID], false), 'table': 'mandatory_program' },
    { 'fields': getPermittedFields('study_group_program', roleMappings.byID[res.locals.roleID], false), 'table': 'study_group_program' },
    { 'fields': remove(getPermittedFields('program_types', roleMappings.byID[res.locals.roleID], false), 'ID'), 'table': 'program_types' }
  ]);

  let query = knx('program');
  addCoalesces(query, fields.coalesces);
  query.select(...fields.selects).leftJoin('mandatory_program', 'mandatory_program.ID', 'program.ID').leftJoin('study_group_program', 'study_group_program.ID', 'program.ID').leftJoin('program_types', 'program_types.ID', 'ProgramID').where(builder => builder.where('program_types.ID', studyGroupID).orWhere('ClassID', userClassID));

  let batchTimetable = await setupBatchRequest(knx('program').distinct('Date'), req.query, req.url, {}, [
    { 'flexible': false, 'point': 'Day', 'callback': parent => {
      return parent.Date.toLocaleString('default', { weekday: 'long' });
    } },
    { 'flexible': false, 'point': 'Data', 'callback': async parent => {
      let query = knx('program');
      addCoalesces(query, fields.coalesces);
      query.select(...fields.selects).leftJoin('mandatory_program', 'mandatory_program.ID', 'program.ID').leftJoin('study_group_program', 'study_group_program.ID', 'program.ID').leftJoin('program_types', 'program_types.ID', 'ProgramID').where(builder => builder.where('program_types.ID', studyGroupID).orWhere('ClassID', userClassID)).where('program.Date', parent.Date);
      return await setupBatchRequest(query, req.query, req.url, { 'ignoreLimit': true, 'ignoreOffset': true }, [ { 'flexible': true, 'point': 'Class', 'join': [ 'ClassID', 'ID' ], 'query': { 'fields': getPermittedFields('class', roleMappings.byID[res.locals.roleID], false), 'table': 'class' } } ], { 'ClassID': undefined, 'Date': undefined });
    } }
  ]);

  const result = batchTimetable.reduce((obj, cur) => ({ ...obj, [cur.Date.toISOString()]: deleteProperty(cur, 'Date') }), {});

  res.header('Content-Type', 'application/json').status(200).send(result).end();

  next();
});

// tanár elől el van rejtve, de nem kéne elrejteni, csak nem szűrni ClassIDra
timetable.get('/mandatory', async (req, res, next) => {
  const fields = [].concat(
    getPermittedFields('mandatory_program', roleMappings.byID[res.locals.roleID], true),
    remove(getPermittedFields('program_types', roleMappings.byID[res.locals.roleID], true), 'program_types.ID'),
    remove(getPermittedFields('program', roleMappings.byID[res.locals.roleID], true), 'program.ID')
  );

  const userClassID = (await knx(roleMappings.byID[res.locals.roleID]).first('ClassID').where('UID', res.locals.UID)).ClassID;
  const query = knx('mandatory_program').select(fields).leftJoin('program', 'program.ID', 'mandatory_program.ID').leftJoin('program_types', 'program_types.ID', 'program.ProgramID').where('ClassID', userClassID);

  const mandatoryPrograms = await setupBatchRequest(query, req.query, req.url, {}, [
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
    remove(getPermittedFields('program', roleMappings.byID[res.locals.roleID], true), 'program.ID')
  );

  const query = await knx('mandatory_program').first(fields).leftJoin('program', 'program.ID', 'mandatory_program.ID').leftJoin('program_types', 'program_types.ID', 'program.ProgramID').where('mandatory_program.ID', req.params.id).where('mandatory_program.ClassID', userClass.ClassID);

  if (query == undefined) return classicErrorSend(res, 'missing_resource');

  query.Class = userClass;
  delete query.ClassID;
  delete query.Class.ClassID;

  res.header('Content-Type', 'application/json').status(200).send(query).end();

  next();
});

timetable.get('/studygroup', async (req, res, next) => {
  const fields = [].concat(
    getPermittedFields('study_group_program', roleMappings.byID[res.locals.roleID], true),
    remove(getPermittedFields('program_types', roleMappings.byID[res.locals.roleID], true), 'program_types.ID'),
    remove(getPermittedFields('program', roleMappings.byID[res.locals.roleID], true), 'program.ID')
  );

  const studyGroupID = (await knx('study_group_attendees').first('GroupID').where('UID', res.locals.UID))?.GroupID;
  const query = knx('study_group_program').select(fields).leftJoin('program', 'program.ID', 'study_group_program.ID').leftJoin('program_types', 'program_types.ID', 'program.ProgramID').where('program_types.ID', studyGroupID);

  const studyGroups = await setupBatchRequest(query, req.query, req.url);

  res.header('Content-Type', 'application/json').status(200).send(studyGroups).end();

  next();
});

timetable.get('/studygroup/:id(-?\\d+)', async (req, res, next) => {
  const fields = [].concat(
    getPermittedFields('study_group_program', roleMappings.byID[res.locals.roleID], true),
    remove(getPermittedFields('program_types', roleMappings.byID[res.locals.roleID], true), 'program_types.ID'),
    remove(getPermittedFields('program', roleMappings.byID[res.locals.roleID], true), 'program.ID')
  );

  const studyGroupID = (await knx('study_group_attendees').first('GroupID').where('UID', res.locals.UID))?.GroupID;
  const query = await knx('study_group_program').first(fields).leftJoin('program', 'program.ID', 'study_group_program.ID').leftJoin('program_types', 'program_types.ID', 'program.ProgramID').where('program_types.ID', studyGroupID).where('study_group_program.ID', req.params.id);

  if (query == undefined) return classicErrorSend(res, 'missing_resource');

  res.header('Content-Type', 'application/json').status(200).send(query).end();

  next();
});

const handletypes = async (req, res, type) => {
  const fields = getPermittedFields('program_types', roleMappings.byID[res.locals.roleID]);
  let query = knx('program_types').where('Type', type);
  if (req.params.id ?? '') {
    query.first(fields).where('ID', req.params.id);
  } else {
    query.select(fields);
    query = setupBatchRequest(query, req.query, req.url);
  }
  query = await query;

  if (query == undefined) {
    classicErrorSend(res, 'missing_resource');
    return false;
  }
  res.header('Content-Type', 'application/json').status(200).send(query).end();
  return true;
};

timetable.get('/mandatory/types', async (req, res, next) => { if (await handletypes(req, res, 1)) next(); });
timetable.get('/mandatory/types/:id(-?\\d+)', async (req, res, next) => { if (await handletypes(req, res, 1)) next(); });

timetable.get('/studygroup/types', async (req, res, next) => { if (await handletypes(req, res, 2)) next(); });
timetable.get('/studygroup/types/:id(-?\\d+)', async (req, res, next) => { if (await handletypes(req, res, 2)) next(); });

export { timetable };