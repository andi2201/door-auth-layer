"use strict";

const admin = require("firebase-admin");
admin.initializeApp();

// {
//     credential: admin.credential.applicationDefault(),
//     databaseURL: "https://open-door-be.firebaseio.com",
//   }

require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser")();
const cors = require("cors")({
  origin: true,
});

const app = express();

const axios = require("axios");

// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.
const validateFirebaseIdToken = async (req, res, next) => {
  // console.log("Check if request is authorized with Firebase ID token");
  if (
    (!req.headers.authorization ||
      !req.headers.authorization.startsWith("Bearer ")) &&
    !(req.cookies && req.cookies.__session)
  ) {
    console.error(
      "No Firebase ID token was passed as a Bearer token in the Authorization header.",
      "Make sure you authorize your request by providing the following HTTP header:",
      "Authorization: Bearer <Firebase ID Token>",
      'or by passing a "__session" cookie.'
    );
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
    res.status(403).send("Unauthorized");
    return;
  }

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedIdToken;
    next();
    return;
  } catch (error) {
    console.error("Error while verifying Firebase ID token:", error);
    res.status(403).send("Unauthorized");
    return;
  }
};

app.use(cors);
app.use(cookieParser);
app.use(validateFirebaseIdToken);

app.listen(process.env.PORT || 8082);

app.get("/", async (req, res) => {
  const db = admin.firestore();
  const userRef = await db.collection("users").doc(req.user.uid).get();

  if (userRef.data().isAuthorized === true) {
    // call endpoint to open the door
    try {
      const openResult = await axios.get(process.env.SHELLY, { timeout: 3000 });
      // console.log(openResult.data);

      if (openResult.data?.ison) {
        // TODO: user x opened the door.
        res.send({
          ok: true,
        });
      } else {
        // TODO: user x tried to open the door, shelly didnt work.
        res.send({
          ok: false,
        });
      }
    } catch {
      // TODO: user x tried to open the door, something exceptionally bad happened.
      res.send({
        ok: false,
      });
    }
  }else{
    // TODO: user x tried to open the door but is not authorized.
    res.send({
      authorized: false,
      ok: false,
    });
  }
});
