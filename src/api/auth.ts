import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  ChangePasswordRequest,
  DeleteMeRequest,
  LoginRequest,
  RegisterRequest,
  UpdateMeRequest,
} from '#/generated/api-types'

import {
  changePassword as changePasswordApi,
  deleteMe as deleteMeApi,
  getMe as getMeApi,
  login as loginApi,
  logout as logoutApi,
  logoutAll as logoutAllApi,
  register as registerApi,
  updateMe as updateMeApi,
} from '#/generated/client'
import { queryKeys } from '#/lib/query-keys'

export function useMe(options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryFn: () => getMeApi({}),
    queryKey: queryKeys.auth.me(),
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: LoginRequest) => loginApi({ body: request }),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me(), user)
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: RegisterRequest) => registerApi({ body: request }),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me(), user)
    },
  })
}

export function useUpdateMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpdateMeRequest) => updateMeApi({ body: request }),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me(), user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => logoutApi({}),
    onSuccess: () => {
      queryClient.clear()
    },
  })
}

export function useLogoutAll() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => logoutAllApi({}),
    onSuccess: () => {
      queryClient.clear()
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (request: ChangePasswordRequest) => changePasswordApi({ body: request }),
  })
}

export function useDeleteMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: DeleteMeRequest) => deleteMeApi({ body: request }),
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
