import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ContentResponse, PutProfileRequest } from '#/generated/api-types'

import { getMyProfile as getMyProfileApi, putProfile as putProfileApi } from '#/generated/client'
import { uploadContentFlow } from '#/hooks/use-content-upload'
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
