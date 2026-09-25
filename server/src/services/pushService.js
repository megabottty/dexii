/**
 * Native push delivery for the Capacitor apps.
 *
 *  - iOS   -> Apple Push Notification service (APNs), token-based auth.
 *  - Android -> Firebase Cloud Messaging (FCM) via firebase-admin.
 *
 * Both providers are optional: when their env vars are missing the sender is
 * skipped and a single warning is logged at boot, so the web app keeps working.
 *
 * Env vars:
 *   APNS_KEY        contents of the .p8 auth key (newlines may be escaped as \n)
 *   APNS_KEY_ID     10-character key id from the Apple developer portal
 *   APNS_TEAM_ID    10-character Apple team id
 *   APNS_BUNDLE_ID  defaults to com.dexii.app
 *   APNS_PRODUCTION "true" for App Store / TestFlight builds, "false" for Xcode dev builds
 *   FIREBASE_SERVICE_ACCOUNT  service-account JSON (raw or base64-encoded)
 */
const User = require('../models/User');

let apnProvider = null;
let fcmMessaging = null;
let initialised = false;

const parseServiceAccount = (raw) => {
  if (!raw) return null;
  const text = raw.trim();
  try {
    return JSON.parse(text.startsWith('{') ? text : Buffer.from(text, 'base64').toString('utf8'));
  } catch (err) {
    console.warn('FIREBASE_SERVICE_ACCOUNT is not valid JSON or base64 JSON:', err.message);
    return null;
  }
};

const init = () => {
  if (initialised) return;
  initialised = true;

  const { APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID } = process.env;
  if (APNS_KEY && APNS_KEY_ID && APNS_TEAM_ID) {
    try {
      const apn = require('@parse/node-apn');
      apnProvider = new apn.Provider({
        token: {
          key: Buffer.from(APNS_KEY.replace(/\\n/g, '\n')),
          keyId: APNS_KEY_ID,
          teamId: APNS_TEAM_ID
        },
        production: process.env.APNS_PRODUCTION !== 'false'
      });
      console.log('Push: APNs provider ready.');
    } catch (err) {
      console.warn('Push: APNs setup failed:', err.message);
    }
  } else {
    console.log('Push: APNs not configured (APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID). iOS pushes disabled.');
  }

  const serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (serviceAccount) {
    try {
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      }
      fcmMessaging = admin.messaging();
      console.log('Push: Firebase Cloud Messaging ready.');
    } catch (err) {
      console.warn('Push: Firebase setup failed:', err.message);
    }
  } else {
    console.log('Push: Firebase not configured (FIREBASE_SERVICE_ACCOUNT). Android pushes disabled.');
  }
};

const isEnabled = () => {
  init();
  return Boolean(apnProvider || fcmMessaging);
};

const stringifyData = (data = {}) => Object.fromEntries(
  Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)])
);

const sendApns = async (tokens, { title, body, data, badge }) => {
  if (!apnProvider || !tokens.length) return [];
  const apn = require('@parse/node-apn');
  const note = new apn.Notification();
  note.topic = process.env.APNS_BUNDLE_ID || 'com.dexii.app';
  note.alert = { title, body };
  note.sound = 'default';
  note.payload = stringifyData(data);
  note.mutableContent = false;
  if (typeof badge === 'number') note.badge = badge;

  const result = await apnProvider.send(note, tokens);
  const stale = [];
  for (const failure of result.failed || []) {
    const reason = failure.response?.reason || failure.error?.message;
    if (['BadDeviceToken', 'Unregistered', 'DeviceTokenNotForTopic'].includes(reason)) {
      stale.push(failure.device);
    } else {
      console.warn('Push: APNs send failed:', reason);
    }
  }
  return stale;
};

const sendFcm = async (tokens, { title, body, data }) => {
  if (!fcmMessaging || !tokens.length) return [];
  const response = await fcmMessaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: stringifyData(data),
    android: { priority: 'high', notification: { sound: 'default' } }
  });

  const stale = [];
  response.responses.forEach((res, index) => {
    if (res.success) return;
    const code = res.error?.code || '';
    if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
      stale.push(tokens[index]);
    } else {
      console.warn('Push: FCM send failed:', code, res.error?.message);
    }
  });
  return stale;
};

/**
 * Sends a push to every device registered to a user. Never throws; failures are
 * logged so callers can fire-and-forget.
 */
const sendToUser = async (userId, message) => {
  try {
    if (!userId || !isEnabled()) return;

    const user = await User.findById(userId).select('pushTokens').lean();
    const tokens = user?.pushTokens || [];
    if (!tokens.length) return;

    const ios = tokens.filter((t) => t.platform === 'ios').map((t) => t.token);
    const android = tokens.filter((t) => t.platform === 'android').map((t) => t.token);

    const [staleIos, staleAndroid] = await Promise.all([
      sendApns(ios, message).catch((err) => { console.warn('Push: APNs error:', err.message); return []; }),
      sendFcm(android, message).catch((err) => { console.warn('Push: FCM error:', err.message); return []; })
    ]);

    const stale = [...staleIos, ...staleAndroid];
    if (stale.length) {
      await User.updateOne({ _id: userId }, { $pull: { pushTokens: { token: { $in: stale } } } });
    }
  } catch (err) {
    console.warn('Push: sendToUser failed:', err.message);
  }
};

module.exports = { init, isEnabled, sendToUser };
