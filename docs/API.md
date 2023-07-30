# A dokumentáció értelmezése

A dokumentáció részekre van bontva, elsőkörben az elérési útvonalak vannak leírva, felbontva kissebb részekre, pontos végponttal. Részletezve van mire használható, és meghatározza az esetleges paramétereket is. A kissebb részek befejezése után pár példa található.

Még a dokumentáció elején egy elérési útvanalakból álló fa áll, melyek főcíme a különböző fő elérési útvonalakra való ugrást teszi lehetővé

**Elérési útvonalak** dokumentációjánál a következő formát lehet látni:

```
GET /users?limit={limit}&offset={offset}
```

Először a *HTTP method*, majd utána az elérési útvonal, melyben csak eggyel visszamenve van kiírva az útvonal. Például a `/api/users/me` csak `/users/me`-ként van kiírva, hisz a `/api` irreleváns.

*GET* kérések esetén a *query string*-ek elhagyhatóak, hacsak nincs külön kiemelve.

A dokumentum elején található fán az olyan értékek, melyek nem konkrétumok "`:`"-al kezdődnek. A részletesebb leírásában kapcsos zárójelek között van feltüntetve. Ilyen érték lehet példaként egy ID. Ezek névvel vannak ellátva, könnyebb referálás érdekében.

Az ID-k közül is többféle van: 
- *UID*: **U**ser **Id**entifier - Két ugyanilyen IDjú felhasználó nem lehet, legyen akár két különböző típusú.
- *RID*: **R**oom **Id**entifier - Szobák azonosítására használt.

Paraméterek értékei kapcsos zárójelben vannak feltüntetve, abban az esetben ha **egzakt** értékeket vár el a szerver akkor `|` karakter választja el a lehetséges értékeket.

**Példák esetén:**

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

### `GET /users?role={student|teacher}&limit={limit}&offset={offset}`

Több felhasználó lekérése.

Három paramétert lehet megadni, egyik sem kötelező:

- `role`: Csak a megadott típusú felhasználók lekérése, ha nincs megadva, minden típusú felhasználó visszaadása(típusa szerint egymás után).
- `limit`: A maximális felhasználók száma amit a szerver egyszerre visszaküldhet. Ha az érték nagyobb a megengedettnél, a legnagyobbként értelmezi a szerver.
- `offset`: A visszaküldött adatokat eltolja ezen értékkel, csak utána kezdi a `limit`-et számolni.

Értelemszerűen a `limit` és `offset` paramétereket együtt érdemes használni, így egyfajta *"lapozhatóság"*(*pagination*) hozható létre. 
 
### `GET /users/me`

Semmilyen paramétert sem fogad el, a használt *access token* alapján visszaküldi a felhasználó adatait.

### `GET /users/{uid}`

Megadott UID-jú felhasználó lekérése.

### `POST /users/mifare`

A kérést `application/octet-stream` *Content Type* headerrel el kell látni, a kérés *body*-jába kell a lekérdezendő mifare bilétáról megszerzett kulcs adatait rakni. Ha a kulcs létezik visszakapjuk a kulcsról az információkat, ha nem akkor egy *404*-es hibakódot.

---

### `GET /rooms?Gender={0|1|female|male}&Group={/(L|F)\d+/}limit={limit}&offset={offset}`

Több, az összes szoba lekérése.

Két paraméterrel lehetséges a szűrés:
- `Gender`: (0-nő, 1-férfi): Egy szobában csak azonos neműek lakhatnak. Így lehet szűrni a "szoba nemére".
- `Group`: A szobában lakó csoportra lehet szűrni.

### `GET /rooms/me`

A bejelentkezett felhasználó szobájának lekérése, amihez társulnak még a szobájában lakókról információk. Saját magát ki lehet keresni ebből a tömbből, ugyanis a kérés megadja a lekérdező `UID`-ját.

### `GET /rooms/{rid}`

A megadott RID-jú szoba, és benne lakók lekérése. Több információt ad a lakosokról, mint amikor egyszerre több szoba kerül lekérdezésre

---

### `GET /crossings/me?limit={limit}&offset={offset}`

A lekérdező felhasználó portai ki- és belépései lekérdezése visszamenőleg.

### `GET /crossings/{uid}?limit={limit}&offset={offset}`

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

## `errorChecking`

Szerver indításakor lefuttatható, hibamegelőző/ellenőrző funkciók. Esetleges hibáktól függetlenül a szerver elindul, de nagy valószínűséggel hibába fog futni, nem ajánlott figyelmen kívül hagyni a figyelmeztetéseit.

`extendPermissions`: A szerver kibővítse-e az adatbázisban nem meghatározott permissziókat alapértékükkel.
`database`: Különféle adatbázis konfigurációt érintő hibákért való keresés. 
`options`: `options.json` fájlban meghatározott hibás konfiguráció iránti keresés.

---