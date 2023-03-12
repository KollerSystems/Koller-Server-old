import { knx, logFileStream, options } from './index.js';
import { intoTimestamp, generateToken } from './misc.js';

/*
 * OAUTH case sensitivity ignorálása

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
*/

async function verify(authField) {
  let result = { 'ID': undefined, 'roleID': -1, 'issue': "", 'code': 0 }
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
  let authEntry = await knx.first('*').from('auth').where('access_token', bearer);
  if (!authEntry) {
    result.issue = "Invalid access token!"
    return result;
  }

  result.issue = "Access token expired.";
  if (authEntry.expired[0]) return result; // ? // ?
  if (authEntry.issued.getTime() + (authEntry.expires * 1000) < Date.now()) {
    knx('auth').where('access_token', bearer).limit(1).update('expired', 1);
    return result;
  }

  let userEntry = await knx('user').first('ID', 'Role').where('GID', authEntry.ID);

  result.code = 0;
  result.issue = "";
  result.ID = userEntry.ID;
  result.roleID = userEntry.Role;
  return result;
}
async function checkToken(req, res, next) {
  const verRes = await verify(req.get('Authorization'));
  if (verRes.code != 0) {
    classicErrorSend(res, verRes.code, verRes.issue);
    return;
  }
  res.set('Cache-Control', 'no-store');
  res.locals.ID = verRes.ID;
  res.locals.roleID = verRes.roleID
  next();
}

function handleNotFound(req, res, next) {
  if (!res.headersSent)
    res.header('Content-Type', 'application/json').status(404).send({ 'error': "Page not found!" });
  next();
}

function logRequest(req, res, next = () => { }) {
  if (
    (res.statusCode >= 200 && res.statusCode < 300) ||
    (res.statusCode == 404 && options.logging.logNotFound) ||
    (options.logging.logUnsuccessful)
  ) {
    let logLine = intoTimestamp(res.locals.incomingTime) + (options.logging.logIP ? " {" + req.ip + "} " : " ") + `${req.method} ${req.originalUrl} (${res.statusCode})`;
    if (options.logging.logConsole) console.log(logLine);
    if (options.logging.logFile != "") logFileStream.write(logLine + "\n");
  }
  next();
}


async function generateUniqueToken() {
  let accessToken = generateToken(options.authorization.tokenlength);
  let refreshToken = generateToken(options.authorization.tokenlength);

  // tokenek véletlenszerű újragenerálása amíg nem egyedi
  while (true) {
    let tokenEntry = await knx('auth').first('*').where('access_token', accessToken).orWhere('refresh_token', refreshToken);
    if (!tokenEntry) break;

    if (tokenEntry['access_token'] == accessToken) accessToken = generateToken(options.authorization.tokenlength);
    if (tokenEntry['refresh_token'] == refreshToken) refreshToken = generateToken(options.authorization.tokenlength);
    if (tokenEntry['expired'] && ((tokenEntry['issued'].getTime() + options.authorization.expiry.refreshToken * 1000) < Date.now())) {
      await knx('auth').where('access_token', tokenEntry['access_token']).delete();
      return { 'access_token': accessToken, 'refresh_token': refreshToken };
    }
  }

  return { 'access_token': accessToken, 'refresh_token': refreshToken };
}

function classicErrorSend(res, code, text) {
  res.header('Content-Type', 'application/json').status(code).send({ 'error': text }).end();
  logRequest(res.req, res);
}

function treeifyPerms(arr) {
  const tree = {};
  arr.forEach(rowData => {
    if (!(rowData.Table in tree)) tree[rowData.Table] = {};
    tree[rowData.Table][rowData.Field] = { read: {}, write: {} };
    Object.keys(rowData).slice(2).forEach(groupPermKey => { // slice(2): Table & Field kihagyása
      tree[rowData.Table][rowData.Field][groupPermKey.endsWith("Read") ? "read" : "write"][groupPermKey.match(/.+(?=Read|Write)/g)[0]] = Boolean(rowData[groupPermKey][0]);
    });
  });
  return tree;
}
async function extendMissingPermissions(permTree) {
  const columnInfo = await knx('permissions').columnInfo();
  const { Table, Field, ...permInfos } = columnInfo; // Table & Field kihagyása
  const defaultValues = { read: {}, write: {} };
  for (let permInfo in permInfos)
    defaultValues[permInfo.endsWith("Read") ? "read" : "write"][permInfo.match(/.+(?=Read|Write)/g)[0]] = (permInfos[permInfo].defaultValue == "b\'0\'" ? false : true);

  for (let table in permTree) {
    let columns = await knx(table).columnInfo();
    for (let column in columns) {
      if (column in permTree[table]) continue;
      permTree[table][column] = { ...defaultValues }
    }
  }
}

export { checkToken, handleNotFound, logRequest, generateUniqueToken, classicErrorSend, treeifyPerms, extendMissingPermissions }