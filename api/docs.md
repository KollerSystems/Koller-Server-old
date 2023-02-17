# Koller API Dokumentációja, és példák a használatára

Felépítése:

- [`/oauth`](#oauth):
	- `/token`
- [`/api`](#api):
	- `/user`
		- `/me`

*POST* kérések esetén a válasz egy *JSON* objektum formájában érkezik.

## `/oauth`

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

### `GET /user/me`

Semmilyen paramétert sem fogad el, a használt *access token* alapján visszaküldi a felhasználó adatait.

#### Példa:

```
GET /api/user/me HTTP/1.1
Authorization: Bearer fM0~58_cAbiNT7BFE370RM5rVg/43ay~
```

---