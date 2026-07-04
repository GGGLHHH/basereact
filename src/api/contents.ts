import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  CreateContentRequest,
  SetContentMetadataRequest,
  UpdateContentRequest,
  UploadContentRequest,
} from '#/generated/api-types'

import {
  createContent as createContentApi,
  deleteContent as deleteContentApi,
  getContent as getContentApi,
  getContentMetadata as getContentMetadataApi,
  listContentObjects as listContentObjectsApi,
  listContents as listContentsApi,
  setContentMetadata as setContentMetadataApi,
  updateContent as updateContentApi,
  uploadContent as uploadContentApi,
} from '#/generated/client'
import { queryKeys } from '#/lib/query-keys'

export function useContents(options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryFn: () => listContentsApi({}),
    queryKey: queryKeys.contents.list(),
  })
}

export function useContent(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? Boolean(id),
    queryFn: () => getContentApi({ path: { id } }),
    queryKey: queryKeys.contents.detail(id),
  })
}

export function useContentMetadata(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? Boolean(id),
    queryFn: () => getContentMetadataApi({ path: { id } }),
    queryKey: queryKeys.contents.metadata(id),
  })
}

export function useContentObjects(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? Boolean(id),
    queryFn: () => listContentObjectsApi({ path: { id } }),
    queryKey: queryKeys.contents.objects(id),
  })
}

export function useCreateContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateContentRequest) => createContentApi({ body: request }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contents.all })
    },
  })
}

export function useUploadContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UploadContentRequest) => uploadContentApi({ body: request }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contents.all })
    },
  })
}

export function useUpdateContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateContentRequest }) =>
      updateContentApi({ body: request, path: { id } }),
    onSuccess: (content, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contents.all })
      queryClient.setQueryData(queryKeys.contents.detail(id), content)
    },
  })
}

export function useDeleteContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteContentApi({ path: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contents.all })
    },
  })
}

export function useSetContentMetadata() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: SetContentMetadataRequest }) =>
      setContentMetadataApi({ body: request, path: { id } }),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contents.metadata(id) })
    },
  })
}
