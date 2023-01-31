import { Router } from 'express';
import { conn } from '../index.js';
import { classicErrorSend } from '../helpers.js';

const user = Router({ mergeParams: true });

user.get('/me', async (req, res) => {
  const userData = undefined;
  if (userData.length < 1) {
    classicErrorSend(res, 500, "Server couldn't find the requesting user!");
    return;
  }
  res.header('Content-Type', 'application/json').status(200).send(userData[0]).end();
});

export { user };