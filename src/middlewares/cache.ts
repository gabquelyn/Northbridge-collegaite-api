import NodeCache from "node-cache";
import { Request, Response, NextFunction } from "express";
import { RequestWithCahcedKey } from "../types/request";
export const cache = new NodeCache({ stdTTL: 60 });

export default function cacheMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const key = req.originalUrl;
  const cached = cache.get(key);

  if (cached) {
    return res.status(200).json(cached);
  }

  (req as RequestWithCahcedKey).cachedKey = key;
  next();
}
