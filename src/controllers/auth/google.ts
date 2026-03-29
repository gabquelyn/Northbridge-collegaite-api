import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import UserModel from "../../model/user";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const registerWithGoogle = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email_verified) {
      throw new Error("Google email not verified");
    }

    if (payload) {
      const { email, name, picture, email_verified } = payload;
      const existingUser = await UserModel.findOne({ email }).lean().exec();
      if (existingUser)
        return res.status(400).json({ message: "User already exists" });
      await UserModel.create({
        email,
        verified: email_verified,
        provider: "google",
        password: null,
        name,
      });
      return res.status(201).json({ message: "Account created successfully" });
    } else {
      throw new Error("Google ticket payload missing");
    }
  },
);

export const loginWithGoogle = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const foundUser = await UserModel.findOne({ email: payload?.email })
      .lean()
      .exec();

    if (!foundUser)
      return res.status(404).json({ message: "User account not found" });

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

    return res.status(200).json({ accessToken, role: foundUser.role });
  },
);
