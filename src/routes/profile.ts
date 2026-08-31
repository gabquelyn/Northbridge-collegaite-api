import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import { CustomRequest } from "../types/request";
import User from "../model/user";
import VerifyJWT from "../middlewares/VerifyJwt";
import { Router } from "express";
import contactInformationController from "../controllers/profile/bio";
import { body } from "express-validator";
import mailingController from "../controllers/profile/mailing";
import parentHandler from "../controllers/profile/parent";
import academicHandler from "../controllers/profile/academic";
import citizenshipInformation from "../controllers/profile/citizenship";
import { upload } from "../config/multer";
import documentHandler from "../controllers/profile/documents";
import profile from "../model/profile";
import adminPriviledge from "../utils/adminPriviledge";
import modeHandler from "../controllers/profile/mode";
import programController from "../controllers/profile/programs";
import coursesController from "../controllers/profile/courses";
import incompleteController from "../controllers/profile/incomplete";
import OnlyAdminMod from "../middlewares/OnlyAdminMod";

const profileRouter = Router();
profileRouter.get(
  "/user",
  VerifyJWT,
  expressAsyncHandler(async (req: Request, res: Response): Promise<any> => {
    const id = (req as CustomRequest).id;
    const user = await User.findById(id, "-password").lean().exec();
    return res.status(200).json({ data: user });
  }),
);

profileRouter.get("/incomplete", VerifyJWT, OnlyAdminMod, incompleteController);

profileRouter.get(
  "/:id",
  VerifyJWT,
  expressAsyncHandler(async (req: Request, res: Response): Promise<any> => {
    const userId = (req as CustomRequest).id;
    const id = req.params.id;
    const prevProfile = await profile
      .findOne({ guardian: userId, _id: id })
      .lean()
      .exec();
    if (!prevProfile)
      return res.status(404).json({ message: "Profile not found" });
    return res.status(200).json({ profile: prevProfile });
  }),
);

profileRouter.post(
  "/",
  VerifyJWT,
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as CustomRequest).id;
    const newProfile = await profile.create({ guardian: userId });
    return res.status(201).json({ id: newProfile._id });
  },
);

profileRouter.patch(
  "/contact/:id",
  VerifyJWT,
  adminPriviledge,
  [
    body("firstName").notEmpty().escape(),
    body("lastName").notEmpty().escape(),
    body("phoneNumber").isMobilePhone("any"),
    body("email").isEmail(),
    body("gender").custom((value) => ["M", "F"].includes(value)),
    body("dob").isDate(),
  ],
  contactInformationController,
);

profileRouter.patch(
  "/mailing/:id",
  VerifyJWT,
  adminPriviledge,
  [
    body("street").notEmpty(),
    body("city").notEmpty(),
    body("country").notEmpty(),
    body("state").notEmpty(),
  ],
  mailingController,
);

profileRouter.patch(
  "/academic/:id",
  VerifyJWT,
  adminPriviledge,
  [
    body("currentSchool").notEmpty().escape(),
    body("homeSchool").notEmpty().escape(),
    body("secondaryEntry").isDate().escape(),
    body("pathway"),
    body("completedSecondaryDiploma").isBoolean(),
  ],
  academicHandler,
);

profileRouter.patch(
  "/citizenship/:id",
  VerifyJWT,
  adminPriviledge,
  [
    body("canadianVisa").isBoolean(),
    body("canadian").isBoolean(),
    body("intendToApply").isBoolean(),
    body("language").notEmpty(),
    body("birthCountry").notEmpty(),
  ],
  citizenshipInformation,
);

profileRouter.patch(
  "/mode/:id",
  VerifyJWT,
  adminPriviledge,
  [body("mode").custom((value) => ["on-site", "off-site"].includes(value))],
  modeHandler,
);

profileRouter.patch(
  "/courses/:id",
  VerifyJWT,
  adminPriviledge,
  [body("mode").custom((value) => ["on-site", "off-site"].includes(value))],
  coursesController,
);

profileRouter.patch(
  "/program/:id",
  VerifyJWT,
  adminPriviledge,
  body("programs")
    .isArray()
    .custom((value) => {
      for (const program of value) {
        return ["CAAP", "GRADE11", "GRADE12", "AY12", "DIRECT"].includes(
          program,
        );
      }
    }),
  programController,
);

profileRouter.patch(
  "/courses/:id",
  VerifyJWT,
  adminPriviledge,
  body("courses").isArray().withMessage("courses must be an array"),
  body("courses.*").isNumeric().withMessage("Each course must be a number"),
  coursesController,
);

profileRouter.patch(
  "/documents/:id",
  VerifyJWT,
  adminPriviledge,
  upload.fields([
    { name: "transcripts", maxCount: 3 },
    { name: "passport", maxCount: 1 },
    { name: "birthCert", maxCount: 1 },
    { name: "govId", maxCount: 1 },
    { name: "others", maxCount: 3 },
  ]),
  documentHandler,
);

profileRouter.patch("/parent/:id", VerifyJWT, adminPriviledge, parentHandler);

export default profileRouter;
