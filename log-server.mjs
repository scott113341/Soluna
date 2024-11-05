import http from "http";

const logServer = http.createServer((req, res) => {
  if (req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => (body += chunk));

    req.on("end", () => {
      console.log(`${getCurrentTimestamp()}: ${body}`);
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Log received\n");
    });
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found\n");
  }
});

logServer.listen(3000, "0.0.0.0", () => console.log(`Server started`));

function getCurrentTimestamp() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const milliseconds = String(now.getMilliseconds()).padStart(3, "0");

  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}
