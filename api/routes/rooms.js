import { Router } from 'express';
import { knx, permMappings, roleMappings, options } from '../index.js';
import { classicErrorSend, filterByPermission, getPermittedFields } from '../helpers.js';
import { isEmptyObject } from '../misc.js';

const rooms = Router({ mergeParams: false });

export { rooms };