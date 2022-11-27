import { options } from "./index.js";

function randomNum(to) { // nem inklúzív
  return Math.floor((Math.random() * to));
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

export { generateToken }