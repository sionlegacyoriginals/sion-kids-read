import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storiesRouter from "./stories";
import storageRouter from "./storage";
import checkoutRouter from "./checkout";
import accessCodeRouter from "./access-code";
import giftCardsRouter from "./gift-cards";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storiesRouter);
router.use(storageRouter);
router.use(checkoutRouter);
router.use(accessCodeRouter);
router.use(giftCardsRouter);

export default router;
