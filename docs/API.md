# A dokumentáció értelmezése

## A dokumentációról

A dokumentáció részekre van bontva, elsőkörben az elérési útvonalak vannak leírva, felbontva kissebb részekre, pontos végponttal. Részletezve van mire használható, és meghatározza az esetleges paramétereket is. A kissebb részek befejezése után pár példa található.

Még a dokumentáció elején egy elérési útvanalakból álló fa áll, melyek főcíme a különböző fő elérési útvonalakra való ugrást teszi lehetővé.

Ezen a fán az olyan értékek, melyek nem konkrétumok "`:`"-al kezdődnek. A részletesebb leírásában kapcsos zárójelek között van feltüntetve. Ilyen érték lehet példaként egy ID. Névvel vannak ellátva, könnyebb referálás érdekében.

## Elérési útvonalak, végpontok

**Elérési útvonalak** dokumentációjánál a következő formát lehet látni:

```
GET /users/{uid}
```

Először a *HTTP method*, majd utána az elérési útvonal, melyben csak eggyel visszamenve van kiírva az útvonal. Például a `/api/users/me` csak `/users/me`-ként van kiírva, hisz a `/api` irreleváns.

*GET* kérések esetén a *query string*-ek elhagyhatóak, hacsak nincs külön kiemelve.

Paraméterek értékei kapcsos zárójelben vannak feltüntetve, abban az esetben ha **egzakt** értékeket vár el a szerver akkor `|` karakter választja el a lehetséges értékeket. Előfordulhat hogy *regular expression*-nel van feltüntetve.

## Szortírozás, szűrés, paginálás

Előfordulnak olyan *endpoint*-ok, amely több felhasználó, szoba stb. lekérésére alkalmas. Ilyenek esetén fel van tüntetve hogy lehet rajta szortírozni, szűrni és paginálni. A szintaxisuk leírásra kerül itt, így egyszerűsítés kedvéért nem lesz minden ilyen *endpoint*-nál részletezve.

### Paginálás

Az esetek többségében felesleges a szervernek az összes adatot elküldenie egyszerre, hiszen ennek csak egy része lesz használva. Emellett a kérés válasza is nagy mennyiségű adatot tartalmaz, így lassítva a válaszidőt.

Ennek elkerülése végett, a lekérdező meghatározhat egy `limit` értéket, amely a maximum elküldhető felhasználó, szoba stb. számát adja meg a szervernek. Ez az érték se lehet végtelen, meg van határozva a szerver beállításában egy érték, aminél ha túlmegy a megadott `limit`, akkor a maximum megadható `limit`ként lesz értelmezve.

Annak érdekében hogy ne csak a legelső `limit` számú entitást lehessen lekérni, a felhasználó meghatározhat egy `offset` értéket is, ezáltal "eltolva", hogy honnan kezdődik a `limit`.

Példa:

```GET /api/rooms?limit=10&offset=20```

A 20. szobától(adatbázisban lévő sorrend alapján) kezdve 10 szobát küld el a szerver.

### Szortírozás

Annak érdekében hogy a szerver által elküldött adatok ne az adatbázisban meghatározott, gyakorlatilag véletlenszerű sorrendben jöjjenek, lehet szortírozni.

Erre több szintaxis is van, akármelyik használata lehetséges, de a különféle módok kombinálása nem belátható eredményekkel járhat, így **nem ajánlott**.

Példákon keresztül lehet talán legjobban látni melyik hogy működik:

```GET /api/rooms?sort=-RID,Gender```

Ebben az esetben fel kell sorolni a szortírozni kívánt tulajdonságok mező neveit, és ellátni azokat negatív előjellel amelyeket csökkenő sorrend alapján kívánunk szortírozni.

Ezzel **csökkenő** sorrendben kérjük le a szobákat az IDjuk alapján, majd utána másodlagosan szortírozzuk a "szoba nemétől" **növekvő** sorrendben. Ennek nincs értelme ugyan, mert két szoba IDja nem lehet azonos, így nem lesz szükség a másodlagos szortírozásra.

```GET /api/rooms?sort=RID:desc,Gender:asc```

Felsoroljuk a mezőneveket, ugyanúgy mint az előbb, de most egy `:`-al meghatározzuk az egyes mezőnevek sorrendjét. Az alap sorrend a növekvő(***asc**ending*) így elhagyható, azonban a csökkenő(***desc**ending*) természetesen nem.

Ugyanazt érjük el mint az előbbinél.

```GET /api/rooms?sort=RID,Gender&order=desc,asc```

Ennél először felsoroljuk a `sort` paraméternél mely mezők alapján szeretnénk szortírozni, majd az `order` paraméterben megadjuk az előzőleg megadott sorrendben, hogy melyik csökkenő és melyik növekvő. Itt is elhagyható a növekvő, de csak a végéről, hasonló módon mint a programozási nyelvek esetében a függvények paramétereinek megadásakor.

Ugyanaz a végeredménye, mint az eddigieknél.

### Szűrés

Szűrés segítségével meg tudjuk határozni, hogy milyen feltételeknek kell teljesülnie, hogy egy entitást megkaphassunk.

Erre is van többféle stílus, többek között *"LHS Bracket"* és *"RHS Colon"*. Ismételten példákon keresztül lesz szemléltetve.

Ahhoz hogy komparálni tudjunk, rövidített formájukat kell használnunk a teljes angol kiolvasásának:

- eq: **Eq**ual
- lt: **L**ess **T**han
- gt: **G**reater **T**han
- lte: **L**ess **T**han or **E**qual to
- gte: **G**reater **T**han or **E**qual to

Abban az esetben ahol egyenlőnek kell lennie(*eq*) elhagyható a szögletes zárójel és az *eq*.

```GET /api/rooms?RID[gt]=5&Gender=1```

Ez az *LHS Bracket* stílus, itt paraméter neve két dologból áll, a szűrni kíván mező neve és az összehasonlító "operátor"ból, szögletes zárójelbe helyezve. a paraméter értéke az összehasonlítandó érték.

Az 5-nél nagyobb ID-jú, "férfi" szobákat kéri csak le.

```GET /api/rooms?RID=gt:5&Gender=1```

Ez az *RHS Colon* stílus, itt a paraméter neve megegyezik a mező nevével, az operátor az értékének egy része melyet `:` választ el a hasonlítandó értéktől.

Ugyanazt érjük el mint előbb.

```GET /api/rooms?filter=RID[gt]:5,Gender:1```

Ebben az esetben a filter paraméterbe kerül minden szűrni kívánt érték. A legelső, *LHS Bracket* módhoz áll talán a legközelebb, hiszen itt a `:` az `=` jelnek felel meg. Az egyes feltételek vesszővel vannak elválasztva. Akár egy szóköz is lehet közöttük.

Az előző kettővel megegyező az eredménye.

### Megjegyzések

A paginálást, szortírozást és szűrést lehet kombinálni, egyszerre használni.

Szűréssel akár egyfajta paginálást is el lehet érni, de a `limit` paramétert célszerű beállítani ilyenkor is.

Erre egy példa:

```GET /api/rooms?filter=RID[gt]:10,RID[lte]:20&limit=10```

Feltételezve hogy 10-től 20-ig van minden számra egy ID, akkor ugyanazt érjük el vele, mint a:

```GET /api/rooms?limit=10&offset=10```

kéréssel. A különbség ott van, hogyha nincs minden ID 10 és 20 között, akkor az első féle úton csak annyit kérünk le amennyinek van 10 és 20 közötti IDja, míg a második féle módón a 10 létező szoba utáni 10 szobát kérjük le.

## Példákról

```
POST /oauth/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=mjIIfe37~_~n1/paRmRs95Iiz_Snmff5
```

A *HTTP* kéréseket és válaszok szöveges formában vannak, ahogy azt egy sima *TCP* üzenetben is láthatnánk.

Kérésnél először a *HTTP method*, utána a **teljes** elérési útvonal, majd a *HTTP* verziószáma. Új sorban pedig a *HTTP header*-ek, amelyek relevánsak dokumentálás szempontjából. Ezután egy üres sor, majd utána az elküldendő adat, feltéve ha van, és a *HTTP method* megengedi. Adat a *body*-ban, a *header*-ek közt feltüntetett `Content-Type` formátumú.

```
HTTP/1.1 200 OK
Content-Type: application/json

{
    "access_token": "fM0~58_cAbiNT7BFE370RM5rVg/43ay~",
    "token_type": "Bearer",
    "expires_in": 86400,
    "refresh_token": "da8_vJn2qjk_lesApm3W8l5CG-A0_2Jw"
}
```

Fent egy válaszként kapható példa van feltüntetve.

Elsőként a *HTTP* verziószám, utána a kérés sikerességét és/vagy hibáját jelző *status code*, majd a hozzá tartozó szöveges leírása(protokoll által definiált). Ezután jönnek új sorban a fejlécek, szintén **csak** az ami számít dokumentáció szempontjából. Majd üres sor után a példa kérésre visszaküldött adat, fejlécben meghatározott formában.  

# Koller API Dokumentációja, és példák a használatára

Felépítése:

- [`/oauth`](#oauth):
	- `/token`
- [`/api`](#api):
	- `/users`
		- `/`
		- `/me`
		- `/:uid`
		- `/mifare`
	- `/rooms`
		- `/`
		- `/me`
		- `/:rid`
	- `/crossings`
		- `/me`
		- `/:uid`
		- `events`

*POST* kérések esetén a válasz egy *JSON* objektum formájában érkezik. Ez a legtöbb *GET* kérésre is igaz.

Az ID-k közül is többféle van: 
- *UID*: **U**ser **Id**entifier - Két ugyanilyen IDjú felhasználó nem lehet, legyen akár két különböző típusú.
- *RID*: **R**oom **Id**entifier - Szobák azonosítására használt.

## `/oauth`

Authorizációs kérések.

Az összes `/api`-on felüli kéréshez kell egy érvényes *access token*, melyet a *HTTP* kérés `Authorization` mezőjébe, `Bearer` után kell rakni.

Ezt a token-t a `/token` endpoint-al kapjuk meg.

### `POST /oauth/token`

A **`grant_type`** elvárt paraméter lehetséges értékei:

- `password`
- `refresh_token`

`password` esetén meg kell még adni a `username` és `password` paramétereket.

A `username` értéke vagy egy OM azonosító, vagy egy külön bejegyzett felhasználónév.

`refresh_token` esetében, csak a `refresh_token` értékét kell megadni, így nem kell ismét jelszóval dolgozni.

A szerver a kérésekre visszaküld egy *access* és egy *refresh token*-t, ezek mellé az *access token* lejárati idejét másodpercben.

#### Példák kérésekre(és a szerver válasza rá):

```
POST /oauth/token HTTP/1.1
Content-Type: application/json

{
	'grant_type': "password",
	'username': "71365791334",
	'password': "..."
}

// vagy \\

POST /oauth/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=mjIIfe37~_~n1/paRmRs95Iiz_Snmff5
```


```
HTTP/1.1 200 OK
Content-Type: application/json

{
    "access_token": "fM0~58_cAbiNT7BFE370RM5rVg/43ay~",
    "token_type": "Bearer",
    "expires_in": 86400,
    "refresh_token": "da8_vJn2qjk_lesApm3W8l5CG-A0_2Jw"
}
```

## `/api`

A szervertől való lekérések gyökere.

### `GET /users?role={student|teacher}`

Paginálható, szortírozható és szűrhető.

Több felhasználó lekérése. Mivel a lekérhető felhasználók típusai mások, így `role` paraméter hiányában csak a **közös tulajdonságokra** lehet szűrni. Ellenkező esetben akármilyenre.

### `GET /users/me`

Semmilyen paramétert sem fogad el, a használt *access token* alapján visszaküldi a felhasználó adatait.

### `GET /users/{uid}`

Megadott UID-jú felhasználó lekérése.

### `POST /users/mifare`

A kérést `application/octet-stream` *Content Type* headerrel el kell látni, a kérés *body*-jába kell a lekérdezendő mifare bilétáról megszerzett kulcs adatait rakni. Ha a kulcs létezik visszakapjuk a kulcsról az információkat, ha nem akkor egy *404*-es hibakódot.

---

### `GET /rooms`

Paginálható, szortírozható és szűrhető.

Több, az összes szoba lekérése, ehhez hozzátolódnak még a szoba lakosai is.

### `GET /rooms/me`

A bejelentkezett felhasználó szobájának lekérése, amihez társulnak még a szobájában lakókról információk. Saját magát ki lehet keresni ebből a tömbből, ugyanis a kérés megadja a lekérdező `UID`-ját.

### `GET /rooms/{rid}`

A megadott RID-jú szoba, és benne lakók lekérése. Több információt ad a lakosokról, mint amikor egyszerre több szoba kerül lekérdezésre

---

### `GET /crossings/me`

Paginálható, szortírozható és szűrhető. **(tesztelés alatt)**

A lekérdező felhasználó portai ki- és belépései lekérdezése visszamenőleg.

### `GET /crossings/{uid}`

Paginálható, szortírozható és szűrhető. **(tesztelés alatt)**

A megadott UID-jú felhasználó kapu átlépéseinek történelmének lekérdezése.

### `GET /crossings/events`

Belsőleges kérésként használandó. A kérésre válasz headernek a szerver `text/event-stream` formátumot fog visszaküldeni, azaz [Server Sent Events](https://en.wikipedia.org/wiki/Server-sent_events) technológiát használ. Ezek után a szerver a kaput átlépő felhasználó adatait küldi JSON formában. Belépéskor a kimenés idejét és a belépés idejét is elküldi, de kilépéskor nem.

#### Példák kérésekre:

```
GET /api/users/me HTTP/1.1
Authorization: Bearer fM0~58_cAbiNT7BFE370RM5rVg/43ay~
```

# A szerver konfigurációja - `options.json`

A szerver futtatása elött különféle paraméterek beállíthatóak, ezek az `options.json` fájlban vannak elmentve. A szerver indításkor beolvassa a fájlt, és alkalmazza a konfigurációt. Ez azzal jár, hogy futás alatt a paraméterek változtatása nem lehetséges.

A fájlban különféle objektumokban vannak elkülönítve a főbb opciók, így jobban átláthatóvá téve azt. Ezek alapján van felbontva a dokumentum is.

## `authorization`

Authorizációs beállítások, *token*-ekkel kapcsolatos, hogyan tárolja el az adatbázisban. Fontos, hogy módosítás csak az új *token*-ekre lesz érvényes, a régieket nem változtatja meg az adatbázisban.

- `tokenLength`: A *token*-ek hossza, fix karakterszáma.
- `allowedCharacters`: *String* az összes lehetséges karakterrel, ezek közül kerülnek a *token*-be a véletlenszerűen kiválasztott karakterek.
- `expiry`: Lejárati értékekkel foglalkozó változók.
	- `accessToken`: Az *access token* max élettartama másodpercben mérve.
	- `refreshToken`: A *refresh token* élettartamát meghatározó számérték másodpercben mérve.

## `databaseLoginData`

Adatbázis hozzáféréshez szükséges adatok.

- `user`: A felhasználó, akinél az adatbázis be van állítva.
- `password`: A kiválasztott felhasználó jelszava. Üres *string* is lehet, ha nincs jelszó beállítva.

## `api`

Az *API* szerverhez kapcsolódó opciók.

- `port`: A portszám, amin elérhetjük a szervert.
- `exitTimeout`: Időtartam milliszekundumban mérve, lejárása után a szerver időtúllépés miatt leállítja az indítást.
- `extendPermissions`: A szerver kibővítse-e az adatbázisban nem meghatározott permissziókat alapértékükkel.
- `maxDigits`: Olyan routeok esetében ahol a szerver ID-t vár el, mekkora legyen a maximális számjegyek hossza.
- `batchRequests`: Többszörös adatlekéréseknél használt opciók.
	- `defaultLimit`: Alapértelmezett max érték amit a szerver visszaadhat, olyan esetben ha kérésben nincs meghatározva `limit` érték.
	- `maxLimit`: A maximum megadható `limit`. Túllépése esetén ezen értékként értelmezi a szerver.
	- `allowedRoles`: Lista az összes olyan felhasználó típussal, amit le lehet kérni *"batch request"*-ben.
- `SSE`: *Server Sent Events*-el kapcsolatos beállítások.
	- `clientRetryInterval`: Milliszekundumban meghatározott idő, mely megadja a kliensnek mennyit várjon újrakapcsolódás előtt ha megszakad a kapcsolat.

## `readerConnection`

Az mifare olvasóhoz való kapcsolódás konfigurációi.

Ezek a [reader.md](./reader.md) fájlban vannak leírva.

## `logging`

Naplózással kapcsolatos konfigurációk.

- `logAsISOString`: [ISO szabvány](https://en.wikipedia.org/wiki/ISO_8601) szerinti időpont megjelenítés.
- `logIP`: Forrás IP cím hozzátűzése napló bejegyzés mellé.
- `logUnsuccessful`: Sikertelen kérések naplózásba való vétele.
- `logNotFound`: 404-es (nem található, *Not Found*) kérések naplózása.
- `logConsole`: Naplózott bejegyzések kiírása a konzolra.
- `logFile`: Bejegyzések létrehozása a megadott fájl elérési útvonalában, *String*-ként. Nem létező fájl esetén a szerver létrehoz egy újat az útvonalnak eleget téve.
- `overwriteLog`: Felülírja-e a szerver a `logFile`-ban megadott fájl tartalmát.

---