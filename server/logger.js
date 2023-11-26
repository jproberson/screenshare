// logger.js
const winston = require("winston");
const fs = require("fs");
const path = require("path");

const logDir = "logs";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.simple()),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, "/server-logs.log"),
    }),
  ],
});

module.exports = logger;
