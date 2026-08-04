import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import blog from "../../model/blog";
const getBlogsHandler = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const blogs = await blog.find({}).sort({ createdAt: -1 }).lean().exec();
    return res.status(201).json({ blogs });
  },
);

export default getBlogsHandler;
