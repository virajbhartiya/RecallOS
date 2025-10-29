import memoryRouter from './memory.route';
import contentRouter from './content.route';
import searchRouter from './search.route';
import authRouter from './auth.route';

export const routes = (app: any) => {
  app.use('/api/memory', memoryRouter);
  app.use('/api/content', contentRouter);
  
  app.use('/api/search', searchRouter);
  app.use('/api/auth', authRouter);
  
};
