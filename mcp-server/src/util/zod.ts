import { z } from 'zod'

export const WalletSchema = z.string().min(4)
export const UserAddressSchema = WalletSchema
export const UUIDSchema = z.string().uuid()
export const HashSchema = z.string().min(10)

export type Infer<T extends z.ZodTypeAny> = z.infer<T>


