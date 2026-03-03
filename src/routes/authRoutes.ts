import { Router } from "express";
import {
  verifyController,
  loginController,
  logoutController,
  registerController,
} from "../controllers/authController";
import {
  registerWithGoogle,
  loginWithGoogle,
} from "../controllers/googleController";
const authRouter = Router();
authRouter.route("/").post(loginController);
authRouter.route("/verify").post(verifyController);
authRouter.route("/logout").post(logoutController);
authRouter.route("/register").post(registerController);

// using social logins
authRouter.route("/google").post(loginWithGoogle);
authRouter.route("/google/register").post(registerWithGoogle);

export default authRouter;
