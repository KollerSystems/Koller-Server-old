import { Router } from 'express';
import { knx, roleMappings } from '../index.js';
import { getPermittedFields, classicErrorSend } from '../helpers/helpers.js';

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
  if (data == undefined) return classicErrorSend(res, 404, 'There is no group with specified ID!');
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
  if (data == undefined) return classicErrorSend(res, 404, 'There is no class with specified ID!');
  res.header('Content-Type', 'application/json').status(200).send(data).end();

  next();
});

export { institution };