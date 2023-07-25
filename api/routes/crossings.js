import { Router } from 'express';
import { getBatchRequestData } from '../helpers.js';
import { knx, options, crossEvent, roleMappings } from '../index.js';
import { isEmptyObject } from '../misc.js';

const crossings = Router({ mergeParams: false });


function copyObjKeys(destObj, srcObj, key) {
  for (let k of key)
    destObj[k] = srcObj[k];
};

function filterAndSend(res, data) {
  if (isEmptyObject(data))
    res.status(204).end();
  else {
    for (let i in data)
      data[i].Direction = data[i].Direction[0];
    res.status(200).send(data).end();
  }
}

crossings.get('/me', async (req,res,next) => {
  const data = await getBatchRequestData(req.query, 'crossings', ['ID', 'Time', 'Direction'], { 'UID': res.locals.UID });
  filterAndSend(res, data);

  next();
});
crossings.get('/:id(\\d+)', async (req,res,next) => { // regexp: /\d+/
  const data = await getBatchRequestData(req.query, 'crossings', ['ID', 'Time', 'Direction'], { 'UID': req.params.id });
  filterAndSend(res, data);

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
    copyObjKeys(data, personFetch, ["Name", "Class", "Group", "School", "Picture"]);
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