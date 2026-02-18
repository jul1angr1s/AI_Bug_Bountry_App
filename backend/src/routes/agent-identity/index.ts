import { Router } from 'express';
import publicRoutes from './public.routes.js';
import memberRoutes from './member.routes.js';

const router = Router();
router.use(publicRoutes);
router.use(memberRoutes);

export default router;
