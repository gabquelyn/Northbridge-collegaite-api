import { Router } from "express";
import getPersonnelHandler from "../controllers/personnel/get";
import VerifyJWT from "../middlewares/VerifyJwt";
import OnlyAdmin from "../middlewares/onlyAdmin";

const personnelRouter = Router();

personnelRouter.get("/", VerifyJWT, OnlyAdmin, getPersonnelHandler);
export default personnelRouter