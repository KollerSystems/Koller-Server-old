import { Router, json, urlencoded } from 'express';
import { conn, options } from '../index.js';
import { generateUniqueToken, classicErrorSend } from '../helpers.js';

const oauth = Router();


function standardResultObj() {
  return { 'credentialsOK': false, 'data': undefined, 'issue': "" };
}

async function passwordGrant(body) {
  const response = standardResultObj();

  if (body.username == undefined) response.issue = "Username parameter missing!"
  else if (body.password == undefined) response.issue = "Password parameter missing!";
  if (response.issue != "") return response;

  let userCredentials;
  if (/^\d+$/.test(body.username)) {
    let student = true;
    userCredentials = await conn.query(`SELECT ID FROM student WHERE OM="${body.username}"`);
    if (userCredentials.length < 1) {
      userCredentials = await conn.query(`SELECT ID FROM teacher WHERE OM="${body.username}"`);
      student = false;
    } // összevonni

    if (userCredentials.length < 1) {
      response.issue = `No user with OM: "${body.username}"!`;
      return response;
    }

    userCredentials = await conn.query(`SELECT GID FROM user WHERE ID="${userCredentials[0].ID}" AND Role=${student ? 1 : 2}`); // ha nem találja meg nem kell hiba, akkora a baj
    userCredentials = await conn.query(`SELECT * FROM login_data WHERE GID=${userCredentials[0].GID}`);
  } else {
    userCredentials = await conn.query(`SELECT * FROM login_data WHERE Username="${body.username}"`);
  }

  if (userCredentials.length < 1) {
    response.issue = `No user with username: "${body.username}"!`;
    return response;
  }

  response.data = userCredentials[0].GID;
  response.credentialsOK = userCredentials[0].Password == body.password;

  if (!response.credentialsOK) response.issue = "Incorrect password!";
  return response;
}

async function refreshGrant(body) {
  const response = standardResultObj();

  if (body['refresh_token'] == undefined) {
    response.issue = "A valid refresh token is required!";
    return response;
  }

  const tokens = await conn.query(`SELECT * FROM auth WHERE refresh_token="${body['refresh_token']}"`);
  if (tokens.length < 1) {
    response.issue = "Invalid refresh token!";
    return response;
  }

  if ((tokens[0].issued.getTime() + options.authorization.expiry.refreshToken * 1000) < Date.now()) {
    response.issue = "Refresh token expired!";
    conn.execute(`DELETE FROM auth WHERE refresh_token="${body['refresh_token']}"`);
    return response;
  }

  response.credentialsOK = true;
  response.data = tokens[0]['access_token'];
  return response;
}

const handleGrant = {
  'password': passwordGrant,
  'refresh_token': refreshGrant
}


oauth.post('/token', async (req, res) => {
  if (!("grant_type" in req.body)) {
    classicErrorSend(res, 400, "Grant type parameter missing or type not allowed!");
    return;
  };

  const grantResult = await handleGrant[req.body['grant_type']](req.body);

  if (grantResult.issue != "") {
    classicErrorSend(res, 400, grantResult.issue);
    return;
  }

  const { access_token, refresh_token } = await generateUniqueToken();
  if (req.body['grant_type'] == "refresh_token") {
    await conn.execute(`UPDATE auth SET access_token="${access_token}", refresh_token="${refresh_token}", issued=DEFAULT, expired=0 WHERE access_token="${grantResult.data}"`);
    res.header('Content-Type', 'application/json').status(200).send({
      'access_token': access_token,
      'token_type': "Bearer",
      'expires_in': options.authorization.expiry.accessToken,
      'refresh_token': refresh_token
    }).end();
  } else {
    await conn.execute(`INSERT INTO auth VALUES ("${grantResult.data}", "${access_token}", "${refresh_token}", ${options.authorization.expiry.accessToken}, DEFAULT, 0)`);
    res.header('Content-Type', 'application/json').status(200).send({
      'access_token': access_token,
      'token_type': "Bearer",
      'expires_in': options.authorization.expiry.accessToken,
      'refresh_token': refresh_token
    }).end();
  }
});

export { oauth };