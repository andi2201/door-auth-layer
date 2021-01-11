"use strict";

const admin = require("firebase-admin");
admin.initializeApp();

require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser")();
const cors = require("cors")({
  origin: true,
});

const app = express();

const axios = require("axios");

const couch = require("./couch");

// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.
const validateFirebaseIdToken = async (req, res, next) => {

  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded ? forwarded.split(/, /)[0] : req.connection.remoteAddress

  // console.log("Check if request is authorized with Firebase ID token");
  if (
    (!req.headers.authorization ||
      !req.headers.authorization.startsWith("Bearer ")) &&
    !(req.cookies && req.cookies.__session)
  ) {
    // console.error(
    //   "No Firebase ID token was passed as a Bearer token in the Authorization header.",
    //   "Make sure you authorize your request by providing the following HTTP header:",
    //   "Authorization: Bearer <Firebase ID Token>",
    //   'or by passing a "__session" cookie.'
    // );
    await couch.createLog("-> No Bearer token and no cookie.", ip);
    res.status(403).send("Unauthorized");
    return;
  }

  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    // console.log('Found "Authorization" header');
    // Read the ID Token from the Authorization header.
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else if (req.cookies) {
    // console.log('Found "__session" cookie');
    // Read the ID Token from cookie.
    idToken = req.cookies.__session;
  } else {
    // No cookie
    await couch.createLog("No Bearer token and no cookie.", ip);
    res.status(403).send("Unauthorized");
    return;
  }

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedIdToken;
    next();
    return;
  } catch (error) {
    // console.error("Error while verifying Firebase ID token:", error);
    await couch.createLog("ID token not valid.", ip);
    res.status(403).send("Unauthorized");
    return;
  }
};

app.use(cors);
app.use(cookieParser);
app.use(validateFirebaseIdToken);

app.listen(process.env.PORT || 8082);

function logEvent(db, userId, userName, message, ok) {
  const logObj = {
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    userId: userId,
    userName: userName,
    message: message,
    ok: ok,
  };
  try {
    // intentionally not awaiting
    db.collection("logs").add(logObj);
  } catch {}
}

app.get("/", async (req, res) => {
  const db = admin.firestore();
  const userRef = await db.collection("users").doc(req.user.uid).get();

  if (userRef.data().isAuthorized === true) {
    try {
      const openResult = await axios.get(process.env.SHELLY, { timeout: 3000 });

      if (openResult.data?.ison) {
        logEvent(
          db,
          req.user.uid,
          userRef.data().name,
          `${userRef.data().name} opened the door.`,
          true
        );

        res.send({
          ok: true,
        });
      } else {
        logEvent(
          db,
          req.user.uid,
          userRef.data().name,
          `${
            userRef.data().name
          } tried to open but shelly didnt work properly.`,
          false
        );
        res.send({
          ok: false,
        });
      }
    } catch {
      logEvent(
        db,
        req.user.uid,
        userRef.data().name,
        `${userRef.data().name} tried to open but shelly seems to not respond.`,
        false
      );
      res.send({
        ok: false,
      });
    }
  } else {
    logEvent(
      db,
      req.user.uid,
      userRef.data().name,
      `${userRef.data().name} tried to open but is not authorized.`,
      false
    );
    res.send({
      authorized: false,
      ok: false,
    });
  }
});
