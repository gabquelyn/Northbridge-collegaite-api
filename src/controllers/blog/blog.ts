import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Blog from "../../model/blog";
import { getSignedUrl } from "../../config/upload";
const getBlogHandler = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const blog = await Blog.findById(id).lean().exec();
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    const images = await Promise.all(
      blog.images.map(async (i) => {
        const url = await getSignedUrl({
          publicId: i.public_id,
          resourceType: i.resource_type,
          format: i.format,
        });
        return { ...i, url };
      }),
    );
    return res.status(201).json({ blog });
  },
);

export default getBlogHandler;
