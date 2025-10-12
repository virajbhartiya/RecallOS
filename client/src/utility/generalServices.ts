/* eslint-disable @typescript-eslint/no-explicit-any */
import axiosInstance from './axiosInterceptor'
import { AxiosResponse } from 'axios'

export const getRequest = async (
  route: string,
  callback?: (res: AxiosResponse) => void
) => {
  try {
    const res = await axiosInstance.get(route)
    if (callback) callback(res)
    return res
  } catch (err: any) {
    if (callback) callback(err)
    return err.response
  }
}

export const postRequest = async (
  route: string,
  data: any,
  callback?: (res: AxiosResponse) => void
) => {
  try {
    const res = await axiosInstance.post(route, data)
    if (callback) callback(res)
    return res
  } catch (err: any) {
    if (callback) callback(err.response)
    return err.response
  }
}

export const patchRequest = async (
  route: string,
  data: any,
  callback?: (res: AxiosResponse) => void
) => {
  try {
    const res = await axiosInstance.patch(route, data)
    if (callback) callback(res)
    return res
  } catch (err: any) {
    if (callback) callback(err)
    return err.response
  }
}

export const deleteRequest = async (
  route: string,
  callback?: (res: AxiosResponse) => void
) => {
  try {
    const res = await axiosInstance.delete(route)
    if (callback) callback(res)
    return res
  } catch (err: any) {
    if (callback) callback(err)
    return err.response
  }
}
