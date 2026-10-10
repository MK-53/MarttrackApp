import { Router, type IRouter } from "express";
import healthRouter from "./health";
import businessBriefingRouter from "./businessBriefing";

const router: IRouter = Router();

router.use(healthRouter);
router.use(businessBriefingRouter);

export default router;
