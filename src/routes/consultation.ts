import Router from "express";
import { inquire } from "../controllers/consultation/inquire";
const consultationRouter = Router();

consultationRouter.post("/", inquire);

export default consultationRouter;
