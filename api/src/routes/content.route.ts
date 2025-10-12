import { Router } from 'express';
import { submitContent, getSummarizedContent } from '../controller/content.controller';
const router = Router();
router.post('/', submitContent);
router.get('/user/:user_id', getSummarizedContent);
export default router;