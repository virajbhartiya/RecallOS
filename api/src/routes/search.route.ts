import { Router } from 'express';
import { postSearch, getSearchJobStatus, getContext } from '../controller/search.controller';

const router = Router();

router.post('/', postSearch);
router.post('/context', getContext);
router.get('/job/:id', getSearchJobStatus);

export default router;


