import { Router } from "express";
import VerifyJWT from "../middlewares/VerifyJwt";
import { body } from "express-validator";
import OnlyAdmin from "../middlewares/onlyAdmin";
import { upload } from "../config/multer";
import requestApplication from "../controllers/application/apply";
import approveApplicationRequest from "../controllers/application/approve";
import {
  getApplication,
  getApplications,
} from "../controllers/application/get";
import editApplication from "../controllers/application/edit";
import enrol from "../controllers/application/enrol";
import getApplicationReceipt from "../controllers/application/receipt";
import reviewApplication from "../controllers/application/review";
import payOutstanding from "../controllers/application/outsanding";
import getFile from "../controllers/application/getFile";
import deleteApplication from "../controllers/application/deleteApplication";
import rescindApplication from "../controllers/application/rescind";
import payController from "../controllers/application/pay";
import discountHandler from "../controllers/application/discount";

const applicationRouter = Router();

applicationRouter.post(
  "/:id",
  VerifyJWT,
  upload.fields([
    { name: "transcripts", maxCount: 3 },
    { name: "passport", maxCount: 1 },
    { name: "birthCert", maxCount: 1 },
    { name: "govId", maxCount: 1 },
    { name: "others", maxCount: 3 },
  ]),
  [
    body("firstName").notEmpty().escape(),
    body("lastName").notEmpty().escape(),
    body("phoneNumber").isMobilePhone("any"),
    body("email").isEmail(),
    body("dob").isDate(),
    body("gender").custom((value) => ["M", "F"].includes(value)),
    body("street").notEmpty().escape(),
    body("city").notEmpty().escape(),
    body("currentSchool").notEmpty().escape(),
    body("homeSchool").notEmpty().escape(),
    body("secondaryEntry").isDate().escape(),
    // body("secondaryCompletion").isDate().escape(),
    body("pathway").notEmpty().escape(),
    body("completedSecondaryDiploma").isBoolean(),
    body("canadianVisa").isBoolean(),
    body("canadian").isBoolean(),
    body("intendToApply").isBoolean(),
    body("language").notEmpty(),
    body("country").notEmpty(),
    body("referrer").notEmpty(),
    body("birthCountry").notEmpty(),
    body("mode").custom((value) => ["on-site", "off-site"].includes(value)),
    body("programs")
      .optional()
      .custom((value) => {
        const programs: APPLICATION_PROGRAMS[] = JSON.parse(value);
        for (const program of programs) {
          return ["CAAP", "GRADE11", "GRADE12", "AY12", "DIRECT"].includes(
            program,
          );
        }
      }),
  ],
  requestApplication,
);

applicationRouter.get("/document", VerifyJWT, getFile);

applicationRouter.post(
  "/approve/:id",
  VerifyJWT,
  OnlyAdmin,
  approveApplicationRequest,
);

applicationRouter.patch(
  "/discount/:id",
  [
    body("discount")
      .notEmpty()
      .isNumeric()
      .custom((val, { req }) => {
        return val <= 50;
      }),
    body("discountExpires")
      .isDate()
      .withMessage("Discount expires date must be a valid date")
      .isAfter()
      .withMessage("Discount expires date must be after today"),
  ],
  VerifyJWT,
  OnlyAdmin,
  discountHandler,
);

applicationRouter.post(
  "/rescind/:id",
  VerifyJWT,
  OnlyAdmin,
  rescindApplication,
);

applicationRouter.post("/fee/:id", VerifyJWT, payController);

applicationRouter.get("/:id", VerifyJWT, getApplication);

applicationRouter.patch(
  "/:id",
  VerifyJWT,
  upload.fields([
    { name: "transcripts", maxCount: 1 },
    { name: "passport", maxCount: 1 },
    { name: "govId", maxCount: 1 },
    { name: "birthCert", maxCount: 1 },
    { name: "others", maxCount: 3 },
  ]),
  [
    body("firstName").notEmpty().escape(),
    body("lastName").notEmpty().escape(),
    body("phoneNumber").isMobilePhone("any"),
    body("email").isEmail(),
    body("dob").isDate(),
    body("gender").custom((value) => ["M", "F"].includes(value)),
    body("street").notEmpty().escape(),
    body("city").notEmpty().escape(),
    body("currentSchool").notEmpty().escape(),
    body("homeSchool").notEmpty().escape(),
    body("secondaryEntry").isDate().escape(),
    // body("secondaryCompletion").isDate().escape(),
    body("pathway").notEmpty().escape(),
    body("completedSecondaryDiploma").isBoolean(),
    body("canadianVisa").isBoolean(),
    body("canadian").isBoolean(),
    body("intendToApply").isBoolean(),
    body("language").notEmpty(),
    body("country").notEmpty(),
    body("birthCountry").notEmpty(),
    body("mode").custom((value) => ["on-site", "off-site"].includes(value)),
    body("programs")
      .optional()
      .custom((value) => {
        const programs: APPLICATION_PROGRAMS[] = JSON.parse(value);
        for (const program of programs) {
          return ["CAAP", "GRADE11", "GRADE12", "AY12", "DIRECT"].includes(
            program,
          );
        }
      }),
  ],
  editApplication,
);

applicationRouter.get("/", VerifyJWT, getApplications);
applicationRouter.post("/pay/:id", VerifyJWT, payOutstanding);

applicationRouter.post(
  "/enrol/:id",
  [
    body("programs")
      .isArray()
      .custom((value) => {
        for (const program of value) {
          return ["CAAP", "GRADE11", "GRADE12", "AY12"].includes(program);
        }
      })
      .withMessage("Invalid course program selected"),
  ],
  VerifyJWT,
  enrol,
);

applicationRouter.get(
  "/receipt/:id",
  VerifyJWT,
  OnlyAdmin,
  getApplicationReceipt,
);

applicationRouter.delete("/:id", VerifyJWT, OnlyAdmin, deleteApplication);

applicationRouter.post("/review/:id", VerifyJWT, OnlyAdmin, reviewApplication);

export default applicationRouter;
