import { Router } from "express";
import {
  verifyController,
  loginController,
  logoutController,
  registerController,
  refreshController,
} from "../controllers/authController";
import {
  registerWithGoogle,
  loginWithGoogle,
} from "../controllers/googleController";
import { body } from "express-validator";
const authRouter = Router();
authRouter.route("/").post(loginController);
authRouter.route("/verify/:userId/:token").post(verifyController);
authRouter.route("/logout").post(logoutController);
authRouter.route("/refresh").post(refreshController);
authRouter
  .route("/register")
  .post(
    [body("email").isEmail().withMessage("Invalid Email address")],
    registerController,
  );

// using social logins
authRouter.route("/google").post(loginWithGoogle);
authRouter.route("/google/register").post(registerWithGoogle);

export default authRouter;
