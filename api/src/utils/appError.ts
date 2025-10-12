interface IError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
}
class AppError extends Error implements IError {
  constructor(message: any, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4')
      ? 'code failed'
      : 'server error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
  statusCode: number;
  status: string;
  isOperational: boolean;
}

export default AppError;
