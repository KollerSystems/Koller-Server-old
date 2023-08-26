import { Router } from 'express';
import { knx, roleMappings, options } from '../index.js';
import { attachFilters, classicErrorSend, filterByPermission, getPermittedFields, getSelectFields, handleFilterParams, handleSortParams } from '../helpers.js';
import { isEmptyObject, cmp } from '../misc.js';

const users = Router({ mergeParams: false });


users.post('/mifare', async (req, res, next) => {
  if (req.get('Content-Type') != 'application/octet-stream') return classicErrorSend(res, 400, 'Invalid Content-Type used on resource!');

  const permittedFields = getPermittedFields('mifare_tags', roleMappings.byID[res.locals.roleID]);
  if (permittedFields.length == 0) return classicErrorSend(res, 403, 'Forbidden!');
  if (isEmptyObject(req.body)) return classicErrorSend(res, 400, 'No tag data provided!');

  const tag = await knx('mifare_tags').first(permittedFields).where('Bytes', req.body);

  if (tag == undefined) return classicErrorSend(res, 404, 'No such tag found!');

  tag.Bytes = tag.Bytes.toJSON().data;
  res.header('Content-Type', 'application/json').status(200).send(tag).end();

  next();
});

users.get('/me', async (req, res, next) => {
  const userdata = await knx(roleMappings.byID[res.locals.roleID]).first('*').where('UID', res.locals.UID);
  res.header('Content-Type', 'application/json').status(200).send(userdata).end();
  next();
});

users.get('/:id(-?\\d+)', async (req, res, next) => { // regexp: /-?\d+/
  const user = await knx('user').first('*').where('UID', req.params.id);
  if (user == undefined) return classicErrorSend(res, 404, 'There is no user with specified ID!');

  const userData = await knx(roleMappings.byID[user.Role]).first('*').where('UID', user.UID);
  const filteredData = filterByPermission(userData, roleMappings.byID[user.Role], roleMappings.byID[res.locals.roleID]);

  if (isEmptyObject(filteredData)) return classicErrorSend(res, 403, 'Forbidden!');
  res.header('Content-Type', 'application/json').status(200).send(filteredData).end();

  next();
});

users.get('/', async (req, res, next) => {
  const allowedUsersRegexp = new RegExp(options.api.batchRequests.allowedRoles.join('|')); // regexp: /student|teacher|.../

  const limit = (() => {
    let l = parseInt(req.query.limit?.match((new RegExp(`\\d{1,${options.api.maxDigits}}`, 'm'))).at(0), 10) || options.api.batchRequests.defaultLimit;
    return (l > options.api.batchRequests.maxLimit ? options.api.batchRequests.maxLimit : l);
  })();
  const offset = parseInt(req.query.offset?.match((new RegExp(`\\d{1,${options.api.maxDigits}}`, 'm'))).at(0), 10) || 0;

  let users = [];
  const filterable = [ 'UID', 'Name' ];
  if (req.query.role?.match(allowedUsersRegexp)) {
    let fields = getPermittedFields(req.query.role, roleMappings.byID[res.locals.roleID]);
    let query = knx(req.query.role).select(fields)
      .joinRaw('natural join user')
      .where('role', roleMappings.byRole[req.query.role])
      .orderBy(handleSortParams(req.query, fields))
      .limit(limit).offset(offset);
    attachFilters(query, handleFilterParams(req.query, fields));
    users = await query;
  } else {
    if (req.query.sort ?? '') {
      let nullsLast = true;
      if (req.query.nulls == 'first') nullsLast = false;

      let globalsorts = [];
      for (let role of options.api.batchRequests.allowedRoles) {
        let rolequery = knx(role).select(getPermittedFields(role, roleMappings.byID[res.locals.roleID])).limit(limit+offset);
        let sorts = handleSortParams(req.query, getSelectFields(rolequery));
        globalsorts = globalsorts.concat(sorts);
        attachFilters(rolequery, handleFilterParams(req.query, filterable));
        rolequery = await rolequery.orderBy(sorts);
        users = users.concat(rolequery);
      }

      let collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
      users = users.sort((a, b) => {
        let v = 0;
        for (let sort of globalsorts) {
          v = v || cmp(a[sort.column], b[sort.column], sort.order == 'desc', nullsLast, collator.compare);
        }
        return v;
      }).slice(offset, limit+offset);
    } else {
      let limitRemains = limit;
      let offsetRemains = offset;
      for (let role of options.api.batchRequests.allowedRoles) {
        if (limitRemains <= 0) break;

        let query = knx(role).select(getPermittedFields(role, roleMappings.byID[res.locals.roleID]))
          .joinRaw('natural join user')
          .where('role', roleMappings.byRole[role])
          .limit(limitRemains).offset(offsetRemains);
        query = await attachFilters(query, handleFilterParams(req.query, filterable));
        users = users.concat(query);

        const currentCapacity = (await knx(role).select(knx.count('UID').as('rows')))[0].rows;

        limitRemains -= query.length;
        offsetRemains -= (currentCapacity - query.length);
        if (offsetRemains < 0) offsetRemains = 0;
      }
    }
  }

  res.header('Content-Type', 'application/json').status(200).send(users).end();

  next();
});

export { users };