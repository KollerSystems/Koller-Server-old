import { options } from './index.js';
import { parseJSON, isEmptyObject } from './misc.js';

function handleWebsocket(ws) {
  let authenticated = false;
  let ID = -1;

  let timeout = setTimeout(() => ws.close(1008), options.readerConnection.websocket.authenticationTimeout);

  ws.on('message', data => {
    const recieved = parseJSON(data.toString());
    if (isEmptyObject(recieved)) console.error("Invalid JSON recieved on websocket connection");

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
  });

  ws.on('close', _ => {
    console.log(`Connection to reader (${ID == -1 ? "unidentified" : ID.toString()}) was closed!`);
  });

  ws.on('error', err => {
    console.error(err);
  });
};

export { handleWebsocket };