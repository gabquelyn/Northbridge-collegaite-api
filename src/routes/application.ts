import { Router } from "express";
import VerifyJWT from "../middlewares/VerifyJwt";
// import multer, { memoryStorage } from "multer";
import { body } from "express-validator";
import OnlyAdmin from "../middlewares/onlyAdmin";
import cacheMiddleware from "../middlewares/cache";
import { upload } from "../config/multer";
import requestApplication from "../controllers/application/apply";
import approveApplicationRequest from "../controllers/application/approve";
import {
  getApplication,
  getApplications,
} from "../controllers/application/get";
import editApplication from "../controllers/application/edit";
import enrol from "../controllers/application/enrol";
import {
  getCoursesCategories,
  getMycourses,
  getOnlineCourses,
} from "../controllers/application/courses";
import enrolCourses from "../controllers/application/enrolcourses";
import application from "../model/application";
import getApplicationReceipt from "../controllers/application/receipt";

const applicationRouter = Router();

applicationRouter.post(
  "/",
  VerifyJWT,
  upload.fields([
    { name: "transcripts", maxCount: 1 },
    { name: "passport", maxCount: 1 },
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
    body("unit").notEmpty().escape(),
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
          return ["CAAP", "GRADE11", "GRADE12", "AY12"].includes(program);
        }
      }),
  ],
  requestApplication,
);

applicationRouter.post(
  "/approve/:id",
  VerifyJWT,
  OnlyAdmin,
  approveApplicationRequest,
);

applicationRouter.get("/:id", VerifyJWT, getApplication);

applicationRouter.patch(
  "/:id",
  VerifyJWT,
  upload.fields([
    { name: "transcripts", maxCount: 1 },
    { name: "passport", maxCount: 1 },
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
    body("unit").notEmpty().escape(),
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
          return ["CAAP", "GRADE11", "GRADE12", "AY12"].includes(program);
        }
      }),
  ],
  editApplication,
);

applicationRouter.get("/", VerifyJWT, getApplications);
applicationRouter.get("/apply/courses", getOnlineCourses);
applicationRouter.post("/courses/enrol", VerifyJWT, enrolCourses);
applicationRouter.get("/courses/my", VerifyJWT, getMycourses);
applicationRouter.get(
  "/courses/categories",
  cacheMiddleware,
  getCoursesCategories,
);

applicationRouter.post(
  "/enrol/:id",
  [
    body("programs")
      .optional()
      .isArray()
      .custom((value) => {
        for (const program of value) {
          return ["CAAP", "GRADE11", "GRADE12", "AY12"].includes(program);
        }
      })
      .withMessage("Invalid course program selected"),
    body("courses").optional().isArray().withMessage("Missing required fields"),
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

export default applicationRouter;
