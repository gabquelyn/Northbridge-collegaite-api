import { format } from "date-fns";
import { v4 as uuid } from "uuid";
import { Response, Request, NextFunction } from "express";
import fs from "fs";
import path from "path";
export const logEvents = async (message: string, filename: string) => {
  const date = format(new Date(), "yyyyMMdd\tHH:mm:ss");
  const logItem = `${date}\t${uuid()}\t${message}\n`;

  try {
    if (!fs.existsSync(path.join(__dirname, "..", "logs"))) {
      await fs.promises.mkdir(path.join(__dirname, "..", "logs"));
    }
    await fs.promises.appendFile(
      path.join(__dirname, "..", "logs", filename),
      logItem
    );
  } catch (err) {
    console.log(err);
  }
};

export default function logger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  logEvents(
    `${req.method}\t${req.url}\t${req.headers.origin}\t${req.ip}`,
    "req.log"
  );

  console.log(`${req.method}\t${req.path}`);
  next();
}
