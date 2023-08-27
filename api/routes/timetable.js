import { Router } from 'express';
import {  } from '../index.js';

const timetable = Router({ mergeParams: false });

timetable.get('/', async () => {
  // TODO: összefűzni az összes lekérést, órarendet csinálni belőle
});

timetable.get('/mandatory', async (req, res, next) => {
  next();
});

export { timetable };