import { Router } from 'express';
import { postSearch, getSearchJobStatus, getContext, clearSearchCache, cleanupSearchCache } from '../controller/search.controller';

const router = Router();

router.post('/', postSearch);
router.post('/context', getContext);
router.get('/job/:id', getSearchJobStatus);
router.delete('/cache/:wallet', clearSearchCache);
router.delete('/cache', cleanupSearchCache);

export default router;


