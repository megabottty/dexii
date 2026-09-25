/**
 * Push delivery to phones.
 *
 *  - Web Push -> browsers / installed PWA (Android Chrome, iOS 16.4+ home
 *                screen app, desktop). Zero configuration: VAPID keys are
 *                generated once and kept in the AppConfig collection.
 *  - iOS     -> Apple Push Notification service (APNs), token-based auth.
 *  - Android -> Firebase Cloud Messaging (FCM) via firebase-admin.
 *
 * The native providers are optional: when their env vars are missing the
 * sender is skipped and a single line is logged at boot.
 *
 * Env vars:
 *   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY  optional; override the stored keys
 *   VAPID_SUBJECT   contact for push services, defaults to mailto:support@dexii.app
 *   APNS_KEY        contents of the .p8 auth key (newlines may be escaped as \n)
 *   APNS_KEY_ID     10-character key id from the Apple developer portal
 *   APNS_TEAM_ID    10-character Apple team id
 *   APNS_BUNDLE_ID  defaults to com.dexii.app
 *   APNS_PRODUCTION "true" for App Store / TestFlight builds, "false" for Xcode dev builds
 *   FIREBASE_SERVICE_ACCOUNT  service-account JSON (raw or base64-encoded)
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const AppConfig = require('../models/AppConfig');

let apnProvider = null;
let fcmMessaging = null;
let initialised = false;

let webPush = null;          // the web-push module, once configured
let vapidPublicKey = null;
let webPushInit = null;      // promise so concurrent callers share one setup

const VAPID_CONFIG_KEY = 'webPush.vapid';

const waitForMongo = () => new Promise((resolve) => {
  if (mongoose.connection.readyState === 1) return resolve(true);
  const done = (ok) => { cleanup(); resolve(ok); };
  const onConnected = () => done(true);
  const onError = () => done(false);
  const timer = setTimeout(() => done(mongoose.connection.readyState === 1), 20000);
  const cleanup = () => {
    clearTimeout(timer);
    mongoose.connection.off('connected', onConnected);
    mongoose.connection.off('error', onError);
  };
  mongoose.connection.once('connected', onConnected);
  mongoose.connection.once('error', onError);
});

/** Loads (or generates and stores) VAPID keys and configures web-push. */
const ensureWebPush = () => {
  if (webPushInit) return webPushInit;
  webPushInit = (async () => {
    try {
      const lib = require('web-push');
      let publicKey = process.env.VAPID_PUBLIC_KEY;
      let privateKey = process.env.VAPID_PRIVATE_KEY;

      if (!publicKey || !privateKey) {
        if (!(await waitForMongo())) {
          console.log('Push: Web Push waiting on MongoDB for VAPID keys; disabled until it connects.');
          webPushInit = null;
          return false;
        }
        let stored = await AppConfig.findOne({ key: VAPID_CONFIG_KEY }).lean();
        if (!stored?.value?.publicKey || !stored?.value?.privateKey) {
          const generated = lib.generateVAPIDKeys();
          stored = await AppConfig.findOneAndUpdate(
            { key: VAPID_CONFIG_KEY },
            { $setOnInsert: { value: generated } },
            { new: true, upsert: true }
          ).lean();
          console.log('Push: generated new VAPID keys for Web Push.');
        }
        publicKey = stored.value.publicKey;
        privateKey = stored.value.privateKey;
      }

      lib.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:support@dexii.app', publicKey, privateKey);
      webPush = lib;
      vapidPublicKey = publicKey;
      console.log('Push: Web Push ready.');
      return true;
    } catch (err) {
      console.warn('Push: Web Push setup failed:', err.message);
      webPushInit = null;
      return false;
    }
  })();
  return webPushInit;
};

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

  void ensureWebPush();

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

const isEnabled = async () => {
  init();
  const web = await ensureWebPush();
  return Boolean(web || apnProvider || fcmMessaging);
};

const getVapidPublicKey = async () => {
  init();
  return (await ensureWebPush()) ? vapidPublicKey : null;
};

/**
 * Sends to browser subscriptions. The payload follows the Angular service
 * worker's format so ngsw displays it and handles the click navigation.
 * Returns endpoints that are gone and should be removed.
 */
const sendWebPush = async (subscriptions, { title, body, data, badge }) => {
  if (!webPush || !subscriptions.length) return [];
  const route = data?.route || '/feed';
  const payload = JSON.stringify({
    notification: {
      title,
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data?.notificationId || undefined,
      renotify: false,
      data: {
        ...stringifyData(data),
        onActionClick: {
          default: { operation: 'navigateLastFocusedOrOpen', url: route }
        }
      }
    }
  });

  const stale = [];
  await Promise.all(subscriptions.map(async (sub) => {
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload,
        { TTL: 60 * 60 * 24, urgency: 'high' }
      );
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        stale.push(sub.endpoint);
      } else {
        console.warn('Push: Web Push send failed:', err.statusCode || '', err.message);
      }
    }
  }));
  return stale;
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
    if (!userId || !(await isEnabled())) return;

    const user = await User.findById(userId).select('pushTokens webPushSubscriptions').lean();
    const tokens = user?.pushTokens || [];
    const subscriptions = user?.webPushSubscriptions || [];
    if (!tokens.length && !subscriptions.length) return;

    const ios = tokens.filter((t) => t.platform === 'ios').map((t) => t.token);
    const android = tokens.filter((t) => t.platform === 'android').map((t) => t.token);

    const [staleIos, staleAndroid, staleWeb] = await Promise.all([
      sendApns(ios, message).catch((err) => { console.warn('Push: APNs error:', err.message); return []; }),
      sendFcm(android, message).catch((err) => { console.warn('Push: FCM error:', err.message); return []; }),
      sendWebPush(subscriptions, message).catch((err) => { console.warn('Push: Web Push error:', err.message); return []; })
    ]);

    const stale = [...staleIos, ...staleAndroid];
    if (stale.length) {
      await User.updateOne({ _id: userId }, { $pull: { pushTokens: { token: { $in: stale } } } });
    }
    if (staleWeb.length) {
      await User.updateOne({ _id: userId }, { $pull: { webPushSubscriptions: { endpoint: { $in: staleWeb } } } });
    }
  } catch (err) {
    console.warn('Push: sendToUser failed:', err.message);
  }
};

module.exports = { init, isEnabled, getVapidPublicKey, sendToUser };
