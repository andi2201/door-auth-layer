const axios = require("axios");

module.exports = {
  createLog: async (text, ip) => {
    try {
      await axios.put(
        `${process.env.COUCH}/logs/${Math.random().toString(36).substr(2, 9)}`,
        { ip: ip, message: text, timestamp: +new Date(), humanTime: new Date(Date.now()) },
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
