import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Blog from "../../model/blog";
const deleteBlogHandler = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    await Blog.findByIdAndDelete(id).lean().exec();
    return res.status(201).json({ message: "Blog deleted" });
  },
);

export default deleteBlogHandler;
