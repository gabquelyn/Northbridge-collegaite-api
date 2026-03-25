import { Response, Request } from "express";
import expressAsyncHandler from "express-async-handler";
import Token from "../../model/token";
import User from "../../model/user";
import sendMail from "../../utils/sendMail";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { compileEmail } from "../../emails/compileEmail";
import { validationResult } from "express-validator";

const registerController = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { email, password, name } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ error: errors.array() });

    const existing = await User.findOne({ email }).lean().exec();
    if (existing)
      return res
        .status(409)
        .json({ message: "User Exist, try logging in instead" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email,
      password: hashedPassword,
      provider: "local",
      name,
    });

    if (!newUser)
      return res.status(400).json({ message: "Invalid data recieved!" });

    // verification token
    const verificationToken = await Token.create({
      userId: newUser._id,
      token: crypto.randomBytes(32).toString("hex"),
    });

    const url = `${process.env.FRONTEND_URL}/verify-email/?id=${newUser._id}&token=${verificationToken.token}`;
    // send the verification url via email
    const { html } = compileEmail("welcome", {
      companyName: "Northbridge Collegiate",
      verifyUrl: url,
    });
    await sendMail({ to: email, subject: "Verify Email Address", html });
    return res
      .status(201)
      .json({ message: "Email sent to your account please verify" });
  },
);

export default registerController;
