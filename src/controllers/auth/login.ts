import { Response, Request } from "express";
import expressAsyncHandler from "express-async-handler";
import Token from "../../model/token";
import User from "../../model/user";
import {v4 as uuid} from "uuid";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { compileEmail } from "../../emails/compileEmail";
import { emailQueue } from "../../services/queue";

const loginController = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { email, password } = req.body;
    const foundUser = await User.findOne({ email }).lean().exec();

    if (!foundUser)
      return res.status(400).json({ message: "User does not exist" });

    if (!foundUser?.password)
      return res
        .status(400)
        .json({ message: "Continue with google to login for this email" });
    const passwordMatch = await bcrypt.compare(password, foundUser.password);
    if (!passwordMatch)
      return res.status(403).json({ message: "Incorrect email or password" });

    if (!foundUser.verified) {
      const existingToken = await Token.findOne({
        userId: foundUser._id,
      }).exec();

      if (!existingToken) {
        const verificationToken = await Token.create({
          userId: foundUser._id,
          token: crypto.randomBytes(32).toString("hex"),
        });

        const url = `${process.env.BASE_URL}/auth/${foundUser._id}/verify/${verificationToken.token}`;

        // send the verification url via email
        const { html } = compileEmail("welcome", {
          companyName: "Northbridge Collegiate",
          verifyUrl: url,
        });

        await emailQueue.add("deliver", {
          to: email,
          html,
          subject: "Verify email address",
        }, {jobId: uuid()});
        // await sendMail({ to: email, subject: "Verify Email Address", html });
      }

      return res
        .status(400)
        .json({ message: "Email sent to your account please verify" });
    }

    const accessToken = jwt.sign(
      {
        UserInfo: {
          email: foundUser.email,
          userId: foundUser._id,
        },
      },
      String(process.env.ACCESS_TOKEN_SECRET),
      { expiresIn: "1h" },
    );

    // create the refresh token
    const refreshToken = jwt.sign(
      { email: foundUser.email, userId: foundUser._id },
      String(process.env.REFRESH_TOKEN_SECRET),
      { expiresIn: "1d" },
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ accessToken, role: foundUser.role });
  },
);

export default loginController;
