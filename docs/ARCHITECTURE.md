# Koller API szerverének architectúrája

Ez a dokumentum rövid áttekintést ad a Koller szerverének architectúrájáról, a fejlesztés közbeni döntésekről.

A kódbázissal való megismerkedés útját érdemes itt kezdeni, utána pedig a következők lehetnek még segítségre:
- [API endpointjainak dokumentációja](/docs/API.md)
- [README fájl](/docs/README.md)
- [közreműködéssel kapcsolatos információk](/docs/CONTRIBUTING.md)

### Tartalomjegyzék

- [Felhasznált könyvtárak](#felhasznált-könyvtárak)
  - [Express.js](#expressjs)
  - [Knex.js](#knexjs)
  - [ws](#ws)
  - [re2](#re2)
  - [PM2](#pm2)
  - [Mocha](#mocha)
  - [Chai](#chai)
  - [SuperTest](#supertest)
  - [ESLint](#eslint)

- [Fájlstruktúra](#fájlstruktúra)
  - [./docs](#docs---dokumentáció)
  - [./routes](#routes---endpoint-ok-definíciói)
  - [./helpers](#helpers---segédfüggvények)
  - [./test](#test---tesztelési-fájlok)
  - [./index.js](#indexjs)
  - [./startup.js](#startupjs)

- [A kódról](#a-kódról)
  - [Modulok kapcsolatai](#modulok-kapcsolatai)
  - [Többeredményes lekérések](#többeredményes-lekérések)
  - [Automatizált tesztelés](#automatizált-tesztelés)

## Felhasznált könyvtárak

A szerver **javascript** nyelven íródott, [Node.js](https://nodejs.org/) runtime-al. Mivel Node.js kompatibilis, így [Bun](https://bun.sh/)-nal is futhat, akár jobb teljesítmény mellett. Ez azonban hosszabb tesztelésen nem ment át.

Minden függőség a **[package.json](/package.json)** fájlban fellelhető. Némelyikük (`devDependencies`) a futtatáshoz nem szükséges, csak teszteléshez, fejlesztéshez kell.

### [Express.js](https://expressjs.com)

Az egyik legfontosabb függősége a projektnek. A kérések express-en futnak át először ami részletesebben feldolgozza azokat. A válaszok elküldése is express által folyik le.

Használatának egyik lényeges szempontja, az egyes endpointok jobb elkülönítése. Erre `Router`-eket hozunk létre külön fájlokban, majd ezeket beimportálva `.use()`-oljuk őket hogy egyfajta fát alakítsunk ki belőlük(konkrétabban látható az [index.js](/index.js)-ben mint `routeTree` konstans).

Továbbá olyan endpointoknál, amikor a paraméter még az endpoint része, például egy adott ID-jú user lekérésekor(`/api/users/12`) is kihasznált:

```js
users.get('/:id(-?\\d+)', async (req, res, next) => { /* ... */ });
```

Ahol az `id` lesz a paraméter neve ami majd kereshető `req.params.id`-val. Illetve _regexp_ segítségével az is meg van határozva, ezen endpointot mikor _match_-elje (az id egy olyan meghatározatlan hosszúságú szám lesz, melyet opcionális mínusz jel előz meg).

Ezen felül hasznos olyan esetekben is, amikor a _query paraméter_-eket kell feldolgozni. Például a `?limit=1&offset=2`-t átalakítja egy olyan objektummá, aminek kulcsai a `limit` és `offset` lesznek, melyekhez az 1 és 2-es értékek tartoznak.

### [Knex.js](https://knexjs.org)

Ennek aldependenciája a [mysql](https://github.com/mysqljs/mysql), de a Knex elvárja annak megjelölését és letöltését, azonban mivel projektben direkt módón nem használt, ezért nincs is itt említve részletesebben.

A Knex egyedül **query building**-re van ebben a projektben használva. Annak érdekében, hogy ne _SQL_ parancsokat kelljen mint _string_ írogatni, elabstraktál tőle:

```sql
SELECT UID, Name FROM user WHERE UID > 10;
```
```js
await knx('user').select([ 'UID', 'Name' ]).where('UID', '>', 10);
```

Aszinkron jellege miatt elmenthető az addig felépített _query_, majd ezután később kedv szerint módosítható, és csak azután lesz lekérve, miután például `await`-el bevártuk. Ez leginkább `batchRequest`-eknél van kihasználva belsőleg.

### [ws](https://github.com/websockets/ws)

Jelenleg fejlesztett területeken már nem használt, azonban eddig a prototípus, demonstrációs jellegű kártya leolvasó miatt volt rá szükség.

A kártyaolvasóval [WebSocket](https://datatracker.ietf.org/doc/html/rfc6455) protokollon keresztül kommunikál. Ennek megbízható implementációjaként lett választva.

### [RE2](https://github.com/google/re2)

Ezt a könyvtárat az API szűrési(és egyben afféle keresési funkciója) érdekében használjuk. Leelenőrzi a megadott _regexp_ helyességét, mielőtt átadná azt az adatbázis szervernek.

A szerver és adatbázis két külön _regular expression_ motort használ, ezt figyelembe kell venni. A szerver ezt, a Google-ét használja. Biztonságos és gyors. Nem célja minden speciális szintaxis támogatása, azonban garantálja a _regex_ hosszától függő linearitást időben.

### [PM2](https://github.com/Unitech/pm2)

A kódbázisnak nem követelménye, fejlesztéshez sem szükséges, produkciós környezetben viszont érdemes PM2-vel futtatni a szervert.

A [konfigurációs fájl](/ecosystem.config.cjs) _cluster_-elést határoz meg. Emiatt, és mert egy szerver _instance_ leállása esetén képes újraindítani azt, használt a projektben.

További infomációért a [dokumentációt](https://pm2.keymetrics.io/docs/usage/quick-start/) érdemes konzultálni.

### [Mocha](https://mochajs.org)

A projekt használ **automatizált tesztelés**t, ehhez a környezetet a Mocha teremti meg. Struktúrálisan a következőképp néz ki:

```js
describe('tesztelési csoport / entitás neve', function () {
  it('tesztelt eset / tulajdonság neve', done => { /* ... */ });
});
```
A Mocha képes paralell módon tesztelni az egyes "tulajdonságokat", azonban előfordul, hogy egy tesztből felhasznál valamit egy másikban, amely pedig problémát jelent ha párhuzamosan futnak le.

A tesztek átíráson mennek keresztül, az előbb említett, egymástól függő teszteket már kerüljük. A régebbi tesztek egészen addig megmaradnak, amíg az újak le nem fedik azok témáit, naprakésszé nem válnak.

Megfigyelendő a fenti kódrészletben, hogy `describe()` második paramétere egy név nélküli függvény, és nem egy _arrow function_. Ennek oka, hogy az utóbbi `this`-éhez nem rendelhetőek a Mocha kontextusának paraméterei, így nem is állíthatók.

### [Chai](https://www.chaijs.com)

[Mocha-val](#Mocha) gyakran párosított és ezáltal nagy mértékben kompatibilis _assertion_ könyvtár.

Az olvashatósága és a számos rendelkezésre álló megoldása miatt hasznos:

```js
let arr = [ 'a', 'b', 'c' ]
expect(arr).to.be.an('array').that.has.a.lengthOf(3);
```

Teszteknél a `should`, `expect` és `assert` stílusok közül az `expect` van használva. Azonban az újraírás után az `assert` lenne a kódba illő, viszont ez a váltás még nem történt meg.

### [SuperTest](https://github.com/ladjs/supertest)

Ez az a könyvtár, amivel a _HTTP_ kéréseket lehet tesztelni. Kifejezetten ez a célja is, ezáltal könnyen integrálható.

Beimportálása után egy valós példa `GET` kérésre, authentikálva:
```js
request
  .get('/institution/groups')
  .set('Authorization', `Bearer ${access_token}`)
  .expect('Content-Type', /json/)
  .expect(200)
  .expect(res => {
    /* chaijs assertion... */
  }).end(done);
```

`.end()` meghívja a megadott _callback function_-t, ami a `done`, még előző példából látható, átadott paramétere egy teszt esetnek.

A kommentelt rész helyén van a [chai](#Chai) a leginkább használva, ahol a `res.body` megy keresztül próbákon. Ekkor már utóbbi _parse_-olva lett a könyvtár által.

### [ESLint](https://eslint.org)

**E**CMA**S**cript és JavaScript _**lint**er_. Csak fejlesztéshez hasznos, a konfigurált kódstílus követését tartatja be.

A konfigurációs fájlok `.eslintrc.json` néven találhatók, a [főfájl](/.eslintrc.json) egy általános stílust határoz meg, míg a [tesztek mellett lévő](/test/.eslintrc.json) örökölve ezeket, beállítja a [Mocha](#mocha) használatát, ezáltal engedélyezve a `describe` és `it`, "nem definiált" függvényeket.

További részletek a kód formázásáról a [CONTRIBUTING.md](/docs/CONTRIBUTING.md) fájlban találhatók.

## Fájlstruktúra

Ez a szekció írja le, mely mappák mit céloznak, mik kerülnek bele, és melyikek a jelentősebb fájlok.

### [./docs](/docs/) - dokumentáció

Ebben a mappában vannak a dokumentációs célú fájlok, mint:
- [Code of Conduct](/docs/CODE_OF_CONDUCT.md), azaz a magatartási kódex
- [Közreműködést](/docs/CONTRIBUTING.md) leíró dokumentum
- [README](/docs/README.md) fájl
- [Architectúrát](/docs/ARCHITECTURE.md) leíró anyag
- [API endpointok](/docs/API.md) dokumentációja

Továbbá az ezekhez tartozó médiák, képek, vidók, az [assets](/docs/assets/) mappában.

### [./routes](/routes/) - _endpoint_-ok definíciói

Ide kerülnek az olyan JavaScript fájlok, amelyek egy `Router`-t `export`-olnak, hogy azt az [index.js](/index.js) felhasználhassa, ezáltal alkotva az API-t.

A fájlok nevei utaljanak az útvonalakra (de inkább megegyezzenek velük). Tehát:
```
/api
  /users/
    /
    /me
    /:id
```
A fájl neve ami létrehozza a `/me`-t többek között, legyen `users.js`.

### [./helpers](/helpers/) - segédfüggvények

Bármely segédfüggvényt definiáló fájlok helye.

Jelenleg ezek:
- [misc.js](/helpers/misc.js) - általános segédfüggvények, melyek nem használnak könyvtárakat
- [helpers.js](/helpers/helpers.js) - ide kerülnek amik használják a könyvtárakat, és nem illenek más fájlokba
- [batchRequests.js](/helpers/batchRequests.js) - bármely függvény ami a több entitást visszaadó endpointokhoz készített eszközhöz kapcsolódik(`setupBatchRequest`)

### [./test](/test/) - tesztelési fájlok

Azok a fájlok amik tesztelés közben használva lesznek, tehát [Mocha](#mocha) segítségével létrehozzák a teszteket.

Az átírás előtti, előzetesen használt fájlok _endpoint_-okként teszteltek, mint a [rooms.js](/test/rooms.js). Ezzel a probléma, hogy számos redundáns teszt készült, és nem volt átlátható.

Az új fájlok már téma szerint tesztelnek, ezek pedig:
- [configuration.js](/test/configuration.js) - a konfigurációs fájlt vizsgálja (ez még a régebbiek közé tartozik, de megfelel az új elvárásoknak)
- [endpoints.js](/test/endpoints.js) - az _endpoint_-ok integritását ellenőrzi, azaz hogy minden azt adjon vissza amit kell
- [multirequests.js](/test/multirequests.js) - `setupBatchRequest` egészét ellenőrzi, hogy a paraméterek megfelelően legyenek kezelve
- [failures.js](/test/failures.js) - olyan kérésekkel próbálkozik, amelyek hibásak, nem szabad működniük

### [./index.js](/index.js)

Ez fog "először lefutni". Itt kell inicializálni mindent, ez köti össze a szerver egészét.

Beolvassa a [konfigurációs fájlt](/options.json), megnyitja a kapcsolatot az adatbázissal, elkezdi a kérések fogadását és a szerver leállítását lekezeli.

`Export`-álja a később, más _module_-ok által használt változóit.

### [./startup.js](/startup.js)

Olyan függvényeket definiál, melyeket az [index.js](#indexjs) használ a szerver felállásakor. Ennek célja, hogy az megmaradjon a lehető legátláthatóbban. Tehát az egyes részei elkülönülhessenek egymástól.

Továbbá három hasonló feladatra definiál függvényt, hogy ne ott kelljen szerepelnie ennek(`treeifyMaps`).

## A Kódról

### Modulok kapcsolatai

![modulok kapcsolatai](/docs/assets/arch.png)

<sub>(2024. 08. 17.-én generálva: `madge index.js --image arch.png --layout dot --exclude "(helpers/(misc.js|helpers.js))|(startup.js|reader.js)"`)</sub>

A fenti ábra megmutatja a modulok(fájlok) kapcsolatait, egymásból való `import`-ok szempontjából. A nyilak a forrásra mutatnak.

Minden _route_-ban lévő modul `export`-ol egy ott létrehozott `Router`-t, amire rákapcsolja az _endpoint_-okat. Ezeket felhasználva pedig az [index.js](/index.js) "alakítja ki" az API-t.

Lényegében két féle _resource_ vagy _endpoint_ létezik. Az egyik egy entitást ad vissza, vagyis egy _object_-et. Míg a másik többet, egy _array_-t _object_-ekből.

Az elsőfélére szimplicitása miatt nincs általános eszköz, mely paraméterek megadásával a hasonló lekérések kezelését egyszerűsíti. Azonban a második félére, a `limit`, `offset`, `order` és `filter` _query parameter_-ek miatt nagy részben, már van. Ez az eszköz, és ennek tartozékai vannak a [batchRequests.js](/helpers/batchRequests.js) modulban.

Az ábrán látható ennek a nyoma is. Csak azok a _route_-ok használják, amik visszaadnak több _object_-et. Itt csak az [oauth.js](/routes/oauth.js) a kivétel, hiszen az nem adat lekérésére való(hanem az _access és _refresh token_-ek megszerzésére).

Emellett az összes modul az [index.js](/index.js)-től szerzi meg a [knex](#knexjs) _handle_-t, amivel elérheti az adatbázist. Ez is megmutatkozik a képen, mint a nyilak amik rá mutatnak.

De nem csak a knex _handle_-jét `export`-olja, hanem többek között a [konfigurációs fájlt](/options.json) _parse_-olva és az adatbázisból beolvasott engedélyeket, hibákat, szerepköröket megfelelő adatstruktúrába szedve.

### Többeredményes lekérések

```jsonc
// /api/users/1
{
  "UID": 1,
  ...
}

// /api/users/
[
  { "UID": 1, ... },
  { "UID": 2, ... },
  ...
]
```

Míg az első példa egyetlen entitást ad vissza, egy _object_-et, addig a második több ilyet. Az ilyen típusúakra van a [`setupBatchRequest`](/helpers/batchRequests.js) függvény.

Az ilyen típusú kéréseken lehet a következő _query parameter_-eket meghatározni:
- limit: maximális visszaadható objektumok száma
- offset: szortírozás utáni sorrend eltolása, ezáltal paginálhatóvá tétel
- sort & order
  - sort: mi alapján legyen szortírozva
  - order: asc, azaz növekvő; desc, azaz csökkenő sorrend meghatározása
- filter: szűrés feltételek alapján

A segédfüggvény feladata ezek implementációja.

<details>
<summary>Jelenleg erre többféle szintaxis is használható.</summary>

Valamely sorrend szerint a 20. elemtől kezdve 10 visszaadása:
```
?limit=10&offset=20
```

Szortírozás név szerint növekvő, majd másodlagosan UID szerint csökkenő sorrendbe:
```
?sort=Name,UID&order=asc,desc    // külön használva a két mezőt
?sort=Name:asc,UID:desc          // ":"-al jelezve a sorrendet
?sort=Name,UID:desc              // mivel alapból növekvő, elhagyható
?sort=Name,-UID                  // "-" jel haszálatával jelzve a csökkenő sorrendet
```

Szűrés pontosan "Josh" nevű valakire, akinek a UID-je nagyobb mint 5:
```
?filter=Name:Josh,UID[gt]:5      // külön filter paraméteren
?filters=Name:Josh,UID[gt]:5     // "filters" alias a "filter"-re
?Name=Josh&UID[gt]=5             // saját paramétereikként
?Name=Josh&UID=gt:5              // komparátor értékben szerepel
```

Itt a `gt` jelzi a "nagyobb mint" kifejezést, ezeket a szerver átfordítja az SQL kérésben. Ezek a hozzárendelések a kódból:
```js
const operators = {
  'lt': '<',
  'gt': '>',
  'lte': '<=',
  'gte': '>=',
  'eq': '=',
  'reg': 'REGEXP'
};
```

_Regular expression_ használatával keresés is lehetséges. A következő példa csak olyat fog visszaadni ahol a névben szerepel a Josh vagy a Brandon:
```
?Name=/(Josh)|(Brandon)/
?filter=Name:/(Josh)|(Brandon)/
```

</details>

Előfordulnak olyan kérések, ahol az adott táblán kívül más tábla adatai is érintettek, és célszerű visszaadni azokat. Ezen _mount_-olás a másik fontos feladata. Erre egy példa:
```jsonc
// /api/users/3
{
  "UID": 3,
  "Class": {
    "ID": 12,
    "Class": "9.C"
  },
  ...
}
```
Itt a `user` a fő _object_ amit visszaad, azonban hasznos és szükséges információ még a felhasználó osztálya(ha applikálható), a `Class`. Ezek külön táblákban vannak, így fel kell keresnie a két táblát, és az információt belőle ráhelyezni a megfelelő módon.

Ilyen esetben ugyanúgy kell a szűrési, szortírozási funkcionalitásnak működnie, ezért _dot notation_-el lehet elérni az ilyen objektumok értékeit:
```jsonc
// Ha az erőforrás ilyen object-eket ad vissza: 
{
  "UID": 2,
  "Class": {
    "ID":14,
    "Class": "10.B"
  },
  ...
}

// a következőkkel lehet a Class-nak az ID értékét használni
?sort=-Class.ID
?filter=Class.ID[gt]:5
```

### Automatizált tesztelés

Erre a célra a korábban említett [Mocha](#mocha), [Chai](#chai) és [SuperTest](#supertest) kombinációja van használva.

A tesztek nem magát a kódot tesztelik, hanem a **szerver válaszait** bizonyos kérésekre.

Egy egytesztes fájlban a következőt lehet látni:
```js
describe('checking endpoint integrity', function () {
  it(`/api/users/me`, done => {
    request
      .get()
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(res => {
        expect(res.body).to.be.an('object');
        /* ... */
      }).end(done);
  })
});
```

<details>

<summary>Ez sok <i>boilerplate</i> kód, feleslegesen. Ennek rövidítésére vannak segédfüggvények, melyek az <a href="/test/endpoints.js">endpoints.js</a> fájlban vannak meghatározva.</summary>

`Endpoint()` használatával az előző:
```js
Endpoint('GET', '/api/users/me', 200, '', body => {
  expect(body).to.be.an('object');
  /* ... */
});
```

Ennek 4. paramétere, az üres _string_, lehet egy _array_ is, ilyen esetben pedig annak elemeivel létrehoz teszteket, ugyanazt elvárva mindtől.

Azonban előfordulnak olyan tesztek, melyek paramétereikben és válaszaikban minimálisan különbözőek. Erre a célra használatos a `cycleFunctionCall()`.

A következő példa a különböző feltételű szűréseket teszteli le:
```js
cycleFunctionCall((op, method) => {
  Endpoint('GET', '/api/users', 200, [ `filter=UID[${op}]:2`, `UID=${op}:2`, `UID[${op}]=2` ], body => {
    for (let obj of body)
      expect(obj.UID).to.be[method](2);
  }, { paramtest: true });
}, [ 'gt', 'gte', 'lt', 'lte' ], [ 'greaterThan', 'greaterThanOrEqual', 'lessThan', 'lessThanOrEqual' ]);
```

Azaz megadva egy _callback function_-t paraméterekkel, annak paramétereit a megadottak szerint állítja be. Ha 2 paramétere van a meghívott függvénynek, a példa szerint, akkor 2, ha 3 akkor 3 _array_-t vár el mint további paramétere a segédfüggvénynek.

</details>

Az újraírás előtti fájlokban ez gyakoribb volt, motiválva is azt. Ezek a régebbi fájlok a következők:
- [configuration.js](/test/configuration.js)
- [oauth.js](/test/oauth.js)
- [users.js](/test/users.js)
- [rooms.js](/test/rooms.js)
- [timetable.js](/test/timetable.js)
- [others.js](/test/others.js)

Az újabb, újraírtak pedig:
- [endpoints.js](/test/endpoints.js)
- [failures.js](/test/failures.js)
- [multirequests.js](/test/multirequests.js)


Jobb átláthatóság mellett az újabbak mások abban is, hogy már nem _route_ szerint, hanem téma szerint dolgoznak.