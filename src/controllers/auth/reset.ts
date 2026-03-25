import { Response, Request } from "express";
import expressAsyncHandler from "express-async-handler";
import Token from "../../model/token";
import User from "../../model/user";

import bcrypt from "bcryptjs";

const resetPasswordController = expressAsyncHandler(
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

export default resetPasswordController;
