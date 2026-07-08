import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ContentResponse, ProfileResponse, PutProfileRequest } from '#/generated/api-types'

import { setUserAvatar as buildSetUserAvatarPath } from '#/generated/api'
import {
  getMyProfile as getMyProfileApi,
  getUserProfile as getUserProfileApi,
  putProfile as putProfileApi,
  setUserProfile as setUserProfileApi,
} from '#/generated/client'
import { uploadContentFlow } from '#/hooks/use-content-upload'
import { requestJson } from '#/lib/api-client'
import { queryKeys } from '#/lib/query-keys'

// 自己的资料(GET /frontend/profiles/me)。含富化的 avatar_url(相对 preview 路径)。
export const profileQueryOptions = queryOptions({
  queryFn: () => getMyProfileApi({}),
  queryKey: queryKeys.profile.me(),
})

export function useMyProfile(options?: { enabled?: boolean }) {
  return useQuery({
    ...profileQueryOptions,
    enabled: options?.enabled ?? true,
  })
}

// PUT /frontend/profiles/{user_id} —— 全量替换(缺省字段=清空)。onSuccess 直接
// 种缓存,侧边栏 NavUser 与本页共用 profile.me,头像/姓名即时刷新。
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, request }: { userId: string; request: PutProfileRequest }) =>
      putProfileApi({ body: request, path: { user_id: userId } }),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile.me(), profile)
    },
  })
}

// 后台管理员按 user_id 查他人资料 —— 走 admin 面(GET /admin/users/{id}/profile,users:admin),
// 不再需要 profiles:read。资料/头像管理整条收进 users:admin(见 baserust 纳入)。
export function userProfileQueryOptions(userId: string) {
  return queryOptions({
    queryFn: () => getUserProfileApi({ path: { id: userId } }),
    queryKey: queryKeys.profile.detail(userId),
  })
}

export function useUserProfile(userId: string, options?: { enabled?: boolean }) {
  return useQuery({
    ...userProfileQueryOptions(userId),
    enabled: options?.enabled ?? Boolean(userId),
  })
}

// 后台改他人资料(PUT /admin/users/{id}/profile,users:admin)。种 detail(userId) 缓存,
// 不碰 me()(避免管理员改别人时污染自己的侧栏头像/姓名)。
export function useUpdateUserProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, request }: { userId: string; request: PutProfileRequest }) =>
      setUserProfileApi({ body: request, path: { id: userId } }),
    onSuccess: (profile, { userId }) => {
      queryClient.setQueryData(queryKeys.profile.detail(userId), profile)
    },
  })
}

// 后台传他人头像(POST /admin/users/{id}/avatar,users:admin,multipart)。上传即绑定
// (auto-bind:后端上传 content(owner=目标用户)+ 立即绑资料),返回更新后的 ProfileResponse。
// 生成的 setUserAvatar 把 multipart 误当 JSON,故绕过它直接用 requestJson 送 FormData(ky 原生支持)。
export function useUploadUserAvatar(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return requestJson<ProfileResponse>(buildSetUserAvatarPath({ id: userId }), {
        body: form,
        method: 'POST',
      })
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile.detail(userId), profile)
    },
  })
}

// 头像上传复用统一内容上传流(prepare→直传/回退 multipart→confirm + 孤儿清理,
// 见 use-content-upload)。返回已 confirm 的 content —— 其 id 可直接作
// avatar_content_id(service 写前再查 confirm + image/*)。不必自建 multipart:
// uploadContentFlow 同时覆盖预签名与一步回退两条路径,且已有测试。
export function uploadAvatarFile(file: File): Promise<ContentResponse> {
  return uploadContentFlow({ file })
}

export function useUploadAvatar() {
  return useMutation({
    mutationFn: (file: File) => uploadAvatarFile(file),
  })
}
