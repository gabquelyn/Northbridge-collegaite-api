import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { CustomRequest } from "../../types/request";
import Application from "../../model/application";
import initializePayment from "../../utils/initializePayment";
import User from "../../model/user";
import { prices } from "../../config/prices";
import temp from "../../model/temp";
import cost from "../../utils/programs";
import moment from "moment";

const enrol = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as CustomRequest).id;
    const { id } = req.params;
    const { programs } = req.body;

    const error = validationResult(req);
    if (!error.isEmpty())
      return res.status(400).json({
        message: error
          .array()
          .map((e) => (e.type === "field" ? `${e.path}: ${e.msg}` : e.msg))
          .join(", "),
      });

    const prevApplication = await Application.findById(id).lean().exec();
    const user = await User.findById(userId).lean().exec();
    if (!user) return res.status(404).json({ message: "User not found" });

    if (prevApplication?.rescinded)
      return res
        .status(400)
        .json({ message: "Application has been rescinded" });
    if (!prevApplication?.granted)
      return res.status(404).json({ message: "Admission is still in review" });

    if (!prevApplication?.completed)
      return res.status(400).json({
        message: `Application fee not paid`,
      });

    if (!prevApplication?.paid)
      return res.status(400).json({
        message: `Payment for previous programs (${prevApplication.programs.join(", ")})  not made`,
      });

    if (prevApplication.outstanding > 0) {
      return res.status(400).json({
        message: `Outstanding fee of ${prevApplication.outstanding} needs to be paid before enrolling in another program`,
      });
    }

    const appliedCourseSet = new Set(prevApplication.programs);
    const selectedProgramSet = new Set(programs);
    const now = moment();
    const current = now.format("MM-DD");
    const isWithinRange = current >= "11-01" && current <= "12-15";

    if (selectedProgramSet.has("AY12") && !isWithinRange) {
      return res.status(400).json({
        message: "Application window for Academic Year (AY12) closed",
      });
    }

    // * check if the admission requested already on the course or program

    for (const program of programs) {
      if (appliedCourseSet.has(program))
        return res
          .status(400)
          .json({ message: "Program already in previous application" });
    }

    const totalPrice = cost(programs, true);
    const response = await initializePayment({
      amount: prevApplication?.installment ? totalPrice * 0.6 : totalPrice,
      discount: prevApplication?.discount,
      email: user.email,
      metadata: {
        applicationId: prevApplication._id,
        custom_fields: [
          ...prices.map((p) => ({
            display_name: p.detail,
            variable_name: p.name,
            value: p.amount * 100,
          })),
        ],
      },
      applicationId: prevApplication._id,
      customerName: user?.name || "",
    });

    await temp.create({
      application: prevApplication._id,
      programs,
      reference: response.data.reference,
    });

    return res.status(200).json({
      paymentUrl: response.data.authorization_url,
    });
  },
);

export default enrol;
