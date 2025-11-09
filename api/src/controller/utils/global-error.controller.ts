import { Request, Response } from 'express'
import { logger } from '../../utils/logger.util'

interface IError extends Error {
  statusCode?: number
  status?: string
}

const sendErrorDev = (err: IError, req: Request, res: Response) => {
  if (res.headersSent) {
    logger.warn('Response already sent, cannot send error response', {
      error: err.message,
      url: req.originalUrl,
    })
    return
  }

  if (req.originalUrl) {
    return res.status(err.statusCode || 500).json({
      status: err.status || 'error',
      error: err,
      message: err.message,
      stack: err.stack,
    })
  }

  throw err.message
}

export default (err: IError, req: Request, res: Response) => {
  err.statusCode = err.statusCode || 500
  err.status = err.status || 'error'
  sendErrorDev(err, req, res)
}
