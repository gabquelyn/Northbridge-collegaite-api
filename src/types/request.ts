import { Request } from "express";
export interface CustomRequest extends Request {
  email: string;
  id: string;
}

export interface RequestWithCahcedKey extends Request {
  cachedKey: string;
}