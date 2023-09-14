import { readFile } from 'fs/promises';
import { readFileSync, writeFileSync } from 'fs';
const options = JSON.parse(
  await readFile(
    new URL('../options.json', import.meta.url)
  )
);
const parameters = JSON.parse(
  await readFile(
    new URL('./params.json', import.meta.url)
  )
);

import supertest from 'supertest';
const request = supertest(`localhost:${options.api.port}/oauth`);
import { expect } from 'chai';


describe('Getting token & refreshing it with various credentials', function () {
  let testN = 0;
  let tests = [];
  beforeEach(function () {
    tests[testN] = { startT: new Date() };
  });

  afterEach(function () {
    tests[testN].time = new Date() - tests[testN++].startT;
  });
  after(async function () {
    const curTest = 'oauth';
    const benchmark = parameters.benchmark;
    if (!benchmark.on) return;
    let file = readFileSync(benchmark.file).toString().split('\n');
    if (file[0].split(benchmark.delimiter).length == 1) {
      file[0] = [ '"test"', '"min"', '"avg"', '"max"' ].join(benchmark.delimiter);
      file.push('');
      writeFileSync(benchmark.file, file[0] + '\n');
    }
    let current = file.at(-1).split(benchmark.delimiter);
    if (current.length == 1) for (let i = 1; i < 4; i++) current.push('');

    current[0] = '"' + curTest + '"';
    current[1] = tests.sort((a, b) => a.time - b.time)[0].time;
    let sum = 0;
    tests.forEach(o => sum += o.time);
    current[2] = sum/tests.length;
    current[3] = tests.sort((a, b) => b.time - a.time)[0].time;

    current = current.join(benchmark.delimiter);
    file[file.length-1] = current;
    file = file.join('\n');
    writeFileSync(benchmark.file, file + '\n');
  });


  const user = (() => {
    for (let parameter of parameters.oauth) if (parameter.succeed) {
      return parameter.credentials;
    }
  })();
  it(`FAIL: POST /token - invalid application/json: ${user.username}`, done => {
    request
      .post('/token')
      .send(JSON.stringify(user).slice(0, 10))
      .set('Content-Type', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400)
      .expect(res => {
        expect(res.body).to.be.an('object').that.has.a.property('error');
      }).end(done);
  });

  for (let parameter of parameters.oauth) {
    let refresh_token = undefined;
    it(`${parameter.succeed ? '' : 'FAIL: '}POST /token - application/json: ${parameter.credentials.username}`, done => {
      request
        .post('/token')
        .send(parameter.credentials)
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/)
        .expect(parameter.succeed ? 200 : 400)
        .expect(res => {
          expect(res.body).to.be.an('object');
          if (parameter.succeed) {
            expect(res.body).to.have.keys('access_token', 'refresh_token', 'token_type', 'expires_in');
            refresh_token = res.body.refresh_token;
          } else expect(res.body).to.have.a.key('error');
        }).end(done);
    });

    it(`${parameter.succeed ? '' : 'FAIL: '}POST /token - application/x-www-form-urlencoded: ${parameter.credentials.username}`, done => {
      request
        .post('/token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send((new URLSearchParams(parameter.credentials)).toString())
        .expect('Content-Type', /json/)
        .expect(parameter.succeed ? 200 : 400)
        .expect(res => {
          expect(res.body).to.be.an('object');
          if (parameter.succeed)
            expect(res.body).to.have.keys('access_token', 'refresh_token', 'token_type', 'expires_in');
          else expect(res.body).to.have.a.key('error');
        }).end(done);
    });

    if (!parameter.succeed) continue;
    it('POST /token - (refresh token)', done => {
      request
        .post('/token')
        .set('Content-Type', 'application/json')
        .send({ 'grant_type': 'refresh_token', 'refresh_token': refresh_token })
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(res => {
          expect(res.body).to.be.an('object');
          expect(res.body).to.not.have.a.key('error');
          expect(res.body).to.have.keys('access_token', 'refresh_token', 'token_type', 'expires_in');
        }).end(done);
    });

    if (String(parameter.credentials.username).match(/[A-Z]/)) {
      let lowercredential = { ...parameter.credentials };
      lowercredential.username = (lowercredential.username).toLowerCase();
      it('FAIL: POST /token - (lowercase username)', done => {
        request
          .post('/token')
          .set('Content-Type', 'application/json')
          .send(lowercredential)
          .expect('Content-Type', /json/)
          .expect(400)
          .expect(res => {
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.a.key('error');
          }).end(done);
      });
    }
  }
});
