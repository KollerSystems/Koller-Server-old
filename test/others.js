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
let request = supertest(`localhost:${options.api.port}/api/`);
import { expect } from 'chai';


describe('Requesting various endpoints', function () {
  let testN = 0;
  let tests = [];
  beforeEach(function () {
    tests[testN] = { startT: new Date() };
  });

  afterEach(function () {
    tests[testN].time = new Date() - tests[testN++].startT;
  });
  after(async function () {
    const curTest = 'others';
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

    const codes = { 'fake': 401, 'teacher': 200, 'student': 200 };
    it(`${[ 'fake' ].includes(parameter) ? 'FAIL: ' : ''}GET /institution - (${parameter})`, done => {
      request
        .get('/institution')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(codes[parameter])
        .expect(res => {
          expect(res.body).to.be.an('object');
          if (parameter != 'fake') {
            expect(res.body).to.be.an('object').and.not.to.have.a.property('error');
          } else {
            expect(res.body).to.have.all.keys(parameters.api.errorFields);
          }
        }).end(done);
    });

    if (parameter == 'fake') continue;

    it(`${[ 'fake' ].includes(parameter) ? 'FAIL: ' : ''}GET /institution - (${parameter})`, done => {
      request
        .get('/institution')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(codes[parameter])
        .expect(res => {
          expect(res.body).to.be.an('object');
          if (parameter != 'fake') {
            expect(res.body).to.be.an('object').and.not.to.have.a.property('error');
          } else {
            expect(res.body).to.have.all.keys(parameters.api.errorFields);
          }
        }).end(done);
    });

    it(`GET /anything - (${parameter})`, done => {
      request
        .get('/anything')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(404).expect(res => {
          expect(res.body).to.be.an('object').that.has.all.keys([ 'error', 'error_description', 'status_code' ]);
          expect(res.body.error).to.be.equal('missing_resource');
        }).end(done);
    });

    it(`GET /institution/groups - (${parameter})`, done => {
      request
        .get('/institution/groups')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(200).expect(res => {
          expect(res.body).to.be.an('array');
        }).end(done);
    });
    it(`GET /institution/groups/{ID} - (${parameter})`, done => {
      request
        .get('/institution/groups/' + parameters.api.parameters.others.institution.groupID)
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(200).expect(res => {
          expect(res.body).to.be.an('object');
          expect(res.body.ID).to.equal(parameters.api.parameters.others.institution.groupID);
        }).end(done);
    });

    it(`GET /institution/classes - (${parameter})`, done => {
      request
        .get('/institution/classes')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(200).expect(res => {
          expect(res.body).to.be.an('array');
        }).end(done);
    });
    it(`GET /institution/classes/{ID} - (${parameter})`, done => {
      request
        .get('/institution/classes/' + parameters.api.parameters.others.institution.classID)
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(200).expect(res => {
          expect(res.body).to.be.an('object');
          expect(res.body.ID).to.equal(parameters.api.parameters.others.institution.classID);
        }).end(done);
    });

    it(`GET /institution/daytypes/ - (${parameter})`, done => {
      request
        .get('/institution/daytypes/')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(200).expect(res => {
          expect(res.body).to.be.an('array');
          expect(res.body[0]).to.have.keys([ 'ID', 'DayStart', 'RoomRating', 'MiddayAttendance', 'DayArrival', 'NightArrivalRed', 'NightArrivalYellow', 'NightEnd', 'EveningAttendance', 'BreakfastStart', 'BreakfastEnd', 'DinnerStart', 'DinnerEnd', 'SupperStart', 'SupperEnd', 'ActiveOn', 'DayName', 'Lessons' ]);
          expect(res.body[0].Lessons).to.be.an('array');
          expect(res.body[0].Lessons[0]).to.have.keys([ 'VersionID', 'LessonNum', 'StartTime', 'EndTime' ]);
        }).end(done);
    });
    it(`GET /institution/daytypes/{ID} - (${parameter})`, done => {
      request
        .get('/institution/daytypes/' + parameters.api.parameters.others.institution.dayTypeID)
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(200).expect(res => {
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys([ 'ID', 'DayStart', 'RoomRating', 'MiddayAttendance', 'DayArrival', 'NightArrivalRed', 'NightArrivalYellow', 'NightEnd', 'EveningAttendance', 'BreakfastStart', 'BreakfastEnd', 'DinnerStart', 'DinnerEnd', 'SupperStart', 'SupperEnd', 'ActiveOn', 'DayName', 'Lessons' ]);
          expect(res.body.Lessons).to.be.an('array');
          expect(res.body.Lessons[0]).to.have.keys([ 'VersionID', 'LessonNum', 'StartTime', 'EndTime' ]);
        }).end(done);
    });
  }
});
