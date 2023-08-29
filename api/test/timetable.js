import { readFile } from 'fs/promises';
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
            expect(res.body).to.have.a.property('error');
          }
        }).end(done);
    });

    if (fail) continue;

    it(`GET /timetable/mandatory?sort=Date,Lesson - (${parameter})`, done => {
      request
        .get('/mandatory?sort=Date,Lesson')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(codes[parameter])
        .expect(res => {
          expect(res.body).to.be.an('array');
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
  }
});