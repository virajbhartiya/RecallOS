import { Express } from 'express'
import memoryRouter from './memory.route'
import contentRouter from './content.route'
import searchRouter from './search.route'
import authRouter from './auth.route'
import profileRouter from './profile.route'
import insightsRouter from './insights.route'
import knowledgeRouter from './knowledge.route'
import projectRouter from './project.route'
import exportImportRouter from './export-import.route'
import privacyRouter from './privacy.route'
import adminRouter from './admin.route'

export const routes = (app: Express) => {
  app.use('/api/memory', memoryRouter)
  app.use('/api/content', contentRouter)

  app.use('/api/search', searchRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/profile', profileRouter)
  app.use('/api/insights', insightsRouter)
  app.use('/api/knowledge', knowledgeRouter)
  app.use('/api/projects', projectRouter)
  app.use('/api/export', exportImportRouter)
  app.use('/api/privacy', privacyRouter)
  app.use('/api/admin', adminRouter)
}
