const https = require("https");

const data = JSON.stringify({
  identifier: "0653274741",
  password: "Tzdraft@1234",
});

const options = {
  hostname: "api.tzdraft.co.tz",
  port: 443,
  path: "/auth/login",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": data.length,
  },
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.setEncoding("utf8");
  res.on("data", (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on("error", (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
