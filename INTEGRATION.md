# Distance search integration status

As of the nationwide data drop, **`app.js` already implements distance matching**
(via another worker): `resolveLocation`, `rankCenters`, `haversineMiles`, directory
notes, and Get Help matching. **No further app.js patch is required** for Find Help
to work nationwide.

## Data files loaded by `index.html`

```html
<script src="data/centers.js"></script>
<script src="data/zip-coords.js"></script>
<script src="data/city-index.js"></script>
<script src="js/app.js"></script>
```

| Global | File | Shape |
|--------|------|--------|
| `HEARTH_CENTERS` | `data/centers.js` | array of center objects (id, name, type, city, state, zip, phone, email, services, needs, faith, blurb, lat, lng) |
| `HEARTH_ZIP_COORDS` | `data/zip-coords.js` | `{ "10001": [lat, lng], ... }` |
| `HEARTH_CITY_INDEX` | `data/city-index.js` | `{ "bozeman": [lat, lng, "MT", "59718"], ... }` |

## Optional `js/geo.js`

`js/geo.js` exposes `window.HearthGeo` (`haversineMiles`, `lookupZip`, `nearestCenters`)
against `HEARTH_ZIPS` / `HEARTH_CITIES` if those globals exist. The live app uses the
built-in helpers in `app.js` instead. Source ZIP object map lives in
`/workspace/hearth-data/zips.js` for tooling / verify scripts.

## If `app.js` regresses to string `.includes`

See previous contract: call `HearthGeo.nearestCenters(loc, getCenters(), { limit: 3, needs })`
inside `matchCenters`, and sort directory results by distance when `lookupZip` resolves.
