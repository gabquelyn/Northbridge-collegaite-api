import Router from "express";
import { inquire } from "../controllers/consultation/inquire";
import { body } from "express-validator";
const consultationRouter = Router();

consultationRouter.post("/", inquire);

export default consultationRouter;
