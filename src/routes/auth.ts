import { Router } from "express";
import {
  verifyController,
  loginController,
  logoutController,
  registerController,
  refreshController,
  forgotPasswordController,
  resetPasswordController,
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
