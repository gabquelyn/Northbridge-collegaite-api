import { Router } from "express";
import VerifyJWT from "../middlewares/VerifyJwt";
import {
  getApplications,
  approveApplicationRequest,
  requestApplication,
  getOnlineCourses,
  getPayments,
  enrol,
} from "../controllers/admissionControllers";
import multer, { memoryStorage } from "multer";
import { body } from "express-validator";
import OnlyAdmin from "../middlewares/onlyAdmin";
import cacheMiddleware from "../middlewares/cache";

const storage = memoryStorage();
const allowedMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

const applicationRouter = Router();

applicationRouter.post(
  "/",
  VerifyJWT,
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
    body("secondaryCompletion").isDate().escape(),
    body("pathway").notEmpty().escape(),
    body("completedSecondaryDiploma").isBoolean(),
    body("canadianVisa").isBoolean(),
    body("intendToApply").isBoolean(),
    body("language").notEmpty(),
    body("country").notEmpty(),
    body("country").notEmpty(),
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
  upload.fields([
    { name: "transcripts", maxCount: 1 },
    { name: "govId", maxCount: 1 },
    { name: "others", maxCount: 3 },
  ]),
  requestApplication,
);

applicationRouter.post("/:id", VerifyJWT, OnlyAdmin, approveApplicationRequest);
applicationRouter.get("/", VerifyJWT, getApplications);
applicationRouter.get("/courses", cacheMiddleware, getOnlineCourses);
applicationRouter.get("/payments", VerifyJWT, OnlyAdmin, getPayments);
applicationRouter.post(
  "/enrol/:profile",
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

export default applicationRouter;
