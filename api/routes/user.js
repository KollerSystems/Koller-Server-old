import { Router } from 'express';
import { knx, roleMappings } from '../index.js';
import { classicErrorSend } from '../helpers.js';

const user = Router({ mergeParams: true });

user.get('/me', async (req, res) => {
  res.header('Content-Type', 'application/json').status(200).send(await knx(roleMappings[req.roleID]).first('*').where('ID', req.ID)).end();
});

export { user };