import { Response, Request } from "express";
import expressAsyncHandler from "express-async-handler";
import Token from "../../model/token";
import User from "../../model/user";
import sendMail from "../../utils/sendMail";
import crypto from "crypto";
import { compileEmail } from "../../emails/compileEmail";

const forgotPasswordController = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found!" });
    const existingToken = await Token.findOne({ userId: user._id }).exec();
    await existingToken?.deleteOne();

    const otp = await Token.create({
      token: crypto.randomBytes(32).toString("hex"),
      userId: user._id,
    });

    const url = `${process.env.FRONTEND_URL}/reset?otp=${otp.token}`;

    // send the verification url via email
    const { html } = compileEmail("forget", {
      companyName: "Northbridge Collegiate",
      name: user.name || "",
      resetUrl: url,
      expiryTime: "15 minutes",
    });

    await sendMail({ to: email, subject: "Reset Password", html });
    // send the verification url via email
    return res
      .status(200)
      .json({ message: "Recovery mail sent successfully!" });
  },
);

export default forgotPasswordController;
