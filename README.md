# Koller

[![Code Quality](https://img.shields.io/codefactor/grade/github/4E-6F-72-62-65-72-74/Koller-API-DB/master)](https://www.codefactor.io/repository/github/4E-6F-72-62-65-72-74/Koller-API-DB/)
![Technical Debt](https://img.shields.io/codeclimate/tech-debt/4E-6F-72-62-65-72-74/Koller-API-DB)
![Last Commit](https://img.shields.io/github/last-commit/4E-6F-72-62-65-72-74/Koller-API-DB)
[![Google Code Style](https://img.shields.io/badge/Code%20Style-Google-4086f4)](https://google.github.io/styleguide/jsguide.html)


API forráskódja és az adatbázis a Koller-hez.

### Adatbázis beállítása

A fejlesztés során a **MariaDB Community 10.9.4**-es verziójával dolgozunk, ami letölthető manuálisan a [MariaDB hivatalos oldaláról](https://mariadb.com/downloads/community/), vagy a használt diszribúció csomagkezelőjének segítségével.

MariaDB szerver futtatásához fordulj a hivatalos oldalukhoz, illetve a diszribúció wiki-jéhez!

Az installációt és sikeres futtatást követően hozzuk létre a `kollegium` adatbázist MariaDB monitorban (mariadb parancssorban való futtatása után):
```sql
CREATE DATABASE IF NOT EXISTS kollegium;
```

Majd kilépve a MariaDB monitorból importáljuk a táblákat a `kollegium.sql` fájl segítségével (a database mappából):
```
mariadb-dump kollegium < kollegium.sql
```

Ha más felhasználónak hoztuk létre az adatbázist, akkor annak a felhasználónak az adatbázisába "dump"-oljuk.

Az adatbázisba való "dump"-olásról a [MariaDB weboldalán olvashatunk](https://mariadb.com/kb/en/mariadb-dumpmysqldump/).

Nyissuk meg az api mappán belül található `options.json` fájlt egy szövegszerkesztő programmal, és írjuk át a `user` értékét a felhasználónevünkre (ha más felhasználónak hoztuk létre az adatbázist akkor annak a nevére), illetve a `password` értékét a jelszóra, ha be lett állítva, egyébként maradjon üresen.

### API szerver lokális futtatása teszteléshez

Az API szerver a **Node.js 19.2.0**-ás verziójában lett fejlesztve és tesztelve, az újabb verziók nagy eséllyel nem okoznak gondot, régebbi verziókkal is működhet, de *ajánlott* Node.js v16-nál újabbat használni.

Töltsük le a kívánt [Node.js](https://nodejs.org/en/download/) verziót, és az npm (Node Package Manager) segédprogramot mellé, ha nem tölti le automatikusan a Node.js-el együtt.

Ezután telepítsük az összes függőséget amit a program használ. Ezt lehet manuálisan is egyesével, de egyszerűbb ha az api mappában parancssorból futtatjuk az `npm install` parancsot.

Ha hiba nélkül telepítette a szükséges könyvtárakat, futtatható az API szerver parancssorból az api mappában az `npm start` illetve a `node index.js` paranccsal.

A futtatáshoz előfordulhat, hogy **szükséges rendszergazdai jogosultság**, ebben az esetben fordulj az operációs rendszerrel kapcsolatos oldalakhoz.