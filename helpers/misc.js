import { options } from '../index.js';

/**
 * Egy véletlen számot generál.
 * @param {number} to legnagyobb szám ami kapható(exklúzív)
 * @returns {number}
 */
function randomNum(to) {
  return Math.floor((Math.random() * to));
}

/**
 * Egy timestampet generál, formáz "össze".
 * @param {Date} date dátum objektum
 * @param {boolean} asISOString ISO standard formátumú legyen-e a szám
 * @returns {string}
 */
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

/**
 * A konfigurációs fájl által megengedett karakterekből egy Bearer tokent generál.
 * @param {number} len generálandó token hossza
 * @returns {string} generált token
 */
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

/**
 * Teszteli, hogy egy objektumnak vannak-e kulcsai.
 * @param {object} obj tesztelendő objektum
 * @returns {boolean} üres-e
 */
function isEmptyObject(obj) {
  return (Object.keys(obj).length == 0);
}

/**
 * Egy JSON adatot tartalmazó string objektummá alakítása hibakezeléssel.
 * @param {string} json JSON-t tartalmazó adat
 * @returns {object} Az átalakított objektum, vagy egy üres.
 */
function parseJSON(json) {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

/**
 * Megnézi van-e egy objektumnak egy bizonyos kulcsa.
 * @param {object} obj tesztelendő objektum
 * @param {string} value kulcs neve
 * @returns {boolean} van-e
 */
function has(obj, value) {
  return (value in obj);
}
/**
 * Ha nincs egy objektumnak kulcsa, akkor beállítja neki.
 * @param {object} obj
 * @param {string} key keresendő és beállítandó kulcs neve
 * @param {*} [defaultValue = {}] beállítandó kulcs értéke
 */
function setIfMissingKey(obj, key, defaultValue = {}) {
  if (!has(obj, key)) obj[key] = defaultValue;
}

/**
 * Két szám vagy string összehasonlítása.
 * @param {*} a
 * @param {*} b
 * @param {boolean} inv fordított sorrendet használjon-e
 * @param {boolean} undefinedLast undefined értékek leghátulra kerüljenek-e(egyébként előre kerülnek)
 * @param {Intl.Collator.prototype.compare} comparator stringeket összehasonlító {Intl.Collator}
 * @returns {number} Egy pozitív vagy negatív szám, illetve 0.
 */
function cmp(a, b, inv, undefinedLast, comparator) {
  if (a == undefined) return undefinedLast ? 1 : -1;
  if (b == undefined) return undefinedLast ? -1 : 1;

  if (typeof a == 'string') {
    return inv ? comparator(b, a) : comparator(a, b);
  }

  return inv ? (b-a) : (a-b);
}

/**
 * Törli az array-ben található értéke(ke)t.
 * @param {Object[]} array amiben az értékek vannak
 * @param {Object[] | *} item törölni kívánt érték(ek)
 * @returns {Object[]} eredeti, immár módosított array paraméter
 */
function remove(array, item) {
  let items = [];
  if (item.length == undefined || typeof item != 'object') items.push(item);
  else items = item;
  for (let elem of items) {
    const i = array.indexOf(elem);
    if (i > -1) array.splice(i, 1);
  }
  return array;
}

/**
 * Törli egy objektum kulcsát.
 * @param {object} obj módosítandó objektum
 * @param {string} key törlendő kulcs neve
 * @returns {object} módosított objektum
 */
function deleteProperty(obj, key) {
  delete obj[key];
  return obj;
}

/**
 * Megpróbál átalakítani egy string-et számmá.
 * @param {string} str átalakítandó string
 * @returns {number|string} átalakított szám vagy eredeti string
 */
function tryparse(str) {
  let v = Number(str, 10);
  return isNaN(v) ? str : v;
}

/**
 * Megkeresi az összes index-et amely értékére a függvény true értéket adott vissza.
 * @param {Object[]} arr array amiben keresni fog
 * @param {arrayItemCallback} callback függvény ami eldönti keresendő-e az adott elem
 * @returns {number[]} array az index-ekkel
 * 
 * @callback arrayItemCallback
 * @param {any} item Az array eleme, melyről döntés hozandó.
 * @returns {boolean}
 */
function findIndecies(arr, callback) {
  let found = [];
  for (let i = 0; i < arr.length; i++) {
    if (callback(arr[i])) found.push(i);
    // console.log(arr[i], callback(arr[i]))
  }
  return found;
}

/**
 * Levágja az időpontról az órákat, perceket, másodperceket és milliszekundumokat.
 * @param {number} datetime Unix timestamp
 * @returns {number} módosított időpont
 */
function losePrecision(datetime) {
  const dayInNum = 86400000;
  return Math.floor(datetime / dayInNum) * dayInNum;
}
/**
 * Megadja egy dátumhoz mért hétfő és vasárnap adatait.
 * @param {Date} date számolás alapjának dátuma
 * @param {boolean} precision Hamis ha éjfélhez legyen igazítva a hét kezdő és végének dátumai.
 * @returns {Date[]} Az aktuális hét(hétfő-vasárnap) kezdő és vég dátumai.
 */
function weekRange(date = (new Date()), precision = false) {
  const dayInNum = 86400000; // 24 * 60 * 60 * 1000
  const day = ( d => (d - 1 == -1) ? 6 : d - 1 )( date.getDay() );
  const startDate = (date.getTime() - day*dayInNum);
  const endDate = startDate + 6*dayInNum;
  return [ new Date(precision ? startDate : losePrecision(startDate)), new Date(precision ? endDate : losePrecision(endDate)) ];
}

/**
 * Megszűri egy array értékeit, csak a megengedettet visszaadva.
 * @param {any[]} arr szűrt array
 * @param {any[]} allowed megengedett értékek
 * @returns {any[]} megengedett értékek
 */
function filter(arr, allowed) {
  return arr.filter(v => allowed.includes(v));
}

export { intoTimestamp, generateToken, isEmptyObject, parseJSON, has, setIfMissingKey, cmp, remove, deleteProperty, tryparse, findIndecies, weekRange, filter };