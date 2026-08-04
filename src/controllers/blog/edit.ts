import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Blog from "../../model/blog";
import { validationResult } from "express-validator";
import { uploadFilesFromPaths } from "../../utils/application";
const editBlogHandler = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const { title, description, content } = req.body;

    const blog = await Blog.findById(id).exec();
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    const error = validationResult(req);
    if (!error.isEmpty()) {
      return res.status(400).json({
        message: error
          .array()
          .map((e) => (e.type === "field" ? `${e.path}: ${e.msg}` : e.msg))
          .join(", "),
      });
    }

    const fileFields = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    if (fileFields?.images) {
      const files = Object.keys(fileFields).reduce(
        (acc, key) => {
          acc[key] = fileFields[key].map((f) => f.path);
          return acc;
        },
        {} as Record<string, string[]>,
      );

      const uploadedFiles = await uploadFilesFromPaths(files, "blogs");
      blog.images = uploadedFiles.images;
    }
    blog.description = description;
    blog.title = title;
    blog.content = content;
    await blog.save();
    return res.status(201).json({ messaga: "Blog updated" });
  },
);

export default editBlogHandler;
