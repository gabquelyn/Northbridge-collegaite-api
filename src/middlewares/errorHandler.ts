import { Request, Response, NextFunction } from "express";
import { logEvents } from "./logger";

export default function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logEvents(
    `${err.message}\t${req.method}\t${req.url}\t${req.headers?.origin}`,
    "errorLog.log"
  );
  
  console.error({ error: err.stack });

  // Send error response
  return res.status(500).json({ error: err.stack });
}