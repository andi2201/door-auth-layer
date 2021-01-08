const axios = require("axios");

// this is not async by choice!

module.exports = {
  createLog: () => {
    const res = axios.put(
      `${process.env.COUCH}/logs/yeah4`,
      { hello: "world" },
      {
        auth: {
          username: process.env.COUCH_USER,
          password: process.env.COUCH_PW,
        },
      }
    );
    console.log(res);
  },
};
