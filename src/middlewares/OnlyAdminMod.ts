import { CustomRequest } from "../types/request";
import { Response, NextFunction, Request } from "express";
import User from "../model/user";
const OnlyAdminMod = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = await User.findById((req as CustomRequest).id)
    .lean()
    .exec();
  const role = user?.role;
  if (role !== "moderator" && role !== "admin")
    return res
      .status(403)
      .json({ message: "Restricted to admin moderator access" });
  next();
};

export default OnlyAdminMod;
