import memoryRouter from './memory.route';
import contentRouter from './content.route';
import blockscoutRouter from './blockscout.route';
import searchRouter from './search.route';

export const routes = (app: any) => {
  app.use('/api/memory', memoryRouter);
  app.use('/api/content', contentRouter);
  app.use('/api/blockscout', blockscoutRouter);
  app.use('/api/search', searchRouter);
};
