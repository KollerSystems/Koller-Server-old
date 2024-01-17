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
const request = supertest(`localhost:${options.api.port}/api/rooms`);
import { expect } from 'chai';

describe('Requesting rooms with various tokens', function() {
  let testN = 0;
  let tests = [];
  beforeEach(function () {
    tests[testN] = { startT: new Date() };
  });

  afterEach(function () {
    tests[testN].time = new Date() - tests[testN++].startT;
  });
  after(async function () {
    const curTest = 'rooms';
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

    const codes = { 'fake': 401, 'teacher': 404, 'student': 200 };
    it(`${[ 'fake', 'teacher' ].includes(parameter) ? 'FAIL: ' : ''}GET /rooms/me - (${parameter})`, done => {
      request
        .get('/me')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(codes[parameter])
        .expect(res => {
          expect(res.body).to.be.an('object');
          if (parameter == 'student') {
            expect(res.body).to.have.a.property('RID', userdata.RID);
            expect(res.body).to.have.a.property('UID', userdata.UID);
            expect(res.body).to.have.a.property('Residents').which.is.an('array');
            expect(res.body).to.have.a.property('Group').which.is.an('object').that.has.keys([ 'ID', 'Group', 'Old', 'HeadTUID' ]);
            expect(res.body).to.have.a.property('Annexe').which.is.an('object').that.has.keys([ 'ID', 'Annexe', 'Gender' ]);
          } else {
            expect(res.body).to.have.all.keys(parameters.api.errorFields);
          }
        }).end(done);
    });

    if (parameter == 'fake') continue;

    it(`GET /rooms/${parameters.api.parameters.rooms.roomID} - (${parameter})`, done => {
      request
        .get(`/${parameters.api.parameters.rooms.roomID}`)
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(res => {
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.a.property('RID', parameters.api.parameters.rooms.roomID);
          expect(res.body).to.have.a.property('Residents').which.is.an('array');
          expect(res.body).to.have.a.property('Group').which.is.an('object').that.has.keys([ 'ID', 'Group', 'Old', 'HeadTUID' ]);
          expect(res.body).to.have.a.property('Annexe').which.is.an('object').that.has.keys([ 'ID', 'Annexe', 'Gender' ]);
          let RIDsOfResidents = [];
          for (let resident of res.body.Residents) RIDsOfResidents.push(typeof resident.RID);
          expect(RIDsOfResidents).to.not.have.a('number');
        }).end(done);
    });
    it(`GET /rooms/${parameters.api.parameters.all.hugeInt} - (${parameter})`, done => {
      request
        .get(`/${parameters.api.parameters.all.hugeInt}`)
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(404)
        .expect(res => {
          expect(res.body).to.have.all.keys(parameters.api.errorFields);
        }).end(done);
    });

    const setSortedAndLimitedExpectations = req => {
      req
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(res => {
          expect(res.body).to.be.an('array').and.to.have.lengthOf.at.most(2);
          expect(res.body[0].RID).to.be.at.least(res.body[1].RID);
        });

      return req;
    };

    it(`GET /rooms?sort=-{1},{2} - (${parameter})`, done => {
      setSortedAndLimitedExpectations(
        request.get('?limit=2&offset=1&sort=-RID,Group')
      ).end(done);
    });
    it(`GET /rooms?sort={1}:desc,{2}:asc - (${parameter})`, done => {
      setSortedAndLimitedExpectations(
        request.get('?limit=2&offset=1&sort=RID:desc,Group:asc')
      ).end(done);
    });
    it(`GET /rooms?sort={1},{2}&order=desc,asc - (${parameter})`, done => {
      setSortedAndLimitedExpectations(
        request.get('?limit=2&offset=1&sort=RID,Group&order=desc,asc')
      ).end(done);
    });

    const setFilteredExpectations = req => {
      req
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(200);

      return req;
    };

    it(`GET /rooms?{1}=17 - (${parameter})`, done => {
      setFilteredExpectations(
        request.get('?RID=17')
      ).expect(res => {
        expect(res.body).to.be.an('array').and.to.have.a.lengthOf(1);
        expect(res.body[0].RID).to.equal(17);
      }).end(done);
    });
    it(`GET /rooms?{1}[gt]=17 - (${parameter})`, done => {
      setFilteredExpectations(
        request.get('?RID[gt]=17&sort=RID')
      ).expect(res => {
        expect(res.body).to.be.an('array');
        expect(res.body[0].RID).to.be.above(17);
      }).end(done);
    });
    it(`GET /rooms?{1}[gte]=17 - (${parameter})`, done => {
      setFilteredExpectations(
        request.get('?RID[gte]=17&sort=RID')
      ).expect(res => {
        expect(res.body).to.be.an('array');
        expect(res.body[0].RID).to.be.equal(17);
        expect(res.body[1].RID).to.be.above(17);
      }).end(done);
    });
    it(`GET /rooms?{1}[lt]=17 - (${parameter})`, done => {
      setFilteredExpectations(
        request.get('?RID[lt]=172&sort=-RID')
      ).expect(res => {
        expect(res.body).to.be.an('array');
        expect(res.body[0].RID).to.be.below(172);
      }).end(done);
    });
    it(`GET /rooms?{1}=gt:17 - (${parameter})`, done => {
      setFilteredExpectations(
        request.get('?RID=gt:17&sort=RID')
      ).expect(res => {
        expect(res.body).to.be.an('array');
        expect(res.body[0].RID).to.be.above(17);
      }).end(done);
    });
    it(`GET /rooms?filter={1}[gt]:17 - (${parameter})`, done => {
      setFilteredExpectations(
        request.get('?filter=RID[gt]:17&sort=RID')
      ).expect(res => {
        expect(res.body).to.be.an('array');
        expect(res.body[0].RID).to.be.above(17);
      }).end(done);
    });
    it(`GET /rooms?filter={1}[lt]:0 - (${parameter})`, done => {
      setFilteredExpectations(
        request.get('?filter=RID[lt]:0')
      ).expect(res => {
        expect(res.body).to.be.an('array').that.has.a.lengthOf(0);
      }).end(done);
    });
  }
});