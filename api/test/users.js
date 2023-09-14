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
const request = supertest(`localhost:${options.api.port}/api/users`);
import { expect } from 'chai';


describe('Requesting users with various tokens', function() {
  let testN = 0;
  let tests = [];
  beforeEach(function () {
    tests[testN] = { startT: new Date() };
  });

  afterEach(function () {
    tests[testN].time = new Date() - tests[testN++].startT;
  });
  after(async function () {
    const curTest = 'users';
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


  for (let parameter in parameters.api.users) {
    const userdata = parameters.api.users[parameter];
    it(`${parameter != 'fake' ? '' : 'FAIL: '}GET /users/me - (${parameter})`, done => {
      request
        .get('/me')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(parameter == 'fake' ? 401 : 200)
        .expect(res => {
          expect(res.body).to.be.an('object');
          if (parameter != 'fake') {
            expect(res.body).to.not.have.a.property('error');
            expect(res.body).to.have.a.property('UID', userdata.UID);
          }
        }).end(done);
    });

    if (parameter == 'fake') continue;

    if (String(userdata.access_token).match(/[A-Z]/)) {
      it(`FAIL: GET /users/me - (${parameter}; lowercase token)`, done => {
        request
          .get('/me')
          .set('Authorization', 'Bearer ' + (userdata.access_token).toLowerCase())
          .expect('Content-Type', /json/)
          .expect(401)
          .expect(res => {
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.a.property('error');
          }).end(done);
      });
    }

    it(`GET /users/${parameters.api.parameters.user.studentID} - (${parameter})`, done => {
      request
        .get('/'+parameters.api.parameters.user.studentID)
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(res => {
          expect(res.body).to.be.an('object');
          expect(res.body).to.not.have.a.property('error');
          expect(res.body).to.have.a.property('UID', parameters.api.parameters.user.studentID);
          if (parameter == 'student')
            expect(res.body).to.not.have.a.property(parameters.api.parameters.user.permDifferenceOn);
          else if (parameter == 'teacher')
            expect(res.body).to.have.a.property(parameters.api.parameters.user.permDifferenceOn);
        }).end(done);
    });
    it(`GET /users/${parameters.api.parameters.user.teacherID} - (${parameter})`, done => {
      request
        .get('/'+parameters.api.parameters.user.teacherID)
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(res => {
          expect(res.body).to.be.an('object');
          expect(res.body).to.not.have.a.property('error');
          expect(res.body).to.have.a.property('UID', parameters.api.parameters.user.teacherID);
        }).end(done);
    });

    it(`GET /users?role=teacher - (${parameter})`, done => {
      request
        .get('?role=teacher&sort=GuardianPhone&nulls=last')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(res => {
          expect(res.body).to.be.an('array').and.to.have.lengthOf.at.most(options.api.batchRequests.defaultLimit);
          let GuardianPhones = [];
          for (let user of res.body) GuardianPhones.push(typeof user.GuardianPhone);
          expect(GuardianPhones).to.not.have.a('string');
        }).end(done);
    });
    it(`GET /users?offset=-${parameters.api.parameters.all.hugeInt} - (${parameter})`, done => {
      request
        .get(`?offset=${parameters.api.parameters.all.hugeInt}`)
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(res => {
          expect(res.body).to.be.an('array').which.is.empty;
        }).end(done);
    });

    const setSortedAndLimitedExpectations = req => {
      req
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(res => {
          expect(res.body).to.be.an('array').and.to.have.lengthOf.at.most(2);
          expect(res.body[0].UID).to.at.least(res.body[1].UID);
          expect(res.body[0].UID+1).to.eql(parameters.api.parameters.user.lastID);
        });

      return req;
    };

    it(`GET /users?sort=-{1},{2} - (${parameter})`, done => {
      setSortedAndLimitedExpectations(
        request.get('?limit=2&offset=1&sort=-UID,Name')
      ).end(done);
    });
    it(`GET /users?sort={1}:desc,{2}:asc - (${parameter})`, done => {
      setSortedAndLimitedExpectations(
        request.get('?limit=2&offset=1&sort=UID:desc,Name:asc')
      ).end(done);
    });
    it(`GET /users?sort={1},{2}&order=desc,asc - (${parameter})`, done => {
      setSortedAndLimitedExpectations(
        request.get('?limit=2&offset=1&sort=UID,Name&order=desc,asc')
      ).end(done);
    });

    it('GET /users?role=student&sort=Class.ID:desc', done => {
      request
        .get('?role=student&Class.ID:desc')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(res => {
          expect(res.body).to.be.an('array').and.to.have.lengthOf.at.most(options.api.batchRequests.defaultLimit);
          for (let i = 1; i < res.body.length; i++) {
            expect(res.body[i-1].Class.ID).to.be.at.most(res.body[i].Class.ID);
          }
        }).end(done);
    });
  }
});
