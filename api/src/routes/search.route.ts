import { Router } from 'express';
import { postSearch, getSearchJobStatus } from '../controller/search.controller';

const router = Router();

router.post('/', postSearch);
router.get('/job/:id', getSearchJobStatus);

export default router;


