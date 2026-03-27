import { Router } from "express";
import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import { CustomRequest } from "../types/request";
import User from "../model/user";
import VerifyJWT from "../middlewares/VerifyJwt";
const profileRouter = Router();
profileRouter.get(
  "/",
  VerifyJWT,
  expressAsyncHandler(async (req: Request, res: Response): Promise<any> => {
    const id = (req as CustomRequest).id;
    const user = await User.findById(id, "-password").lean().exec();
    return res.status(200).json({ data: user });
  }),
);

export default profileRouter;
