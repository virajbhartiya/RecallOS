interface IError extends Error {
  statusCode?: number
  status?: string
}

const sendErrorDev = (err: IError, req: { originalUrl: string }, res: any) => {
  if (!!req.originalUrl) {
    return res.status(err.statusCode || 500).json({
      status: err.status || 'error',
      error: err,
      message: err.message,
      stack: err.stack,
    })
  }

  throw err.message
}

export default (err: IError, req: any, res: any) => {
  err.statusCode = err.statusCode || 500
  err.status = err.status || 'error'
  sendErrorDev(err, req, res)
}
