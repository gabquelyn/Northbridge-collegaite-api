import Router from "express";
import { inquire } from "../controllers/consultation/inquire";
import { body } from "express-validator";
const consultationRouter = Router();

consultationRouter.post(
  "/",
  [
    body("fullName").notEmpty().escape(),
    body("email").isEmail(),
    body("phoneNumber").isMobilePhone("any"),
    body("country").notEmpty().escape(),
    body("academicBackground").notEmpty().escape(),
    body("pathway").notEmpty().escape(),
  ],
  inquire,
);

export default consultationRouter;
