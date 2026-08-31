import { CustomRequest } from "../types/request";
import { Response, NextFunction, Request } from "express";
import User from "../model/user";
const OnlyUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = await User.findById((req as CustomRequest).id)
    .lean()
    .exec();
  const role = user?.role;
  if (role !== "user")
    return res
      .status(403)
      .json({ message: "Restricted to user access" });
  next();
};

export default OnlyUser;
