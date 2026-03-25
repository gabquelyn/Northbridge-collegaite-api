import { Response, Request } from "express";
import expressAsyncHandler from "express-async-handler";

const logoutController = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const cookies = req.cookies;
    if (!cookies?.refreshToken) return res.sendStatus(204); //no content;
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.json({ message: "Cookie cleared" });
  },
);

export default logoutController;
