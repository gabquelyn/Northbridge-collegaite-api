import Router from "express";
import { inquire } from "../controllers/consultation/inquire";
import { body } from "express-validator";
import { upload } from "../config/multer";
import { joinApplication } from "../controllers/consultation/join";
const consultationRouter = Router();

consultationRouter.post("/", inquire);
consultationRouter.post(
  "/join",
  upload.fields([
    { name: "coverLetter", maxCount: 1 },
    { name: "resume", maxCount: 1 },
  ]),
  [body("name").notEmpty().escape(), body("email").isEmail().escape()],
  joinApplication,
);

export default consultationRouter;
