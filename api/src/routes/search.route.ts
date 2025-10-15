import { Router } from 'express';
import { postSearch } from '../controller/search.controller';

const router = Router();

router.post('/', postSearch);

export default router;


