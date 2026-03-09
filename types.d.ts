import { Request } from "express";
interface CustomRequest extends Request {
  email: string;
  id: string;
}

type APPLICATION_PROGRAMS = "CAAP" | "GRADE11" | "GRADE12" | "AY12"