import { Router } from "express";
import {
  getCoursesCategories,
  getMycourses,
  getOnlineCourses,
} from "../controllers/application/courses";
import VerifyJWT from "../middlewares/VerifyJwt";
import enrolCourses from "../controllers/application/enrolcourses";
import cacheMiddleware from "../middlewares/cache";
const courseRouter = Router();

courseRouter.get("/apply", getOnlineCourses);
courseRouter.post("/enrol", VerifyJWT, enrolCourses);
courseRouter.get("/my", VerifyJWT, getMycourses);
courseRouter.get("/categories", cacheMiddleware, getCoursesCategories);

export default courseRouter;
