import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { uploadFilesFromPaths } from "../../utils/application";
import blog from "../../model/blog";
import { validationResult } from "express-validator";
const createBlogHandler = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { title, description, content } = req.body;
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
    if (!fileFields?.images) {
      return res.status(400).json({ message: `Missing blog images` });
    }

    const files = Object.keys(fileFields).reduce(
      (acc, key) => {
        acc[key] = fileFields[key].map((f) => f.path);
        return acc;
      },
      {} as Record<string, string[]>,
    );
    
    const uploadedFiles = await uploadFilesFromPaths(files, "blogs");
    await blog.create({
      title,
      description,
      content,
      images: uploadedFiles.images,
    });

    return res.status(201).json({ message: "Blog post created" });
  },
);

export default createBlogHandler;
