import { Request, Response, NextFunction } from 'express'
import AppError from './app-error.util'

export const validateRequestSize = (maxSizeBytes: number = 1000000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10)
    if (contentLength > maxSizeBytes) {
      return next(
        new AppError(`Request body too large. Maximum ${maxSizeBytes} bytes allowed.`, 413)
      )
    }
    next()
  }
}

export const validateQueryParams = (validators: {
  [key: string]: (value: unknown) => boolean | string
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = []

    for (const [param, validator] of Object.entries(validators)) {
      const value = req.query[param]
      if (value !== undefined) {
        const result = validator(value)
        if (typeof result === 'string') {
          errors.push(result)
        } else if (!result) {
          errors.push(`Invalid value for parameter: ${param}`)
        }
      }
    }

    if (errors.length > 0) {
      return next(new AppError(errors.join(', '), 400))
    }

    next()
  }
}

export const validateBody = (validators: {
  [key: string]: (value: unknown) => boolean | string
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = []

    for (const [field, validator] of Object.entries(validators)) {
      const value = req.body[field]
      if (value !== undefined) {
        const result = validator(value)
        if (typeof result === 'string') {
          errors.push(result)
        } else if (!result) {
          errors.push(`Invalid value for field: ${field}`)
        }
      }
    }

    if (errors.length > 0) {
      return next(new AppError(errors.join(', '), 400))
    }

    next()
  }
}

export const validators = {
  isString: (value: unknown): boolean => typeof value === 'string',
  isNumber: (value: unknown): boolean => typeof value === 'number' || !isNaN(Number(value)),
  isPositiveInteger: (value: unknown): boolean => {
    const num = Number(value)
    return Number.isInteger(num) && num > 0
  },
  isNonEmptyString: (value: unknown): boolean =>
    typeof value === 'string' && value.trim().length > 0,
  isInRange:
    (min: number, max: number) =>
    (value: unknown): boolean => {
      const num = Number(value)
      return num >= min && num <= max
    },
  isArray: (value: unknown): boolean => Array.isArray(value),
  isNonEmptyArray: (value: unknown): boolean => Array.isArray(value) && value.length > 0,
}
