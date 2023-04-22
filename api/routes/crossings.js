import { Router } from 'express';
import { knx, options, crossEvent, roleMappings } from '../index.js';

const crossings = Router({ mergeParams: false });

function copyObjKeys(destObj, srcObj, key) {
  for (let k of key)
    destObj[k.toLowerCase()] = srcObj[k];
};

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

    const userFetch = await knx('user').first('ID', 'Role').where('GID', person.PID);
    const personFetch = (await knx(roleMappings.byID[userFetch.Role]).select('*').where('ID', userFetch.ID))[0];

    data.ID = person.PID;
    data.direction = person.direction;
    copyObjKeys(data, personFetch, ["Name", "Class", "Group", "School", "Picture"]);
    if (person.direction == 0) {
      const lastCrossing = await knx('crossings').first('Direction', 'Time').where('PID', person.PID).orderBy('Time', 'desc').offset(1);
      data.Tout = lastCrossing.Time;
      data.Tin = new Date();
    }

    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });
  next();
});

export { crossings };