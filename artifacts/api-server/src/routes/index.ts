import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storiesRouter from "./stories";
import storageRouter from "./storage";
import checkoutRouter from "./checkout";
import accessCodeRouter from "./access-code";
import giftCardsRouter from "./gift-cards";
import classroomRouter from "./classroom";
import avatarsRouter from "./avatars";
import familyHubRouter from "./family-hub";
import musicRouter from "./music";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storiesRouter);
router.use(storageRouter);
router.use(checkoutRouter);
router.use(accessCodeRouter);
router.use(giftCardsRouter);
router.use(classroomRouter);
router.use(avatarsRouter);
router.use(familyHubRouter);
router.use(musicRouter);

export default router;
