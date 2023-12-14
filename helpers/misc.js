import { options } from '../index.js';

function randomNum(to) { // nem inklúzív
  return Math.floor((Math.random() * to));
}

function intoTimestamp(date, asISOString = options.logging.logAsISOString) { // [yyyy-mm-dd hh:mm:ss.SSS] <-> ISO string
  return (asISOString ? date.toISOString() :
    (
      date.getFullYear() + '-'
      + [ date.getMonth() + 1, date.getDate() ].map(part => part.toString().padStart(2, '0')).join('-')
      + ' '
      + [ date.getHours(), date.getMinutes(), date.getSeconds() ].map(part => part.toString().padStart(2, '0')).join(':')
      + '.' + date.getMilliseconds().toString().padStart(3, '0')
    )
  );
}

function generateToken(len) {
  const allowedCharacters = options.authorization.allowedCharacters;
  const length = allowedCharacters.length;

  let token = '';
  for (let i = 0; i < len; ++i) {
    let char = allowedCharacters[randomNum(length)];
    token += (randomNum(2) ? char : char.toUpperCase());
  }
  return token;
}

function isEmptyObject(obj) {
  return (Object.keys(obj).length == 0);
}

function parseJSON(json) {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function has(obj, value) {
  return (value in obj);
}
function setIfMissingKey(obj, key, defaultValue = {}) {
  if (!has(obj, key)) obj[key] = defaultValue;
}

function cmp(a, b, inv, undefinedLast, comparator) {
  if (a == undefined) return undefinedLast ? 1 : -1;
  if (b == undefined) return undefinedLast ? -1 : 1;

  if (typeof a == 'string') {
    return inv ? comparator(b, a) : comparator(a, b);
  }

  return inv ? (b-a) : (a-b);
}

function remove(array, item) {
  const i = array.indexOf(item);
  if (i > -1) array.splice(i, 1);
  return array;
}

function deleteProperty(obj, key) {
  let v = obj[key];
  delete obj[key];
  return v;
}

function tryparse(str) {
  let v = Number(str, 10);
  return isNaN(v) ? str : v;
}

function findIndecies(arr, callback) {
  let found = [];
  for (let i = 0; i < arr.length; i++) {
    if (callback(arr[i])) found.push(i);
    // console.log(arr[i], callback(arr[i]))
  }
  return found;
}

function losePrecision(datetime) {
  const dayInNum = 86400000;
  return Math.floor(datetime / dayInNum) * dayInNum;
}
function weekRange(date = (new Date()), precision = false) {
  const dayInNum = 86400000; // 24 * 60 * 60 * 1000
  const day = ( d => (d - 1 == -1) ? 6 : d - 1 )( date.getDay() );
  const startDate = (date.getTime() - day*dayInNum);
  const endDate = startDate + 6*dayInNum;
  return [ new Date(precision ? startDate : losePrecision(startDate)), new Date(precision ? endDate : losePrecision(endDate)) ];
}

export { intoTimestamp, generateToken, isEmptyObject, parseJSON, has, setIfMissingKey, cmp, remove, deleteProperty, tryparse, findIndecies, weekRange };