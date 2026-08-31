import { Router } from "express";
import getPersonnelHandler from "../controllers/personnel/get";
import VerifyJWT from "../middlewares/VerifyJwt";
import OnlyAdminMod from "../middlewares/OnlyAdminMod";

const personnelRouter = Router();

personnelRouter.get("/", VerifyJWT, OnlyAdminMod, getPersonnelHandler);
export default personnelRouter