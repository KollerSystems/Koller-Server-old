import { Router } from 'express';
import { setupBatchRequest } from '../helpers/batchRequests.js';
import { knx, options, crossEvent, roleMappings } from '../index.js';
import { isEmptyObject } from '../helpers/misc.js';

const crossings = Router({ mergeParams: false });

/**
 * Átmásolja egy objektumról a megadott értékeket egy másikra.
 * @param {object} destObj cél objektum
 * @param {object} srcObj forrás objektum
 * @param {string[]} key kulcsnevekből álló array
 */
function copyObjKeys(destObj, srcObj, key) {
  for (let k of key)
    destObj[k] = srcObj[k];
}

/**
 * Ha nincs elérhető adat 204-es státuszt küld vissza, egyébként az adatot.
 * @param {import('express').Response} res
 * @param {object[]} data lekért adat
 * @returns {void}
 */
function handleNoContent(res, data) {
  if (isEmptyObject(data))
    return res.status(204).end();
  res.status(200).send(data).end();
}

/**
 * Crossings lekérések miatt egy egyszerűsítő wrapper setupBatchRequest-hez.
 * @param {import('knex').Knex.QueryBuilder} query
 * @param {string} rawUrl Nem parse-olt querystring, /?-el.
 * @param {string[]} fields lekérendő mezőnevek
 * @param {object} where Objektum, speciális szűrésekre. Kulcsnév a szűrendő mezőnév, érték a szűrő elvárt értéke.
 * @returns {setupBatchRequest} Még nem evaluált, setupBatchRequest által képzett kérés.
 */
async function getBatchRequestData(query, rawUrl, fields, where) {
  return setupBatchRequest(knx('crossings').select(fields).where(where), query, rawUrl);
}

crossings.get('/me', async (req, res, next) => {
  const data = await getBatchRequestData(req.query, req.url, [ 'ID', 'Time', 'Direction' ], { 'UID': res.locals.UID });
  handleNoContent(res, data);

  next();
});
crossings.get('/:id(\\d+)', async (req, res, next) => { // regexp: /\d+/
  const data = await getBatchRequestData(req.query, req.url, [ 'ID', 'Time', 'Direction' ], { 'UID': req.params.id });
  handleNoContent(res, data);

  next();
});

crossings.get('/events', async (req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();
  res.write(`retry: ${options.api.SSE.clientRetryInterval}\n\n`);

  crossEvent.on('cross', async person => {
    const data = {};

    const userFetch = await knx('user').first('UID', 'Role').where('UID', person.UID);
    const personFetch = (await knx(roleMappings.byID[userFetch.Role]).select('*').where('ID', userFetch.ID))[0];

    data.ID = person.UID;
    data.Direction = person.direction;
    copyObjKeys(data, personFetch, [ 'Name', 'Class', 'Group', 'School', 'Picture' ]);
    if (person.direction == 0) {
      const lastCrossing = await knx('crossings').first('Direction', 'Time').where('UID', person.UID).orderBy('Time', 'desc').offset(1);
      data.Tout = lastCrossing.Time;
      data.Tin = new Date();
    }

    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });
  next();
});

export { crossings };