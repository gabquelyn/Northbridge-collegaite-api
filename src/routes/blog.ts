import { Router } from "express";
import createBlogHandler from "../controllers/blog/create";
import VerifyJWT from "../middlewares/VerifyJwt";
import OnlyAdmin from "../middlewares/onlyAdmin";
import { upload } from "../config/multer";
import { body } from "express-validator";
import getBlogsHandler from "../controllers/blog/blogs";
import getBlogHandler from "../controllers/blog/blog";
import editBlogHandler from "../controllers/blog/edit";
import deleteBlogHandler from "../controllers/blog/delete";
import OnlyAdminMod from "../middlewares/OnlyAdminMod";
const blogRoutes = Router();

blogRoutes.post(
  "/",
  VerifyJWT,
  OnlyAdminMod,
  upload.fields([{ name: "images", maxCount: 5 }]),
  [
    body("title").notEmpty().withMessage("Missing blog title"),
    body("description").notEmpty().withMessage("Missing blog description"),
    body("content").notEmpty().withMessage("Missing blog content"),
  ],
  createBlogHandler,
);

blogRoutes.get("/", getBlogsHandler);
blogRoutes.get("/:id", getBlogHandler);

blogRoutes.patch(
  "/:id",
  VerifyJWT,
  OnlyAdminMod,
  upload.fields([{ name: "images", maxCount: 5 }]),
  [
    body("title").notEmpty().withMessage("Missing blog title"),
    body("description").notEmpty().withMessage("Missing blog description"),
    body("content").notEmpty().withMessage("Missing blog content"),
  ],
  editBlogHandler,
);

blogRoutes.delete("/:id", VerifyJWT, OnlyAdmin, deleteBlogHandler);

export default blogRoutes;
