import { Response, Request } from "express";
import expressAsyncHandler from "express-async-handler";
import Token from "../model/token";
import User from "../model/user";
import sendMail from "../utils/sendMail";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const loginController = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { email, password } = req.body;
    const foundUser = await User.findOne({ email }).lean().exec();

    if (!foundUser)
      return res.status(400).json({ message: "User does not exist" });

    if (!foundUser?.password)
      return res.status(400).json({ message: "Continue with google to login for this email" });
    const passwordMatch = await bcrypt.compare(password, foundUser.password);
    if (!passwordMatch)
      return res.status(401).json({ message: "Unauthorized" });

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

        await sendMail(foundUser.email, "Verify email", url);
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
      { email: foundUser.email },
      String(process.env.REFRESH_TOKEN_SECRET),
      { expiresIn: "1d" },
    );

    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ accessToken });
  },
);

export const registerController = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { email, password } = req.body;

    const existing = await User.findOne({ email }).lean().exec();
    if (existing)
      return res.status(409).json({ message: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email,
      password: hashedPassword,
    });

    if (!newUser)
      return res.status(400).json({ message: "Invalid data recieved!" });

    // verification token
    const verificationToken = await Token.create({
      userId: newUser._id,
      token: crypto.randomBytes(32).toString("hex"),
    });

    const url = `${process.env.FRONTEND_URL}/auth/${newUser._id}/verify/${verificationToken.token}`;
    // send the verification url via email
    await sendMail(newUser.email, "Verify email", url);
    res
      .status(201)
      .json({ message: "Email sent to your account please verify" });
  },
);

export const logoutController = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204); //no content;
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.json({ message: "Cookie cleared" });
  },
);

export const verifyController = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { userId, token } = req.params;
    const user = await User.findById(userId).exec();
    if (!user) return res.status(400).send({ message: "Invalid link" });
    const existingToken = await Token.findOne({
      userId: user._id,
      token,
    });
    if (!existingToken)
      return res.status(400).send({ message: "invalid link" });
    user.verified = true;
    await user.save();
    await existingToken.deleteOne();
    res.status(200).send({ message: "Email verified successfully!" });
  },
);

export const forgotPasswordController = expressAsyncHandler(
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

    const url = `${process.env.FRONTEND_URL}/auth/reset/${otp.token}`;

    // send the verification url via email
    await sendMail(user.email, "Reset Password", url);
    return res
      .status(200)
      .json({ message: "Recovery mail sent successfully!" });
  },
);

export const restPasswordController = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { token } = req.params;
    const { password } = req.body;
    const existingToken = await Token.findOne({ token }).exec();
    if (!existingToken)
      return res.status(400).send({ message: "invalid link" });
    const user = await User.findById(existingToken.userId).exec();
    const hashedPassword = await bcrypt.hash(password, 10);
    if (user) {
      user.password = hashedPassword;
      await user.save();
    }
    await existingToken.deleteOne();
    return res.status(200).json({ message: "password updated successfully!" });
  },
);
