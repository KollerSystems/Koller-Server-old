import { options } from "./index.js";

function randomNum(to) { // nem inklúzív
  return Math.floor((Math.random() * to));
}

function intoTimestamp(date, asISOString = options.logging.logAsISOString) { // [yyyy-mm-dd hh:mm:ss.SSS] <-> ISO string
  return "[" + (asISOString ? date.toISOString() :
    (
      date.getFullYear() + "-"
      + [date.getMonth() + 1, date.getDate()].map(part => part.toString().padStart(2, "0")).join("-")
      + " "
      + [date.getHours(), date.getMinutes(), date.getSeconds()].map(part => part.toString().padStart(2, "0")).join(":")
      + "." + date.getMilliseconds().toString().padStart(3, "0")
    )
  ) + "]";
}

function generateToken(len) {
  const allowedCharacters = options.authorization.allowedCharacters;
  const length = allowedCharacters.length;

  let token = "";
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

export { intoTimestamp, generateToken, isEmptyObject, parseJSON }