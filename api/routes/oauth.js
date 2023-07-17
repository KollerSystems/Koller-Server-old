import { Router, json, urlencoded } from 'express';
import { knx, options } from '../index.js';
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
    userCredentials = await knx('student').first('ID', { 'isStudent': 1 }).union(knx('teacher').select('ID', 0)).where('OM', body.username);
    if (!userCredentials) {
      response.issue = `No user with OM: "${body.username}"!`;
      return response;
    }

    userCredentials = await knx('login_data').first('*').where('GID', knx('user').first('GID').where('ID', entry.ID).andWhere('Role', entry.isStudent ? 1 : 2)); // ha nem találja nem is kell hiba, akkora a baj
  } else {
    userCredentials = await knx('login_data').first('*').where('Username', body.username);
  }

  if (!userCredentials) {
    response.issue = `No user with username: "${body.username}"!`;
    return response;
  }

  response.data = userCredentials.GID;
  response.credentialsOK = userCredentials.Password == body.password;

  if (!response.credentialsOK) response.issue = "Incorrect password!";
  return response;
}

async function refreshGrant(body) {
  const response = standardResultObj();

  if (body['refresh_token'] == undefined) {
    response.issue = "A valid refresh token is required!";
    return response;
  }

  const token = await knx('auth').first('*').where('refresh_token', body['refresh_token']);
  if (!token) {
    response.issue = "Invalid refresh token!";
    return response;
  }

  if ((token.issued.getTime() + options.authorization.expiry.refreshToken * 1000) < Date.now()) {
    response.issue = "Refresh token expired!";
    knx('auth').where('refresh_token', body['refresh_token']).delete();
    return response;
  }

  response.credentialsOK = true;
  response.data = token['access_token'];
  return response;
}

const handleGrant = {
  'password': passwordGrant,
  'refresh_token': refreshGrant
}


oauth.post('/token', async (req, res, next) => {
  if (!("grant_type" in req.body) || !(req.body?.grant_type in handleGrant)) {
    classicErrorSend(res, 400, "Grant type parameter missing or type not allowed!");
    return;
  }

  const grantResult = await handleGrant[req.body.grant_type](req.body);

  if (grantResult.issue != "") {
    classicErrorSend(res, 400, grantResult.issue);
    return;
  }

  const { access_token, refresh_token } = await generateUniqueToken();
  if (req.body['grant_type'] == "refresh_token") {
    await knx('auth').where('access_token', grantResult.data).update({ 'access_token': access_token, 'refresh_token': refresh_token, 'issued': new Date(), 'expired': 0 });
    res.header('Content-Type', 'application/json').status(200).send({
      'access_token': access_token,
      'token_type': "Bearer",
      'expires_in': options.authorization.expiry.accessToken,
      'refresh_token': refresh_token
    }).end();
  } else {
    await knx('auth').insert({ 'ID': grantResult.data, 'access_token': access_token, 'refresh_token': refresh_token, 'expires': options.authorization.expiry.accessToken, 'issued': new Date(), 'expired': 0 });
    res.header('Content-Type', 'application/json').status(200).send({
      'access_token': access_token,
      'token_type': "Bearer",
      'expires_in': options.authorization.expiry.accessToken,
      'refresh_token': refresh_token
    }).end();
  }
  next()
});

export { oauth };