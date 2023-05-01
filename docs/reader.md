# olvasó és szerver alapvető konfigurációja

A [README](../README.md) fájlban leírt olvasó HAT és raspberry pi SPI kommunikációra való beállítása, és a projekt klónozása után `config.json`-ben konfigurálni kell az olvasót. Ehhez alább le van írva mit mire kell használni.

- `connection`: API szerverhez kapcsolódó konfigurációs beállítások
	- `ws`: websocket használatához szükséges beállítások
		- `host`: API szerver IP címe, hosztneve
		- `path`: API szerver elérési útvonala, ahol fogadja a websocket kapcsolatokat
		- `port`: portszám, amin az API szerver fogadja a websocket kapcsolatokat
		- `encrypt`: használjon-e titkosítást a websocket kapcsolaton
		- `secret`: *"secret"* kulcs, ha megegyezik az API szerver által elvárttal akkor **nem** zárja le a kapcsolatot
	- `prefer`: előnyben részesített kapcsolódási mód
- `keys`: használt A és B kulcs amiket az mifare kártyák használnak, és elvárnak

Ezek beállításához szükség van az API szerver konfigurációjára, amit az `options.json`-ben lehet elvégezni, a kommunikációval kapcsolatos beállítások `readerConnection`-ön belül találhatók. Ezek lent vannak részletezve:

- `websocket`: websocket kapcsolat konfigurációs beállításai
	- `port`: portszám, amin keresztül el lehet érni
	- `path`: elérési útvonal, amin a szerver megpróbálja *upgrade*-olni a HTTP kapcsolatot
	- `secret`: az a titkos kulcs, amit a szerver elvár a kliensektől azonosításkor; ha nem egyezik meg, illetve időtullépés esetén lezárja a websocket kapcsolatot
	- `authenticationTimeout`: *milliszekundumokban* az az idő, ami után a szerver időtullépésre hivatkozva lezárja a kapcsolatot

# olvasóval használt kulcsok állítása

Az mifare kártyákat illetve bilétákat a `setupTags.py` és `resetTags.py` programok segítségével könnyen be lehet állítani *transport* konfigurációból, illetve a program által beállított új konfigurációból visszaállítani, és törölni a kulcsokat róla.

Az alább leírt hozzáférési engedélyek definíciói megtalálhatók az [NXP mifare dokumentációjában](https://www.nxp.com/docs/en/data-sheet/MF1S50YYX_V1.pdf) 8.7-es pontnál.

## kulcsok beállítása

Klónozás után található egy `setupTags.py` fájl, melynek segítségével egyszerre több mifare kártyát is be lehet állítani, ha *transport* konfigurációban vannak.

Ehhez létre kell hozni egy *csv* fájlt, és beletenni a kártyákra írandó belépési kulcsokat. A program mindig várni fog egy kártyára, és csak akkor írja a következőt, ha az előzővel a UID-juk nem megegyező. A belépési kulcsokat a *csv* fájlban található sorrend alapján írja.

Az mifare A és B kulcsait a `config.json`-ben meghatározottakra írja, és az *access bit*-eket első szektornál 4-es jogosultságúra, *sector trailer* jogosultságát 3-asra állítja. A többi szektor esetében blokkjaikat 3-as jogosultságúra állítja , *sector trailer*-ekét úgyszint 3-asokra.

## kulcsok visszaállítása

A kulcsok visszaállításához elég csak futtatni a `resetTags.py` fájlt, ami a `config.json`-ben meghatározott B kulcs használatával a jól beállított kártyákat *transport* konfigurációba helyezi, és törli a belépési kulcsokat róluk.