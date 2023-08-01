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
const request = supertest(`localhost:${options.api.port}/api`);
import { expect } from 'chai';


describe('Requesting users with various tokens', () => {
  for (let parameter in parameters.api.users) {
    const userdata = parameters.api.users[parameter];
    it(`${parameter != 'fake' ? '' : 'FAIL: '}GET /me - (${parameter})`, done => {
      request
        .get('/users/me')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(parameter == 'fake' ? 401 : 200)
        .expect(res => {
          expect(res.body).to.be.an('object')
          if (parameter != 'fake') {
            expect(res.body).to.not.have.a.property('error');
            expect(res.body).to.have.a.property('UID', userdata.UID);
          }
        }).end(done);
    });

    if (parameter == 'fake') continue;

    it(`GET /users/${parameters.api.parameters.user.studentID} - (${parameter})`, done => {
      request
        .get('/users/'+parameters.api.parameters.user.studentID)
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(res => {
          expect(res.body).to.be.an('object');
          expect(res.body).to.not.have.a.property('error')
          expect(res.body).to.have.a.property('UID', parameters.api.parameters.user.studentID);
          if (parameter == 'student')
            expect(res.body).to.not.have.a.property(parameters.api.parameters.user.permDifferenceOn);
          else if (parameter == 'teacher')
            expect(res.body).to.have.a.property(parameters.api.parameters.user.permDifferenceOn);
        }).end(done);
    });
    it(`GET /users/${parameters.api.parameters.user.teacherID} - (${parameter})`, done => {
      request
        .get('/users/'+parameters.api.parameters.user.teacherID)
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(res => {
          expect(res.body).to.be.an('object');
          expect(res.body).to.not.have.a.property('error')
          expect(res.body).to.have.a.property('UID', parameters.api.parameters.user.teacherID);
        }).end(done);
    });
    /*
    it(`GET /users/ - (${parameter})`, done => {
      request
        .get('/users?limit=2&offset=1&sort=-UID')
        .set('Authorization', 'Bearer ' + userdata.access_token)
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(res => {
          expect(res.body).to.be.an('array');
          expect(res.body[0].UID > res.body[1].UID).to.be.true;
        }).end(done);

    });
    */
  }
});
