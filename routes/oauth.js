import { Router } from 'express';
import { knx, options } from '../index.js';
import { generateUniqueToken, classicErrorSend } from '../helpers/helpers.js';

const oauth = Router();


function standardResultObj() {
  return { 'credentialsOK': false, 'data': undefined };
}

async function passwordGrant(body) {
  const response = standardResultObj();

  if ([ body.username, body.password ].includes(undefined)) return 'missing_credentials';

  let userCredentials;
  if (/^\d+$/.test(body.username)) {
    userCredentials = await knx.union([ knx('student').first('user.UID', { 'isStudent': 1 }).where('OM', body.username).leftJoin('user', 'user.UID', 'student.UID'), knx('teacher').first('user.UID', 0).where('OM', body.username).leftJoin('user', 'user.UID', 'teacher.UID') ], true);
    if (!userCredentials || userCredentials.length == 0) return 'invalid_username';

    userCredentials = await knx('login_data').first('*').where('UID', userCredentials[0].UID);
  } else {
    userCredentials = await knx('login_data').first('*').where('Username', body.username);
  }

  if (!userCredentials)
    return 'invalid_username';

  response.data = userCredentials.UID;
  response.credentialsOK = userCredentials.Password == body.password;

  if (!response.credentialsOK) return 'invalid_password';
  return response;
}

async function refreshGrant(body) {
  const response = standardResultObj();

  if (body['refresh_token'] == undefined)
    return 'invalid_token';

  const token = await knx('auth').first('*').where('refresh_token', body['refresh_token']);
  if (!token)
    return 'invalid_token';

  if ((token.issued.getTime() + options.authorization.expiry.refreshToken * 1000) < Date.now()) {
    knx('auth').where('refresh_token', body['refresh_token']).delete();
    return 'token_expired';
  }

  response.credentialsOK = true;
  response.data = token['access_token'];
  return response;
}

const handleGrant = {
  'password': passwordGrant,
  'refresh_token': refreshGrant
};


oauth.post('/token', async (req, res, next) => {
  if (!('grant_type' in req.body) || !(req.body?.grant_type in handleGrant)) {
    classicErrorSend(res, 'invalid_grant');
    return;
  }

  const grantResult = await handleGrant[req.body.grant_type](req.body);

  if (typeof grantResult == 'string') {
    return classicErrorSend(res, grantResult);
  }

  const { access_token, refresh_token } = await generateUniqueToken();
  if (req.body['grant_type'] == 'refresh_token') {
    await knx('auth').where('access_token', grantResult.data).update({ access_token, refresh_token, 'issued': new Date(), 'expired': 0 });
    res.header('Content-Type', 'application/json').status(200).send({
      access_token,
      'token_type': 'Bearer',
      'expires_in': options.authorization.expiry.accessToken,
      refresh_token
    }).end();
  } else {
    await knx('auth').insert({ 'UID': grantResult.data, access_token, refresh_token, 'expires': options.authorization.expiry.accessToken, 'issued': new Date(), 'expired': 0 });
    res.header('Content-Type', 'application/json').status(200).send({
      access_token,
      'token_type': 'Bearer',
      'expires_in': options.authorization.expiry.accessToken,
      refresh_token
    }).end();
  }
  next();
});

export { oauth };
