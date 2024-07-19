import { expect } from 'chai';
import { Endpoint, cycleFunctionCall, tokens } from './endpoints.js';

const expectError = ( error, code, description ) => {
  return (body) => {
    expect(body).to.be.an('object');
    expect(body).to.have.all.keys([ 'error', 'status_code', 'error_description' ]);
    expect(body.error).to.be.eq(error);
    expect(body.status_code).to.be.eq(code);
    if (description) expect(body.error_description).to.be.eq(description);
  };
};

describe('rejection check', function () {
  /**
   * @todo limit, id paraméterek túl nagyok
   * @todo mifare feltöltött adat nagy
   */

  cycleFunctionCall((params, error) => {
    Endpoint('POST', '/oauth/token', 400, params, expectError(error, 400), { testname: error });
  },
  [ { 'username': 'Miki', 'password': 'almafa1234' }, { 'grant_type': 'password', 'username': 'Miki', 'password': 'almaisegyfa1234' }, { 'grant_type': 'password', 'username': 'Mickey', 'password': 'almafa1234' } ],
  [ 'invalid_grant', 'invalid_password', 'invalid_username' ]
  );

  cycleFunctionCall((param, missing) => {
    Endpoint('POST', '/oauth/token', 400, param, expectError('missing_credentials', 400), { testname: 'missing_credentials: ' + missing });
  },
  [ { 'grant_type': 'password', 'username': 'Miki' }, { 'grant_type': 'password', 'password': 'almafa1234' } ],
  [ 'password', 'username' ]
  );

  // Endpoint('POST', '/oauth/token', 400, '', expectError('invalid_content_type', 400), { token: null }, { 'Content-Type': 'application/xml' });

  Endpoint('POST', '/oauth/token',      400, '{', expectError('invalid_data',          400), { testname: 'invalid_data' });

  Endpoint('GET',  '/api/nonexistant',  404, '',  expectError('missing_resource',      404), { testname: 'missing_resource' });

  Endpoint('POST', 'api/users/mifare',  403, '',  expectError('missing_permissions',   403), { testname: 'missing_permissions' });

  Endpoint('GET',  '/api/users/me',     401, '',  expectError('invalid_token',         401), { testname: 'invalid_token',         token: 'madeuptokenwithanundefinedlength' });

  Endpoint('GET',  '/api/users/me',     400, '',  expectError('missing_auth_field',    400), { testname: 'missing_auth_prefix',   token: null });

  Endpoint('GET',  '/api/users/me',     400, '',  expectError('missing_bearer_prefix', 400), { testname: 'missing_bearer_prefix', token: null }, { 'Authorization': 'sometokenwithanundefinedlengthbutunprefixed' });

  Endpoint('GET',  '/api/users/me',     401, '',  expectError('token_expired',         401), { testname: 'token_expired',         token: tokens.expired });
});