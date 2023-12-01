# Koller

<!--
[![Code Quality](https://img.shields.io/codefactor/grade/github/4E-6F-72-62-65-72-74/Koller-API-DB/master)](https://www.codefactor.io/repository/github/4E-6F-72-62-65-72-74/Koller-API-DB/)
![Technical Debt](https://img.shields.io/codeclimate/tech-debt/4E-6F-72-62-65-72-74/Koller-API-DB)
![Last Commit](https://img.shields.io/github/last-commit/4E-6F-72-62-65-72-74/Koller-API-DB)
[![Google Code Style](https://img.shields.io/badge/Code%20Style-Google-4086f4)](https://google.github.io/styleguide/jsguide.html)
-->

API forráskódja és adatbázis séma a Koller-hez.

Az API dokumentálását az [API.md](docs/API.md) fájlban lehet megtalálni.

### API szerver lokális futtatása teszteléshez

Az API szerver a **Node.js 19.2.0**-ás verziójában lett fejlesztve és tesztelve, az újabb verziók nagy eséllyel nem okoznak gondot, régebbi verziókkal is működik valószínűleg (de eddig csak a **v18.16.1** került tesztelésre), de mindenképp *ajánlott* Node.js v16-nál újabbat használni.

Töltsük le a kívánt [Node.js](https://nodejs.org/en/download/) verziót, és az npm (Node Package Manager) segédprogramot mellé, ha nem tölti le automatikusan a Node.js-el együtt.

Ezután telepítsük az összes függőséget amit a program használ. Ezt lehet manuálisan is egyesével, de egyszerűbb ha az api mappában parancssorból futtatjuk az `npm install` parancsot.

Ha hiba nélkül telepítette a szükséges könyvtárakat, futtatható az API szerver parancssorból.

A szervert lehet `node index.js` paranccsal futtatni, ilyenkor clusterelés nélkül, egy core futtatja a szervert.

Clusterelés [**pm2**](https://pm2.keymetrics.io/) csomaggal megoldható, ami előzőleg le lett töltve. A `pm2 start index.js -i max` parancs az összes elérhető CPU core-t használatba veszi. Ugyanez megoldható az `npm start`-al. Leállításához használhatjuk a `pm2 stop index.js` parancsot amit rövdíthetjük itt az `npm stop`-al, illetve a clustert *monitor*-olhatjuk a `pm2 monit` paranccssal. Ezek mellett a logok megtekinthetők a `pm2 logs` segítségével.

A futtatáshoz előfordulhat, hogy **szükséges rendszergazdai jogosultság**, ebben az esetben fordulj az operációs rendszerrel kapcsolatos oldalakhoz. Ilyen esetben a pm2-t is rendszergazdai jogosultsággal kell futtatni.
