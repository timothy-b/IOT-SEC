// fill in the values and rename to config.js

var Config = {
  whitelistedDevices: [
    {
      mac: "00:00:00:00:00:00",
      name: "my phone"
    }
  ],

  emailServer:  {
    user: "user@example.com",
    password: "password",
    host: "smtp.example.com",
    ssl: true
  },

  emailRecipient: {
    text: "The fortress is in peril.",
    from: "Firstname Lastname <user@example.com>",
    to: "5555555555@messaging.carrier.com",
    ssl: true,
    port: 465
  },

  okResponseBody: `
  <!DOCTYPE "html">
  <html>
    <head>
      <title>Hello World Page</title>
    </head>
    <body>
      Hello World!
    </body>
  </html>
  `,

  basicAuthentication: {
    username: "photon",
    password: "pass"
  }
}

module.exports = Config;
