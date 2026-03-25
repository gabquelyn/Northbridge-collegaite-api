import { Response, Request } from "express";
import expressAsyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";

const refreshController = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) return res.status(403).json({ message: "Forbidden" });

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!,
      (error: any, decode: any) => {
        if (error) {
          console.log(error);
          return res.status(403).json({ message: "Forbidden" });
        }
        const accessToken = jwt.sign(
          {
            UserInfo: {
              email: decode.email,
              userId: decode.userId,
            },
          },
          String(process.env.ACCESS_TOKEN_SECRET),
          { expiresIn: "1h" },
        );

        return res.json({ accessToken });
      },
    );
  },
);

export default refreshController;
