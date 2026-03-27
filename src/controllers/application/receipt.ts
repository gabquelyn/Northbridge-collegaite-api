import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Application from "../../model/application";
import Invoice from "../../model/invoice";

const getApplicationReceipt = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const prevApplication = await Application.findById(id).lean().exec();
    const foundInvoice = await Invoice.find({application: prevApplication?.id, status: "success"}).lean()

  return res.status(200).json({data: foundInvoice})
  },
);


export default getApplicationReceipt
