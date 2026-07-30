import { Response, Request } from "express";
import expressAsyncHandler from "express-async-handler";
import Application from "../../model/application";
import Profile from "../../model/profile";
import User from "../../model/user";
import { validationResult } from "express-validator";
import { compileEmail } from "../../emails/compileEmail";
import moment from "moment";
import { emailQueue } from "../../services/queue";
const discountHandler = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const { discount, discountExpires } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: errors
          .array()
          .map((e) => (e.type === "field" ? `${e.path}: ${e.msg}` : e.msg))
          .join(", "),
      });
    }

    const application = await Application.findById(id).exec();
    const profile = await Profile.findById(application?.profile).lean().exec();

    const guardian = await User.findById(application?.applicant).lean().exec();

    if (!application || !profile || !guardian)
      return res.status(404).json({
        message: "Important admission details not found",
        application,
        profile,
        guardian,
      });

    application.discount = discount;
    application.discountExpires = discountExpires;

    // send to parent
    if (discount > 0) {
      const { html } = compileEmail("discount", {
        parentName: `${guardian.name}`,
        studentName: `${profile.bio.firstName} ${profile.bio.lastName}`,
        discountPercentage: discount,
        expiryDate: moment(discountExpires).format("MMMM D, YYYY [at] h:mm A"),
        dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
      });

      await emailQueue.add("deliver", {
        to: guardian.email,
        html,
        subject: "You have earned a discount",
      });
    }

    await application.save();
    return res.status(200).json({
      message: `Attributed a discount of ${discount} and it expireds on ${moment(discountExpires).format("MMMM D, YYYY [at] h:mm A")}`,
    });
  },
);
export default discountHandler;
