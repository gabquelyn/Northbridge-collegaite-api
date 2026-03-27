import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { CustomRequest } from "../../types/request";
import Application from "../../model/application";
import initializePayment from "../../utils/initializePayment";
import User from "../../model/user";
import { prices } from "../../config/prices";
import temp from "../../model/temp";

const enrol = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as CustomRequest).id;
    const { id } = req.params;
    const { programs } = req.body;

    const error = validationResult(req);
    if (!error.isEmpty()) return res.status(400).json({ error: error.array() });

    const prevApplication = await Application.findById(id).lean().exec();
    const user = await User.findById(userId).lean().exec();
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!prevApplication?.granted)
      return res.status(404).json({ message: "Admission is still in review" });

    if (!prevApplication?.paid)
      return res
        .status(400)
        .json({ message: `Payment for previous programs (${prevApplication.programs.join(", ")})  not made` });

    const appliedCourseSet = new Set(prevApplication.programs);
    const selectedProgramSet = new Set(programs);
    // * check if the admission requested already on the course or program

    for (const program of programs) {
      if (appliedCourseSet.has(program))
        return res
          .status(400)
          .json({ message: "Program already in previous application" });
    }

    if (!appliedCourseSet.has("GRADE11") && selectedProgramSet.has("GRADE12"))
      return res.status(400).json({
        message: "Grade 11 applcation comes before grade 12",
      });

    if (!appliedCourseSet.has("GRADE12") && selectedProgramSet.has("AY12"))
      return res.status(400).json({
        message: "Grade 12 applcation comes before Grade 11",
      });

    let totalPrice = 0;
    for (const program of programs) {
      for (const price of prices) {
        if (program === price.name) {
          totalPrice += price.amount;
        }
      }
    }

    const response = await initializePayment({
      amount: totalPrice,
      email: user.email,
      metadata: {
        applicationId: prevApplication._id,
        custom_fields: [
          ...prices.map((p) => ({
            display_name: p.detail,
            variable_name: p.name,
            value: p.amount,
          })),
        ],
      },
    });

    await temp.create({
      application: prevApplication._id,
      programs,
      reference: response.data.reference,
    });

    return res.status(200).json({
      paymentUrl: response.data.authorization_url,
      accessCode: response.data.access_code,
    });
  },
);

export default enrol;
