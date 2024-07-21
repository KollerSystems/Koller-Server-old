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
const request = supertest(`localhost:${options.api.port}/api/timetable`);
import { expect } from 'chai';

describe('Requesting timetables and lessons with various tokens', function() {
  let testN = 0;
  let tests = [];
  beforeEach(function () {
    tests[testN] = { startT: new Date() };
  });

  afterEach(function () {
    tests[testN].time = new Date() - tests[testN++].startT;
  });
  after(async function () {
    const curTest = 'timetable';
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
    const fail = [ 'fake', 'teacher' ].includes(parameter);
    it(`${fail ? 'FAIL: ' : ''}GET /timetable/mandatory - (${parameter})`, done => {
      request
        .get('/mandatory')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(codes[parameter])
        .expect(res => {
          expect(res.body).to.be.an(fail ? 'object' : 'array');
          if (parameter == 'student') {
            expect(res.body, 'this student does not have any programs, pick one that has').to.have.a.lengthOf.at.least(1);
            const properties = [ 'Lesson', 'Length', 'Topic', 'Date' ];
            for (let program of res.body) {
              if (program.Group ?? '') expect(program.Group).to.equal(userdata.Group);
              for (let property of properties) {
                expect(program).to.have.a.property(property);
              }
            }
          } else {
            expect(res.body).to.have.all.keys(parameters.api.errorFields);
          }
        }).end(done);
    });

    if (fail) continue;

    let ID = -1, ProgramID = -1;

    it(`GET /timetable/mandatory?sort=Date,Lesson - (${parameter})`, done => {
      request
        .get('/mandatory?sort=Date,Lesson')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(codes[parameter])
        .expect(res => {
          expect(res.body).to.be.an('array');
          ({ ID, ProgramID } = res.body[Math.floor(Math.random() * res.body.length)]);
          let prevLesson = res.body[0].Lesson;
          for (let i = 1; i < res.body.length; i++) {
            expect(Date.parse(res.body[i-1].Date)).to.be.at.most(Date.parse(res.body[i].Date));
            if (Date.parse(res.body[i-1].Date) == Date.parse(res.body[i].Date)) {
              expect(prevLesson).to.be.below(res.body[i].Lesson);
              prevLesson = res.body[i].Lesson;
            } else if (Date.parse(res.body[i-1].Date) < Date.parse(res.body[i].Date)) {
              prevLesson = -1;
              expect(prevLesson).to.be.below(res.body[i].Lesson);
            } else {
              expect(false, 'failed due to dates not being in ascending order').to.be.true;
            }
          }
        }).end(done);
    });

    const params = parameters.api.parameters.timetable;
    it(`GET /timetable/mandatory?Date=${params.failYear} - (${parameter})`, done => {
      request
        .get(`/mandatory?Date=${params.failYear}`)
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(codes[parameter])
        .expect(res => {
          expect(res.body).to.be.an('array');
          expect(res.body).to.have.a.lengthOf(0);
        }).end(done);
    });
    let yearRound = 0;
    it(`GET /timetable/mandatory?Date=${params.correctYear} - (${parameter})`, done => {
      request
        .get(`/mandatory?Date=${params.correctYear}`)
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(codes[parameter])
        .expect(res => {
          expect(res.body).to.be.an('array').and.to.have.a.lengthOf.at.least(1);
          yearRound = res.body.length;
        }).end(done);
    });
    it(`GET /timetable/mandatory?Date=${params.correctYear}-${params.correctMonth}-${params.correctDay} - (${parameter})`, done => {
      request
        .get(`/mandatory?Date=${params.correctYear}-${params.correctMonth}-${params.correctDay}`)
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(codes[parameter])
        .expect(res => {
          expect(res.body).to.be.an('array').and.to.have.a.lengthOf.at.most(yearRound);
        }).end(done);
    });

    it(`GET /timetable/mandatory/{ID} - (${parameter})`, done => {
      request
        .get(`/mandatory/${ID}`)
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(codes[parameter])
        .expect(res => {
          expect(res.body).to.be.an('object').and.to.have.keys([ 'ID', 'Type', 'ProgramID', 'Date', 'DayTypeID', 'Class', 'Lesson', 'Length', 'Topic', 'RID', 'Teacher' ]);
          expect(res.body.ID === ID);
          expect(res.body.TypeID === ProgramID);
        }).end(done);
    });
    it(`GET /timetable/mandatory/types - (${parameter})`, done => {
      request
        .get('/mandatory/types/')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(codes[parameter])
        .expect(res => {
          expect(res.body).to.be.an('array');
          if (res.body.length < 0) return;
          expect(res.body[0]).to.be.an('object').and.to.have.keys([ 'ID', 'Type', 'Topic', 'RID', 'Teacher' ]);
        }).end(done);
    });
    it(`GET /timetable/mandatory/types/{ID} - (${parameter})`, done => {
      request
        .get(`/mandatory/types/${ProgramID}`)
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(codes[parameter])
        .expect(res => {
          expect(res.body).to.be.an('object').and.to.have.keys([ 'ID', 'Type', 'Topic', 'RID', 'Teacher' ]);
          expect(res.body.TypeID === ProgramID);
        }).end(done);
    });

    it(`GET /timetable/studygroup - (${parameter})`, done => {
      request
        .get('/studygroup')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(codes[parameter])
        .expect(res => {
          expect(res.body).to.be.an('array');
          expect(res.body, 'this student does not have any programs, pick one that has').to.have.a.lengthOf.at.least(1);
          expect(res.body[0]).to.be.an('object').and.to.have.keys([ 'ID', 'Type', 'ProgramID', 'Date', 'DayTypeID', 'Lesson', 'Length', 'Topic', 'RID', 'Teacher' ]);
          expect(res.body[0].Teacher).to.be.an('object');

          ({ ID, ProgramID } = res.body[Math.floor(Math.random() * res.body.length)]);
        }).end(done);
    });
    it(`GET /timetable/studygroup/{ID} - (${parameter})`, done => {
      request
        .get(`/studygroup/${ID}`)
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(codes[parameter])
        .expect(res => {
          expect(res.body).to.be.an('object').and.to.have.keys([ 'ID', 'Type', 'ProgramID', 'Date', 'DayTypeID', 'Lesson', 'Length', 'Topic', 'RID', 'Teacher' ]);
          expect(res.body.Teacher).to.be.an('object');
        }).end(done);
    });
    it(`GET /timetable/studygroup/types - (${parameter})`, done => {
      request
        .get('/studygroup/types/')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(codes[parameter])
        .expect(res => {
          expect(res.body).to.be.an('array');
          if (res.body.length < 0) return;
          expect(res.body[0]).to.be.an('object').and.to.have.keys([ 'ID', 'Type', 'Topic', 'RID', 'Teacher' ]);
          expect(res.body[0].Teacher).to.be.an('object');
        }).end(done);
    });
    it(`GET /timetable/studygroup/types/{ID} - (${parameter})`, done => {
      request
        .get(`/studygroup/types/${ProgramID}`)
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(codes[parameter])
        .expect(res => {
          expect(res.body).to.be.an('object').and.to.have.keys([ 'ID', 'Type', 'Topic', 'RID', 'Teacher' ]);
          expect(res.body.Teacher).to.be.an('object');
          expect(res.body.TypeID === ProgramID);
        }).end(done);
    });

    it(`GET /timetable/ - (${parameter})`, done => {
      request
        .get('/')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(codes[parameter])
        .expect(res => {
          expect(res.body).to.be.an('object');
          expect(Object.keys(res.body).every(v => v.match(/\d+-\d+-\d+T\d+:\d+:\d+.\d+(Z|(\+\d+:\d+))/)), 'object keys are in ISO timestamp').to.be.true;
          for (let body of Object.values(res.body)) {
            expect(body).to.have.a.key([ 'Day', 'Data', 'DayTypeID' ]);
            expect([ 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday' ].includes(body.Day)).to.be.true;

            for (let data of body.Data) {
              const keys = [ 'ID', 'Type', 'ProgramID', 'Lesson', 'Length', 'Topic', 'RID', 'TUID' ];
              if (data.Type == 1) keys.push('Class');
              expect(data).to.be.an('object').and.to.have.keys(keys);
            }
          }
        }).end(done);
    });
  }
});