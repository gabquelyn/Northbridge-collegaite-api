import { Response, Request } from "express";
import expressAsyncHandler from "express-async-handler";
import Token from "../../model/token";
import User from "../../model/user";

const verifyController = expressAsyncHandler(
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
export default verifyController;
