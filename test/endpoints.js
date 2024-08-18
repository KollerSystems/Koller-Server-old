import { readFile } from 'fs/promises';
const options = JSON.parse(
  await readFile(
    new URL('../options.json', import.meta.url)
  )
);

import supertest from 'supertest';
const request = supertest(`localhost:${options.api.port}/`);
import { expect } from 'chai';


Date.prototype.addDays = function (days) {
  this.setDate(this.getDate() + days);
  return this;
};

const tokens = {
  default: 'P8kj-8K7kJM-hT9RQDUH8L-v..01.yy2',
  refresh: 'VZ7R0ChS93Sr46y7lXYQUSnb0A7Np/ZT',
  teacher: 'Anca577M3u.~un7z~j9pj3/67rsF/~/3',
  expired: '/2.L//Rht/sbad/k5txuP93vdskDdXu2'
};
/**
 * @typedef {object} configObj
 * @property {string=} testname
 * @property {boolean} paramtest
 * @property {string | null} token
 * 
 * @param {'GET'|'POST'} method
 * @param {string} endpoint
 * @param {number} status
 * @param {object} parameters
 * @param {object} additionalExpectations
 * @param {configObj} config
 * @param {object} additionalSettings
 * 
 * @callback expectationCallback
 * @param {object}
 */
function Endpoint(method, endpoint, status, parameters, expectationCallback, config = {}, additionalSettings = {}) {
  if (endpoint.startsWith('/')) endpoint = endpoint.slice(1);
  if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);

  if (!(parameters instanceof Array)) parameters = [ parameters ];

  for (let parameter of parameters) {
    let testname = config.testname || ('/' + endpoint.replace(/\d+/g, ':id') + '/');
    if (config.paramtest && method == 'GET') testname = '?' + parameter;

    it(testname, done => {
      let rq = request;

      if (method == 'GET')
        rq = rq.get(endpoint + '?' + parameter);
      else {
        rq = rq.post(endpoint);
        if (parameter != undefined)
          rq = rq.send(parameter);
      }

      for (let key in additionalSettings)
        rq = rq.set(key, additionalSettings[key]);
      if (!('Content-Type' in additionalSettings))
        rq = rq.set('Content-Type', 'application/json');

      if (config.token !== null)
        rq = rq.set('Authorization', 'Bearer ' + (config.token || tokens.default));

      rq = rq.expect('Content-Type', /json/)
        .expect(status)
        .expect(res => {
          expectationCallback(res?.body);
        });

      rq.end(done);
    });
  }
}

function cycleFunctionCall(callback, ...valuesArr) {
  const maxLength = Math.max.apply(Math, valuesArr.map(arr => arr.length));
  for (let i = 0; i < maxLength; i++)
    callback(...valuesArr.map(arr => arr?.[i]));
}

describe('endpoint integrity testing', function () {
  // /oauth/token/ //
  // TODO: username mint OM

  Endpoint('POST', '/oauth/token', 200, {
    'grant_type': 'password',
    'username': 'Miki',
    'password': 'almafa1234'
  }, body => {
    expect(body).to.have.all.keys([ 'access_token', 'token_type', 'expires_in', 'refresh_token' ]);
  }, { token: null });

  Endpoint('POST', '/oauth/token', 200, {
    'grant_type': 'refresh_token',
    'refresh_token': tokens.refresh
  }, body => {
    expect(body).to.have.all.keys([ 'access_token', 'token_type', 'expires_in', 'refresh_token' ]);
  }, { token: null });

  // /api/users/ //

  Endpoint('GET', '/api/users', 200, '', body => {
    for (let user of body) {
      if (user.Role == 2)
        expect(user).to.have.all.keys([ 'UID', 'Name', 'Gender', 'Role', 'PID' ]);
      else {
        expect(user).to.contain.all.keys([ 'UID', 'Name', 'Gender', 'Role', 'School', 'RID', 'Class', 'Group' ]);
        expect(user).to.not.contain.any.keys([ 'GuardianName', 'GuardianPhone' ]);
        expect(user.Class).to.have.all.keys([ 'ID', 'Class', 'Old' ]);
        expect(user.Group).to.have.all.keys([ 'ID', 'Group', 'Old', 'HeadTUID' ]);
      }
    }
  });
  Endpoint('GET', '/api/users', 200, '', body => {
    for (let user of body) {
      if (user.Role == 2)
        expect(user).to.have.all.keys([ 'UID', 'Name', 'Gender', 'Role', 'PID' ]);
      else {
        expect(user).to.contain.all.keys([ 'UID', 'Name', 'Gender', 'Role', 'School', 'RID', 'Class', 'Group', 'GuardianName', 'GuardianPhone' ]);
        expect(user.Class).to.have.all.keys([ 'ID', 'Class', 'Old' ]);
        expect(user.Group).to.have.all.keys([ 'ID', 'Group', 'Old', 'HeadTUID' ]);
      }
    }
  }, { token: tokens.teacher });

  Endpoint('GET', '/api/users/me', 200, '', body => {
    expect(body).to.have.all.keys([ 'UID', 'School', 'Birthplace', 'Birthdate', 'GuardianName', 'GuardianPhone', 'RID', 'Country', 'City', 'Street', 'PostCode', 'Address', 'Floor', 'Door', 'Name', 'Gender', 'Picture', 'Role', 'Class', 'Group', 'Contacts' ]);
    expect(body.Class).to.have.all.keys([ 'ID', 'Class', 'Old' ]);
    expect(body.Group).to.have.all.keys([ 'ID', 'Group', 'Old', 'HeadTUID' ]);
    expect(body.Contacts).to.have.all.keys([ 'ID', 'Discord', 'Facebook', 'Instagram', 'Email' ]);
  });
  Endpoint('GET', '/api/users/me', 200, '', body => {
    expect(body).to.have.all.keys([ 'UID', 'PID', 'Name', 'Gender', 'Picture', 'Role' ]);
  }, { token: tokens.teacher });

  Endpoint('GET', '/api/users/3', 200, '', body => {
    expect(body.UID).to.be.eq(3);
    expect(body).to.have.all.keys([ 'UID', 'Name', 'Gender', 'Role', 'School', 'RID', 'Class', 'Group', 'Picture' ]);
    expect(body.Class).to.have.all.keys([ 'ID', 'Class', 'Old' ]);
    expect(body.Group).to.have.all.keys([ 'ID', 'Group', 'Old', 'HeadTUID' ]);
  });
  Endpoint('GET', '/api/users/3', 200, '', body => {
    expect(body.UID).to.be.eq(3);
    expect(body).to.have.all.keys([ 'UID', 'Name', 'Gender', 'Role', 'School', 'RID', 'Class', 'Group', 'Picture', 'Birthdate', 'City', 'Country', 'GuardianName', 'GuardianPhone' ]);
    expect(body.Class).to.have.all.keys([ 'ID', 'Class', 'Old' ]);
    expect(body.Group).to.have.all.keys([ 'ID', 'Group', 'Old', 'HeadTUID' ]);
  }, { token: tokens.teacher });

  // /api/rooms/ //

  Endpoint('GET', '/api/rooms/', 200, '', body => {
    for (let room of body) {
      expect(room).to.have.all.keys([ 'RID', 'Floor', 'Group', 'Residents', 'Annexe' ]);
      expect(room.Group).to.have.all.keys([ 'ID', 'Group', 'Old', 'HeadTUID' ]);
      expect(room.Annexe).to.have.all.keys([ 'ID', 'Annexe' ]);
      for (let resident of room.Residents) {
        expect(resident).to.have.all.keys([ 'UID', 'BedNum', 'Name', 'Class' ]);
        expect(resident.Class).to.have.all.keys([ 'ID', 'Class', 'Old' ]);
      }
    }
  });

  Endpoint('GET', '/api/rooms/me', 200, '', body => {
    expect(body).to.have.all.keys([ 'RID', 'Floor', 'Group', 'Annexe', 'UID', 'Residents' ]);
    for (let resident of body.Residents) {
      expect(resident).to.have.all.keys([ 'UID', 'BedNum', 'Name', 'Class', 'Picture' ]);
      expect(resident.Class).to.have.all.keys([ 'ID', 'Class', 'Old' ]);
    }
  });

  Endpoint('GET', '/api/rooms/17', 200, '', body => {
    expect(body.RID).to.be.eq(17);
    expect(body).to.have.all.keys([ 'RID', 'Floor', 'Group', 'Annexe', 'Residents' ]);
    for (let resident of body.Residents) {
      expect(resident).to.have.all.keys([ 'UID', 'BedNum', 'Name', 'Class', 'Picture' ]);
      expect(resident.Class).to.have.all.keys([ 'ID', 'Class', 'Old' ]);
    }
  });

  // /api/timetable/ //

  const daysOTW = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];
  Endpoint('GET', '/api/timetable/', 200, '', body => {
    let offset = 0;
    for (let date in body) {
      let expectedDate = new Date((new Date()).toLocaleString('en-US', { timeZone: 'Europe/Budapest' }));
      expectedDate.addDays(offset++);
      expect(date.startsWith(expectedDate.toISOString().split('T')[0] + 'T00:00:00.000')).to.be.true;
      expect(body[date]).to.have.all.keys([ 'DayTypeID', 'Day', 'Data' ]);
      expect(body[date].Day).to.be.eq(daysOTW[expectedDate.getDay()]);
      for (let program of body[date].Data) {
        expect(program).to.have.all.keys([ 'ID', 'ProgramID', 'Lesson', 'Length', 'Type', 'Topic', 'RID', 'TUID' ].concat(program.Type == 1 ? [ 'Class' ] : []));
        if (program.Type == 1)
          expect(program.Class).to.have.all.keys([ 'ID', 'Class', 'Old' ]);
      }
    }
  });

  Endpoint('GET', '/api/timetable/mandatory', 200, '', body => {
    for (let program of body) {
      expect(program).to.have.all.keys([ 'ID', 'Type', 'Topic', 'RID', 'ProgramID', 'Date', 'Lesson', 'Length', 'DayTypeID', 'Class', 'Teacher' ]);
      expect(program.Type).to.eq(1);
      expect(program.Class).to.have.all.keys([ 'ID', 'Class', 'Old' ]);
      expect(program.Teacher).to.have.all.keys([ 'UID', 'PID', 'Name', 'Gender', 'Picture', 'Role' ]);
    }
  });

  Endpoint('GET', '/api/timetable/mandatory/1', 200, '', body => {
    expect(body.ID).to.be.eq(1);
    expect(body).to.have.all.keys([ 'ID', 'Type', 'Topic', 'RID', 'ProgramID', 'Date', 'Lesson', 'Length', 'DayTypeID', 'Teacher', 'Class' ]);
    expect(body.Teacher).to.have.all.keys([ 'PID', 'Name', 'Gender', 'Picture', 'Role', 'UID' ]);
    expect(body.Class).to.have.all.keys([ 'ID', 'Class', 'Old' ]);
  });

  Endpoint('GET', '/api/timetable/studygroup', 200, '', body => {
    for (let program of body) {
      expect(program).to.have.all.keys([ 'ID', 'Type', 'Topic', 'RID', 'ProgramID', 'Date', 'Lesson', 'Length', 'DayTypeID', 'Teacher' ]);
      expect(program.Type).to.eq(2);
      expect(program.Teacher).to.have.all.keys([ 'UID', 'PID', 'Name', 'Gender', 'Picture', 'Role' ]);
    }
  });

  Endpoint('GET', '/api/timetable/studygroup/5', 200, '', body => {
    expect(body.ID).to.be.eq(5);
    expect(body).to.have.all.keys([ 'ID', 'Type', 'Topic', 'RID', 'ProgramID', 'Date', 'Lesson', 'Length', 'DayTypeID', 'Teacher' ]);
    expect(body.Type).to.eq(2);
    expect(body.Teacher).to.have.all.keys([ 'UID', 'PID', 'Name', 'Gender', 'Picture', 'Role' ]);
  });

  Endpoint('GET', '/api/timetable/mandatory/types', 200, '', body => {
    for (let program of body) {
      expect(program).to.have.all.keys([ 'ID', 'Type', 'Topic', 'RID', 'Teacher' ]);
      expect(program.Type).to.eq(1);
      expect(program.Teacher).to.have.all.keys([ 'UID', 'PID', 'Name', 'Gender', 'Picture', 'Role' ]);
    }
  });

  Endpoint('GET', '/api/timetable/mandatory/types/1', 200, '', body => {
    expect(body.ID).to.be.eq(1);
    expect(body).to.have.all.keys([ 'ID', 'Type', 'Topic', 'RID', 'Teacher' ]);
    expect(body.Type).to.eq(1);
    expect(body.Teacher).to.have.all.keys([ 'UID', 'PID', 'Name', 'Gender', 'Picture', 'Role' ]);
  });

  Endpoint('GET', '/api/timetable/studygroup/types', 200, '', body => {
    for (let program of body) {
      expect(program).to.have.all.keys([ 'ID', 'Type', 'Topic', 'RID', 'Teacher' ]);
      expect(program.Type).to.eq(2);
      expect(program.Teacher).to.have.all.keys([ 'UID', 'PID', 'Name', 'Gender', 'Picture', 'Role' ]);
    }
  });

  Endpoint('GET', '/api/timetable/studygroup/types/3', 200, '', body => {
    expect(body.ID).to.be.eq(3);
    expect(body).to.have.all.keys([ 'ID', 'Type', 'Topic', 'RID', 'Teacher' ]);
    expect(body.Type).to.eq(2);
    expect(body.Teacher).to.have.all.keys([ 'UID', 'PID', 'Name', 'Gender', 'Picture', 'Role' ]);
  });

  // /api/institution/ //

  Endpoint('GET', '/api/institution/', 200, '', body => {
    expect(body).to.be.an('object').that.is.empty;
  });

  Endpoint('GET', '/api/institution/groups', 200, '', body => {
    for (let group of body)
      expect(group).to.have.all.keys([ 'ID', 'Group', 'Old', 'HeadTUID' ]);
  });

  Endpoint('GET', '/api/institution/groups/1', 200, '', body => {
    expect(body.ID).to.be.eq(1);
    expect(body).to.have.all.keys([ 'ID', 'Group', 'Old', 'HeadTUID' ]);
  });

  Endpoint('GET', '/api/institution/classes', 200, '', body => {
    for (let cls of body)
      expect(cls).to.have.all.keys([ 'ID', 'Class', 'Old' ]);
  });

  Endpoint('GET', '/api/institution/classes/1', 200, '', body => {
    expect(body.ID).to.be.eq(1);
    expect(body).to.have.all.keys([ 'ID', 'Class', 'Old' ]);
  });

  Endpoint('GET', '/api/institution/annexes', 200, '', body => {
    for (let annexe of body)
      expect(annexe).to.have.all.keys([ 'ID', 'Annexe' ]);
  });

  Endpoint('GET', '/api/institution/annexes/1', 200, '', body => {
    expect(body.ID).to.be.eq(1);
    expect(body).to.have.all.keys([ 'ID', 'Annexe' ]);
  });

  Endpoint('GET', '/api/institution/daytypes', 200, '', body => {
    for (let daytype of body) {
      expect(daytype).to.have.all.keys([ 'ID', 'DayStart', 'RoomRating', 'MiddayAttendance', 'DayArrival', 'NightArrivalRed', 'NightArrivalYellow', 'NightEnd', 'EveningAttendance', 'BreakfastStart', 'BreakfastEnd', 'DinnerStart', 'DinnerEnd', 'SupperStart', 'SupperEnd', 'ActiveOn', 'DayName', 'Lessons' ]);
      for (let lesson of daytype.Lessons)
        expect(lesson).to.have.all.keys([ 'VersionID', 'LessonNum', 'StartTime', 'EndTime' ]);
    }
  });

  Endpoint('GET', '/api/institution/daytypes/1', 200, '', body => {
    expect(body.ID).to.be.eq(1);
    expect(body).to.have.all.keys([ 'ID', 'DayStart', 'RoomRating', 'MiddayAttendance', 'DayArrival', 'NightArrivalRed', 'NightArrivalYellow', 'NightEnd', 'EveningAttendance', 'BreakfastStart', 'BreakfastEnd', 'DinnerStart', 'DinnerEnd', 'SupperStart', 'SupperEnd', 'ActiveOn', 'DayName', 'Lessons' ]);
    for (let lesson of body.Lessons)
      expect(lesson).to.have.all.keys([ 'VersionID', 'LessonNum', 'StartTime', 'EndTime' ]);
  });

  // /api/crossings/ - TODO //

  // Endpoint('GET', '/api/crossings/me', 204, '', body => {});

  // Endpoint('GET', '/api/crossings/1', 204, '', body => {}, {}, { token: teacherToken });

  // Endpoint('GET', '/api/crossings/events', 200, '', body => {}, {}, { token: teacherToken });
});


export { Endpoint, cycleFunctionCall, options, request, tokens };