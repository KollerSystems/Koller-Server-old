# Közreműködés

### Tartalomjegyzék

- [Magatartási kódex](#magatartási-kódex)

- [Általános információk](#általános-információk)
  - [Nyelv](#nyelv)
  - [Fájlnevek és könyvtár struktúra](#fájlnevek-és-könyvtár-struktúra)

- [Fejlesztés](#fejlesztés)
  - [Tesztelés](#tesztelés)
  - [Label-ek](#label-ek)

- [Stílus útmutató](#stílus-útmutató)
  - [Commit üzenetek](#commit-üzenetek)
  - [Kód formázása](#kód-formázása)

- [GYIK](#gyik)

## Magatartási kódex

Ezt a projektet és mindenkit, aki részt vesz benne, a [Koller magatartási kódexe](/docs/CODE_OF_CONDUCT.md) szabályozza. A részvétellel elvárható ezen kód betartása.

## Általános információk

### Nyelv

Mivel a Koller magyar projekt, így felmerül a kérdés: Magyar vagy angol nyelven írjuk?

A fejlesztői csapat a következőkben állapodott meg a nyelvezettel kapcsolatban:

- fejlesztők közti **kommunikáció fő nyelve magyar**

- **dokumentációk**, kanban tábla, issue-k **magyar** nyelvűek

- **kód nyelve angol**, változók, függvények stb. neveit angolul írjuk

- **API** elérési útvonalai, paraméterei **angol**ul írtak

A szakkifejezések maradhatnak angolul a magyar nyelvű dokumentumokban.

Konzisztencia prioritást élvez!

### Fájlnevek és könyvtár struktúra

A projekt fájlai a **_camel case_** elnevezési konvenciót követik. Természetesen az olyan fájlok mint a [README.md](/docs/README.md), ahol meg van szabva a fájl neve, kivételt képeznek.

---

A **gyökérkönyvtár** tartalmazza közvetlenül a felhasznált eszközök konfigurációs fájlait( [_.gitignore_](/.gitignore), [_.eslintrc_](/.eslintrc.json), stb. ), a [_package.json_](/package.json) és a projekt konfigurációs fájlát([_options.json_](/options.json)).
Emellett itt legyen az [_index.js_](/index.js) és bármely olyan kódót tartalmazó fájl, amely elhelyezkedése nem indokolt az egyéb mappákban!

A [**routes**](/routes/)-on belülre kerüljenek az **[expressjs router](https://expressjs.com/en/4x/api.html#express.router)-ek definíciós fájlai**! Ha lehetséges, a kiszolgált útvonal és a fájl neve egyezzen meg.

A [**helpers**](/helpers/) alatt vannak az olyan fájlok, melyek **segédfüggvényeket tartalmaznak**.

A [**docs**](/docs/) mappa minden **dokumentációs célra írt fájt** tartalmaz. Illetve itt található meg [ez](/docs/CONTRIBUTING.md) és a [README](/docs/README.md) fájl is. Értelemszerűen semmilyen _funkcionális_ kódot nem tartalmazhat.

A [**test**](/test/)-en belül helyezkedik el bármely olyan kód, amely a **program tesztelésére** használandó. Irányelvként szolgál, hogy a projektnek teljes mértékben és változatlanul kell működnie, a teljes mappa törlésével is.

## Fejlesztés

### Tesztelés

A projektben automatizált tesztelést használunk, az API teljes funkcionalitásának megőrzésére.

Minden **commit előtt**(hibajavítás lehetősége érdekében) **teszteljük le a teljes szervert**.

Ez a következő paranccsal tehető meg:

```bash
npm test
```

Ennek **eredményét**, hogy mindegyik sikeres vagy sem, **tüntessük fel** issue-kban, pull request-ekben.

### Label-ek

Label neve | `Koller-Server`🔍 | Leírás
--- | --- | ---
`bug` | [keresés](https://github.com/search?q=is:open+is:issue+repo:4E-6F-72-62-65-72-74/Koller-Server+label:bug&type=issues) | Valamely hibás működést, bug-ot jelöl.
`documentation` | [keresés](https://github.com/search?q=is:open+is:issue+repo:4E-6F-72-62-65-72-74/Koller-Server+label:documentation&type=issues) | Dokumentációs munka szükségességét jelöli.
`enhancement` | [keresés](https://github.com/search?q=is:open+is:issue+repo:4E-6F-72-62-65-72-74/Koller-Server+label:enhancement&type=issues) | Új funkció, továbbfejlesztéshez kapcsolódó label.
`invalid` | [keresés](https://github.com/search?q=is:open+is:issue+repo:4E-6F-72-62-65-72-74/Koller-Server+label:invalid&type=issues) | Issue, Pull Request-el kapcsolatos hibát jelöl.
`question` | [keresés](https://github.com/search?q=is:open+is:issue+repo:4E-6F-72-62-65-72-74/Koller-Server+label:question&type=issues) | További információ szükséges.
`testing` | [keresés](https://github.com/search?q=is:open+is:issue+repo:4E-6F-72-62-65-72-74/Koller-Server+label:testing&type=issues) | Automatizált tesztelési esetek szükségesek.
`wontfix` | [keresés](https://github.com/search?q=is:open+is:issue+repo:4E-6F-72-62-65-72-74/Koller-Server+label:wontfix&type=issues) | Több munka nem fog folyni rajta.

## Stílus útmutató

### Commit üzenetek

Természetesen **bármilyen commit üzenet** írható, amíg az _tükrözi a munka jellegét_.

Azonban a megszokás, hogy egy emojit(emojikat) rakunk az elejére, és utána írjuk a "címét". A munka jellegét az emojikhoz a [gitmoji.dev](https://gitmoji.dev/) oldal alapján rendeljük.

Erre két példa:
```
📝CONTRIBUTIONS.md fájl megírása

🚧🧑‍💻COALESCE-el lekérés rewrite
```

A **tartalmilag üres**(pld. _"minor changes"_) és **viccelő** commit üzeneteket(_"Orbang"_) **kerüljük**!

### Kód formázása

A javascriptben írt kódot [eslint](https://eslint.org/)-el formázzuk. Természetesen _bármely eszköz_ (vagy semmilyen) is _használható_ a célra, amennyiben a **formázási követelményeknek** minden tekintetben **megfelel**.

A projektben két eslint konfigurációs fájl is található. Egyik a [teljes projekt formázását](/.eslintrc.json) jellemzi, míg a másik csak a [tesztelési környezet](/test/.eslintrc.json)-hez kapcsolódó eszköz(ök) hibáskénti megjelölését kapcsolja ki.

A repo egésze formázható egy paranccsal:

```sh
npm run lint
```

Néhány fontosabb formázási döntés:
- **camel case** mindenhol

- **double space** indentáció

- **Unix-féle**(_line feed_, `\n`) **sortörés**

- **single quote**-ok használata

- **pontosvessző** zárja a sorokat

- [**One True Brace Style**](https://en.wikipedia.org/wiki/Indentation_style#One_True_Brace)

Példa helyes formázásra:
```js
function* fibonacciGenerator(max, _unused = 128) {
  if (typeof max == 'number') {
    console.log('Continuing...');
  } else {
    console.error('Generation may or may not stop!');
  }

  let a = 0, b = 1;

  // két alapeset
  yield a;
  yield b;

  let sum = a + b;
  while (sum < max) {
    a = b;
    b = sum;

    yield sum;

    sum = a + b;
  }

  throw Error('Generated number exceeded the maximum set!');
}

let fibonacci = {
  'generator': fibonacciGenerator(21 + 1),
  'numbers': [ 0, 1, 1 ]
};

/*
console.log(fibonacci.numbers);
console.log(fibonacci.numbers.length);
*/

try {
  for (const num of fibonacci.generator) {
    if (num < 2) continue;
    fibonacci.numbers.push(num);
  }
} catch (_) {}

const logLineByLine = (array) => {
  for (let i = 0; i < array.length; i++)
    console.log(array[i]);
};

logLineByLine(fibonacci.numbers);
```

## GYIK

> _Min dolgozzak?_

A nyitott issue-k közül bátran lehet válogatni. Amin a csapat már dolgozik, azt `In progress` státusszal látjuk el, abba nem érdemes belekezdeni. Refaktorálást is tárt karokkal várjuk egy-egy rosszabbul írt függvényen, kódrészleten.

> _Hol tudok segítséget kérni?_

Ha egy issue-ra vonatkozik, természetesen az issue alá írjuk kérdésünk! Egyéb esetben, mivel a csapatnak hivatalos elérhetősége nincs, az illetékes(vagy hozzá legközelebbi) tag által megadottakat próbáljuk!

> _Mekkora legyen egy commit?_

Mi jellemzően nem vesszük figyelembe. Egy commit egy kisebb(vagy nagyobb) egybefüggő munkafolyamat lezárása. A félkész munkákat kerüljük! Természetesen le lehet bontani szegmensekre, ezt a commit üzenetekben szoktuk feltüntetni.

> _A README, CONTRIBUTING stb. fájlokat szabad módosítani?_

Igen, azonban az elvárások ezekkel kapcsolatban nem olyan egyértelműek.

> _[JSDoc](https://jsdoc.app/) kommentek?_

A projektben főként segédfüggvények esetében használjuk. Jobb editor suggestion-ök és dokumentálás érdekében is hasznos.