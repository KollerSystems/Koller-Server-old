import { conn, options } from './index.js';
import { generateToken } from './misc.js';

function classicErrorSend(res, code, text) {
  res.header('Content-Type', 'text/plain').status(code).send(text).end();
}

function lowerCaseObjKeys(obj) {
  for (let key in obj) {
    const val = obj[key];
    delete obj[key];
    obj[key.toLowerCase()] = val;
  }
  return obj;
}
function toLowerKeys(req, res, next) {
  req.query = lowerCaseObjKeys(req.query);
  req.body = lowerCaseObjKeys(req.body);
  next();
}

async function verify(authField) {
  let result = { 'ID': undefined, 'issue': "", 'code': 0 }
  result.code = 400;
  if (authField == undefined) {
    result.issue = "Authorization header field not present!";
    return result;
  }
  if (!authField.startsWith("Bearer")) {
    result.issue = "Authorization isn't prefixed by \"Bearer\".";
    return result;
  }

  const bearer = authField.slice(7); // "Bearer " utáni karakterek
  result.code = 401;
  let authEntries = await conn.query(`SELECT * FROM auth WHERE access_token="${bearer}"`);
  if (authEntries.length < 1) {
    result.issue = "Invalid access token!"
    return result;
  }

  result.issue = "Access token expired.";
  if (authEntries[0].expired) return result;
  if (authEntries[0].issued.getTime() + (authEntries[0].expires * 1000) < Date.now()) {
    conn.execute(`UPDATE auth SET expired=1 WHERE access_token="${bearer}" LIMIT 1"`);
    return result;
  }

  result.code = 0;
  result.issue = "";
  result.ID = authEntries[0].ID;
  return result;
}
async function checkToken(req, res, next) {
  const verRes = await verify(req.get('Authorization'));
  if (verRes.code != 0) {
    classicErrorSend(res, verRes.code, verRes.issue);
    return;
  }
  req.ID = verRes.ID;
  next();
}

async function generateUniqueToken() {
  let accessToken = generateToken(options.authorization.tokenlength);
  let refreshToken = generateToken(options.authorization.tokenlength);

  // tokenek véletlenszerű újragenerálása amíg nem egyedi
  let tokens = await conn.query(`SELECT * FROM auth WHERE access_token="${accessToken}" or refresh_token="${refreshToken}"`);
  while (tokens.length >= 1) {
    if (tokens[0]['access_token'] == accessToken) accessToken = generateToken(options.authorization.tokenlength);
    if (tokens[0]['refresh_token'] == refreshToken) refreshToken = generateToken(options.authorization.tokenlength);

    // ha lejárt és 100 napja nem volt megújítva, bejegyzés törlése és tokenek elfogadása egyediként
    if (tokens[0]['expired'] && ((tokens[0]['issued'].getTime() + options.authorization.expiry.refreshToken * 1000) < Date.now())) {
      await conn.execute(`DELETE FROM auth WHERE access_token="${tokens[0]['access_token']}"`);
      return { 'access_token': accessToken, 'refresh_token': refreshToken };
    }

    tokens = await conn.query(`SELECT * FROM auth WHERE access_token="${accessToken}" or refresh_token="${refreshToken}"`);
  }

  return { 'access_token': accessToken, 'refresh_token': refreshToken };
}

export { checkToken, toLowerKeys, classicErrorSend, generateUniqueToken }