const axios = require("axios");

// this is not async by choice!
// well, it is now. if the user is not authorized, they will wait a couple of ms.

module.exports = {
  createLog: async (text, ip) => {
    try {
      await axios.put(
        `${process.env.COUCH}/logs/${Math.random().toString(36).substr(2, 9)}`,
        { ip: ip, message: text, timestamp: +new Date() },
        {
          auth: {
            username: process.env.COUCH_USER,
            password: process.env.COUCH_PW,
          },
        }
      );
    } catch {}
  },
};
