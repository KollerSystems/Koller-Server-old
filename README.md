# Koller

<!--
[![Code Quality](https://img.shields.io/codefactor/grade/github/4E-6F-72-62-65-72-74/Koller-API-DB/master)](https://www.codefactor.io/repository/github/4E-6F-72-62-65-72-74/Koller-API-DB/)
![Technical Debt](https://img.shields.io/codeclimate/tech-debt/4E-6F-72-62-65-72-74/Koller-API-DB)
![Last Commit](https://img.shields.io/github/last-commit/4E-6F-72-62-65-72-74/Koller-API-DB)
[![Google Code Style](https://img.shields.io/badge/Code%20Style-Google-4086f4)](https://google.github.io/styleguide/jsguide.html)
-->

API forráskódja és adatbázis séma a Koller-hez.

Az API dokumentálását az [API.md](docs/API.md) fájlban lehet megtalálni.

### Adatbázis beállítása

A fejlesztés során a **MariaDB Community 10.10.3**-as verziójával dolgozunk, ami letölthető manuálisan a [MariaDB hivatalos oldaláról](https://mariadb.com/downloads/community/), vagy a használt diszribúció csomagkezelőjének segítségével.

MariaDB szerver futtatásához fordulj a hivatalos oldalukhoz, illetve a diszribúció wiki-jéhez!

Parancssorból importáljuk a táblákat a `schema.sql` fájl segítségével (a database mappából):
```
mariadb < schema.sql
```

Ez a fájl tartalmazza az adatbázis sémáját, de fel szükséges tölteni alapvető információkkal, mint például engedélyekkel.

Ha más felhasználónak hoztuk létre az adatbázist, akkor annak a felhasználónak az adatbázisába töltsük be.

Az adatbázisból való "dump"-olásról, és az sql fájl betöltéséről a [MariaDB weboldalán olvashatunk](https://mariadb.com/kb/en/mariadb-dumpmysqldump/).

Nyissuk meg az api mappán belül található `options.json` fájlt egy szövegszerkesztő programmal, és írjuk át a `user` értékét a felhasználónevünkre (ha más felhasználónak hoztuk létre az adatbázist akkor annak a nevére), illetve a `password` értékét a jelszóra, ha be lett állítva, egyébként maradjon üresen.

### mifare olvasó beállítása

Az olvasóhoz írt programkód egy **Waveshare PN532 NFC HAT**-hez lett írva, így egy raspberry pi is kell hozzá.

A HAT-et fel kell konfigurálni *SPI* használatára, ehhez a [weboldalukon](https://www.waveshare.com/wiki/PN532_NFC_HAT) utasítások találhatók. A használt raspberry pi-n engedélyezni kell az *SPI*-t.

Ezek után klónozzuk a raspberry pi-n ebből a repository-ból a reader mappát, és a `config.json` fájlban állítsuk be a szükséges értékeket, hogy a raspberry pi az API szerverrel *websocket* kapcsolaton keresztük kommunikálhasson, illetve a használandó A&B kulcsokat amiket használni fog működése során.

A két fájl, `setupTags.py` és `resetTags.py` segítheti az mifare biléták beállítását, illetve *transport* konfigurációba való helyezését. Beállításhoz futtatni kell a `setupTags.py` fájlt, és megadni egy *csv* formátumú fájl elérési útvonalát. Ebben a fájlban a kulcsok sorrendjében írja a bilétákat, amelyek *transport* konfigurációban vannak.

Az olvasó használatához ezek után futtatni kell a `main.py` fájlt, de csak miután **fut az API szerver**.

### API szerver lokális futtatása teszteléshez

Az API szerver a **Node.js 19.2.0**-ás verziójában lett fejlesztve és tesztelve, az újabb verziók nagy eséllyel nem okoznak gondot, régebbi verziókkal is működik valószínűleg (de eddig csak a **v18.16.1** került tesztelésre), de mindenképp *ajánlott* Node.js v16-nál újabbat használni.

Töltsük le a kívánt [Node.js](https://nodejs.org/en/download/) verziót, és az npm (Node Package Manager) segédprogramot mellé, ha nem tölti le automatikusan a Node.js-el együtt.

Ezután telepítsük az összes függőséget amit a program használ. Ezt lehet manuálisan is egyesével, de egyszerűbb ha az api mappában parancssorból futtatjuk az `npm install` parancsot.

Ha hiba nélkül telepítette a szükséges könyvtárakat, futtatható az API szerver parancssorból.

A szervert lehet `node index.js` paranccsal futtatni, ilyenkor clusterelés nélkül, egy core futtatja a szervert.

Clusterelés [**pm2**](https://pm2.keymetrics.io/) csomaggal megoldható, ami előzőleg le lett töltve. A `pm2 start index.js -i max` parancs az összes elérhető CPU core-t használatba veszi. Ugyanez megoldható az `npm start`-al. Leállításához használhatjuk a `pm2 stop index.js` parancsot amit rövdíthetjük itt az `npm stop`-al, illetve a clustert *monitor*-olhatjuk a `pm2 monit` paranccssal. Ezek mellett a logok megtekinthetők a `pm2 logs` segítségével.

A futtatáshoz előfordulhat, hogy **szükséges rendszergazdai jogosultság**, ebben az esetben fordulj az operációs rendszerrel kapcsolatos oldalakhoz. Ilyen esetben a pm2-t is rendszergazdai jogosultsággal kell futtatni.
