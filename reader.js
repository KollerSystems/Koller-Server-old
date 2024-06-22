import { knx, options, crossEvent } from './index.js';
import { parseJSON, isEmptyObject } from './helpers/misc.js';
// import { Buffer } from 'node:Buffer';

/**
 * Websocket kommunikáció kezelése.
 * @param {import('ws').WebSocketServer} ws A websocket szerver, amit callback paraméterként kap.
 */
function handleWebsocket(ws) {
  let authenticated = false;
  let ID = -1;

  // TODO: interval(options.json-ben meghatározott időköz) újra authentikálással, amúgy ledobni?

  let timeout = setTimeout(() => ws.close(1008), options.readerConnection.websocket.authenticationTimeout);

  ws.on('message', async data => {
    const recieved = parseJSON(data.toString());
    if (isEmptyObject(recieved)) console.error('Invalid JSON recieved on websocket connection');

    if (!authenticated && recieved.cmd != 0) {
      ws.close(1008);
      return;
    } else if (!authenticated && recieved.cmd == 0) {
      if (recieved.secret == options.readerConnection.websocket.secret && (recieved.ID != undefined)) {
        clearTimeout(timeout);
        authenticated = true;
        ID = recieved.ID;
        console.log(`Server connected to reader (${ID})!`);
      } else ws.close(1008);
      return;
    }

    // {"cmd": 1, "tag": [182, 159, 102, 105, 215, 44, 92, 224, 240, 196, 186, 192, 39, 205, 150, 28, 156, 154, 208, 111, 218, 245, 233, 50, 68, 41, 122, 100, 252, 85, 90, 122]}
    // {"cmd": 0, "secret": "pokjihgvfcdrxdctfzgv", "ID":0}
    if (recieved.cmd == 1) {
      const fetched = await knx('mifare_tags').first('*').where('Bytes', Buffer.from(recieved.tag));
      if (fetched == undefined)
        ws.send(JSON.stringify({ 'cmd': 1, 'correct': false, 'tag': recieved.tag }));
      else {
        ws.send(JSON.stringify({ 'cmd': 1, 'correct': true, 'tag': recieved.tag }));
        const lastCrossing = await knx('crossings').first('Direction', 'Time').where('UID', fetched.UID).orderBy('Time', 'desc');
        const isInside = lastCrossing?.Direction[0] || '' ? 0 : 1; // bent van-e? alapból bent van -- bement/bent van 0 - kiment/kint van 1
        crossEvent.emit('cross', { 'UID': fetched.UID, 'direction': isInside });
        await knx('crossings').insert({ 'UID': fetched.UID, 'direction': isInside });
      }
    }
  });

  ws.on('close', () => {
    if (ID != -1)
      console.log(`Connection to reader (${ID.toString()}) was closed!`);
  });

  ws.on('error', err => {
    console.error(err);
  });
}

export { handleWebsocket };