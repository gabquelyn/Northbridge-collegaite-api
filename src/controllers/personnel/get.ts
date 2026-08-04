import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import personnel from "../../model/personnel";
const getPersonnelHandler = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const personnels = await personnel
      .find({})
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return res.status(200).json({ personnels });
  },
);

export default getPersonnelHandler;
