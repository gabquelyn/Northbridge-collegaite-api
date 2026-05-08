import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import { getSignedUrl } from "../../config/upload";

const getFile = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { public_id, resource_type } = req.query;
    const format = (public_id as string).split(".")[1];
    const url = await getSignedUrl({
      publicId: String(public_id),
      resourceType: String(resource_type),
      format,
    });

    return res.status(200).json({ url });
  },
);

export default getFile;
