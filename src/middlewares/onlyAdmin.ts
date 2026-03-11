import { CustomRequest } from "../types/request";
import { Response, NextFunction, Request } from "express";
import User from "../model/user";
const OnlyAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const user = await User.findById((req as CustomRequest).id)
    .lean()
    .exec();
  if (user?.role !== "admin")
    return res.status(403).json({ message: "Restricted to admin access" });
  next();
};

export default OnlyAdmin;
