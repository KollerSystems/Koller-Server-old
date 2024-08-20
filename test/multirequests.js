import { expect } from 'chai';
import { Endpoint, cycleFunctionCall, options } from './endpoints.js';

describe('multi-result parameter check', function () {
  let firstUserUID = 0;

  // limit //

  Endpoint('GET', '/api/users', 200, '', body => {
    expect(body).to.be.an('array');
    expect(body).length.to.be.at.most(options.api.batchRequests.defaultLimit);
    firstUserUID = body[0].UID;
  }, { paramtest: true });

  Endpoint('GET', '/api/users', 200, 'limit=1', body => {
    expect(body).length.to.be.at.most(1);
  }, { paramtest: true });

  // offset //

  Endpoint('GET', '/api/users', 200, 'offset=1', body => {
    expect(body[0].UID).to.not.be.eq(firstUserUID);
  }, { paramtest: true });

  // order //

  Endpoint('GET', '/api/users', 200, [ 'sort=UID', 'sort=UID&order=asc', 'sort=UID:asc' ], body => {
    expect(body.map(o => o.UID)).to.be.deep.equal(body.map(o => o.UID).sort());
  }, { paramtest: true });

  Endpoint('GET', '/api/users', 200, [ 'sort=-UID', 'sort=UID&order=desc', 'sort=UID:desc' ], body => {
    expect(body.map(o => o.UID)).to.be.deep.equal(body.map(o => o.UID).sort().reverse());
  }, { paramtest: true });

  Endpoint('GET', '/api/users', 200, 'sort=Class.ID', body => {
    let last = -1;
    for (let obj of body) {
      if (obj?.Class?.ID == undefined) continue;

      expect(obj.Class.ID).to.be.greaterThanOrEqual(last);
      last = obj.Class.ID;
    }
  }, { paramtest: true });

  Endpoint('GET', '/api/users', 200, [ 'sort=RID,-UID', 'sort=RID,UID&order=asc,desc', 'sort=RID:asc,UID:desc' ], body => {
    let lastOuter = -1;
    let lastInner = Infinity;
    let inSeries = false;
    for (let obj of body) {
      if (obj?.RID == undefined) continue;
      expect(obj.RID).to.be.greaterThanOrEqual(lastOuter);

      if (lastOuter == obj.RID) {
        inSeries = true;
        expect(obj.UID).to.be.lessThan(lastInner);
        lastInner = obj.UID;
      } else {
        lastInner = Infinity;
        inSeries = false;
      }

      if (!inSeries) lastInner = obj.UID;
      lastOuter = obj.RID;
    }
  }, { paramtest: true });

  Endpoint('GET', '/api/users', 200, 'sort=Name', body => {
    expect(body.map(o => o.Name)).to.be.deep.equal(body.map(o => o.Name).sort());
  }, { paramtest: true });

  // filter //

  Endpoint('GET', '/api/users', 200, [ 'UID=1', 'filter=UID[eq]:1', 'filters=UID[eq]:1', 'UID=eq:1', 'UID[eq]=1' ], body => {
    expect(body).to.be.an('array').with.a.lengthOf(1);
    expect(body[0].UID).to.be.eq(1);
  }, { paramtest: true });

  cycleFunctionCall((op, method) => {
    Endpoint('GET', '/api/users', 200, [ `filter=UID[${op}]:2`, `UID=${op}:2`, `UID[${op}]=2` ], body => {
      for (let obj of body)
        expect(obj.UID).to.be[method](2);
    }, { paramtest: true });
  }, [ 'gt', 'gte', 'lt', 'lte' ], [ 'greaterThan', 'greaterThanOrEqual', 'lessThan', 'lessThanOrEqual' ]);

  Endpoint('GET', '/api/users', 200, [ 'Gender=1&Role=1', 'filter=Gender:1,Role:1' ], body => {
    for (let obj of body) {
      expect(obj.Gender).to.be.eq(1);
      expect(obj.Role).to.be.eq(1);
    }
  }, { paramtest: true });

  Endpoint('GET', '/api/users', 200, [ 'Group.ID=1', 'filter=Group.ID:1' ], body => {
    for (let obj of body)
      expect(obj?.Group?.ID).to.be.eq(1);
  }, { paramtest: true });

  Endpoint('GET', '/api/users', 200, [ 'Name=Páter Zsófia Édua', 'filter=Name:Páter Zsófia Édua', 'Name=/Zsófia/', 'filter=Name:/Zsófia/', 'Name=/zsófia/i' ], body => {
    expect(body).to.have.a.lengthOf(1);
    expect(body[0].Name).to.be.eq('Páter Zsófia Édua');
  }, { paramtest: true });

  Endpoint('GET', '/api/users', 200, 'Class.Class=/^\\d+\\.[A-Z]/', body => {
    for (let obj of body)
      expect(obj?.Class?.Class).to.match(/^\d+\.[A-Z]/);
  }, { paramtest: true });

  let orgdate = new Date((new Date()).toLocaleString('sv', { timeZone: 'Europe/Budapest' }).split(' ')[0] + ` UTC+${Math.floor(new Date().getTimezoneOffset() / -60)}`);
  Endpoint('GET', '/api/timetable/mandatory', 200, `Date=${orgdate.getFullYear()}`, body => {
    for (let obj of body)
      expect(new Date(obj.Date).getFullYear()).to.be.eq(orgdate.getFullYear());
  }, { paramtest: true });
  Endpoint('GET', '/api/timetable/mandatory', 200, `Date=${orgdate.getFullYear()}-${orgdate.getMonth() + 1}`, body => {
    for (let obj of body) {
      let date = new Date(obj.Date);
      expect(date.getFullYear()).to.be.eq(orgdate.getFullYear());
      expect(date.getMonth()).to.be.eq(orgdate.getMonth());
    }
  }, { paramtest: true });
  Endpoint('GET', '/api/timetable/mandatory', 200, `Date=${orgdate.getFullYear()}-${orgdate.getMonth() + 1}-${orgdate.getDate()}`, body => {
    for (let obj of body) {
      let date = new Date(obj.Date);
      expect(date.getFullYear()).to.be.eq(orgdate.getFullYear());
      expect(date.getMonth()).to.be.eq(orgdate.getMonth());
      expect(date.getDate()).to.be.eq(orgdate.getDate());
    }
  }, { paramtest: true });
});