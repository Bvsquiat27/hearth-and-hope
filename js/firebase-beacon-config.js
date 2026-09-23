/**
 * Firebase config for Postpartum Beacon live sync.
 *
 * SETUP (one-time, free Spark plan):
 * 1. https://console.firebase.google.com/ → Add project “hearth-and-hope-beacons”
 * 2. Build → Realtime Database → Create (start in test mode, then paste rules below)
 * 3. Project settings → Your apps → Web app → copy config into HEARTH_FIREBASE below
 * 4. Set configured: true
 *
 * RTDB rules (public read; shaped public write; no PII):
 * {
 *   "rules": {
 *     "beacons": {
 *       ".read": true,
 *       "$bid": {
 *         ".write": "!data.exists() || !newData.exists() || (newData.hasChildren(['lat','lng','createdAt','expiresAt']) && newData.child('expiresAt').val() <= (now + 172800000) && newData.child('expiresAt').val() > now)",
 *         "lat": { ".validate": "newData.isNumber() && newData.val() >= -90 && newData.val() <= 90" },
 *         "lng": { ".validate": "newData.isNumber() && newData.val() >= -180 && newData.val() <= 180" },
 *         "createdAt": { ".validate": "newData.isNumber()" },
 *         "expiresAt": { ".validate": "newData.isNumber()" },
 *         "coarseZip": { ".validate": "newData.isString() && newData.val().length <= 10" },
 *         "notes": {
 *           "$nid": {
 *             ".write": "!data.exists() && newData.hasChildren(['text','createdAt'])",
 *             "text": { ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 200" },
 *             "createdAt": { ".validate": "newData.isNumber()" },
 *             "fromLabel": { ".validate": "newData.isString() && newData.val().length <= 40" }
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 *
 * Never put baby-tracker / personal schedule data in this public DB.
 */
window.HEARTH_FIREBASE = {
  configured: false,
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  /* Optional free REST fallback (same shape as /beacons). Leave empty when using Firebase. */
  restBaseUrl: ""
};
