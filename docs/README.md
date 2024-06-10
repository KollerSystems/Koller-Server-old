# Koller-Server

<!--
[![Code Quality](https://img.shields.io/codefactor/grade/github/4E-6F-72-62-65-72-74/Koller-API-DB/master)](https://www.codefactor.io/repository/github/4E-6F-72-62-65-72-74/Koller-API-DB/)
![Technical Debt](https://img.shields.io/codeclimate/tech-debt/4E-6F-72-62-65-72-74/Koller-API-DB)
![Last Commit](https://img.shields.io/github/last-commit/4E-6F-72-62-65-72-74/Koller-API-DB)
[![Google Code Style](https://img.shields.io/badge/Code%20Style-Google-4086f4)](https://google.github.io/styleguide/jsguide.html)
-->

API forráskódja a Koller-hez.

Az API dokumentálását az [API.md](/docs/API.md) fájlban lehet megtalálni.

A közreműködéssel(contributing) kapcsolatos információk a [CONTRIBUTING.md](/docs/CONTRIBUTING.md) fájlban találhatóak.

### Előkészületek a futtatáshoz

A futtatáshoz először klónozzuk le ezt a repository-t.

Ez megtehető grafikus felülettel rendelkező programmal (mint például _[Github Desktop](https://desktop.github.com/)_), vagy paranccsorban (azonban ha a repository privát, _[Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)_-nel kell azonosítani magunk).

Ezután le szükséges tölteni a [**Node.js**](https://nodejs.org/)-t, illetve csomaggkezeléshez az [**npm**](https://www.npmjs.com/) (Node Package Manager) segédprogramot mellé.

Az API szerver a **Node.js 18.13.0**-ás verziójában lett fejlesztve és tesztelve, az újabb verziók nagy eséllyel nem okoznak gondot. Visszamenőleg is képes futni, de mindenképpen *ajánlott* Node.js v16-nál újabbat használni.

Amennyiben sikerült a két program telepítése, le szükséges tölteni az API szerver függőségeit. Ezt megtehetjük manuálisan, egyesével, de célszerűbb ha a klónozott mappában parancssorból futtatjuk az `npm install` parancsot.

Ezzel sikerült az API szervert telepíteni megfelelő módon. Ugyanakkor szükséges adatbázist is felállítani és konfigurálni, amihez a segítséget, a szükséges sémát és dummy adatokat a [Koller-Database](https://github.com/4E-6F-72-62-65-72-74/Koller-Database) repositoryban lehet megtalálni.

### API szerver lokális futtatása teszteléshez

Ha hiba nélkül sikerült a telepítés, és az adatbázis is korrekt módon be lett konfigurálva, akkor lehetséges a futtatás.

A szervert legegyszerűbb módon `node index.js` paranccsal lehet futtatni, azonban ilyenkor clusterelés nélkül, egy core futtatja a szervert. Ez nem célszerű produkció során, ugyanis a szerver addig nem fogad más kérést, amíg egy előző feldolgozás alatt áll.

Ekkor a leállítását a szervernek _**Ctrl**+**C**_ billentyűkombinációval tehetjük meg, ha a parancssoron van a fókusz.

Clusterelés [**pm2**](https://pm2.keymetrics.io/) csomaggal megoldható, ami előzőleg le lett töltve.

Néhány fontosabb parancs clusterelésnél[^1]:

- **program indítása**: `npm start` _vagy_ `pm2 start index.js -i max`
- **program leállítása**: `npm stop` _vagy_ `pm2 stop index.js`
- **cluster felügyelete**: `pm2 monit`
- **logok megtekintése**: `pm2 logs`

[^1]: Amennyiben **pm2**-t parancsként szeretnénk használni, szükséges **globálisan** installálni: `npm install pm2 -g`

A futtatáshoz előfordulhat, hogy **szükséges rendszergazdai jogosultság**, ebben az esetben az operációs rendszerrel kapcsolatos oldalak tudnak segítséget nyújtani. Ilyen esetben a pm2-t is rendszergazdai jogosultsággal kell futtatni.