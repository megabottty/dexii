/**
 * Test helpers. Tests never touch a database: the local .env points at production,
 * so Mongoose is told to fail fast instead of buffering queries.
 */
const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

/** A minimal Express-like response that records what the handler sent. */
const fakeRes = () => {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.send = (body) => { res.body = body; return res; };
  return res;
};

/** A request from a signed-in user, with an app that has no socket server. */
const fakeReq = ({ userId = '6aa2f82237d736a1196c9e1d', body = {}, params = {}, query = {} } = {}) => ({
  user: { id: userId },
  body,
  params,
  query,
  app: { get: () => null }
});

module.exports = { fakeReq, fakeRes };

/** A chainable stand-in for a Mongoose query that resolves to `result`. */
const fakeQuery = (result) => {
  const query = {
    select: () => query, limit: () => query, sort: () => query, populate: () => query, lean: () => query,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  };
  return query;
};

/** Makes handlers believe the database is connected, without connecting. Returns an undo function. */
const pretendConnected = () => {
  Object.defineProperty(mongoose.connection, 'readyState', { get: () => 1, configurable: true });
  return () => { delete mongoose.connection.readyState; };
};

module.exports.fakeQuery = fakeQuery;
module.exports.pretendConnected = pretendConnected;
