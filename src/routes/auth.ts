import { Router } from "express";
import { body } from "express-validator";
import loginController from "../controllers/auth/login";
import verifyController from "../controllers/auth/verify";
import logoutController from "../controllers/auth/logout";
import refreshController from "../controllers/auth/refresh";
import resetPasswordController from "../controllers/auth/reset";
import forgotPasswordController from "../controllers/auth/forgot";
import registerController from "../controllers/auth/register";
import {
  loginWithGoogle,
  registerWithGoogle,
} from "../controllers/auth/google";

const authRouter = Router();
authRouter.route("/").post(loginController);
authRouter.route("/verify/:userId/:token").post(verifyController);
authRouter.route("/logout").post(logoutController);
authRouter.route("/refresh").get(refreshController);
authRouter
  .route("/reset/:token")
  .post(
    [body("password").custom((val, { req }) => val.length >= 8)],
    resetPasswordController,
  );
authRouter.route("/forgot").post(forgotPasswordController);
authRouter.route("/register").post(
  [
    body("email").isEmail().withMessage("Invalid Email address"),
    body("name").notEmpty().withMessage("Enter full name"),
    body("password")
      .custom((val, { req }) => val.length >= 8)
      .withMessage("Password should be a minimum of 8 char"),
  ],
  registerController,
);

// using social logins
authRouter.route("/google").post(loginWithGoogle);
authRouter.route("/google/register").post(registerWithGoogle);

export default authRouter;
