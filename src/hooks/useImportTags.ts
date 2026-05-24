import { useMutation } from '@tanstack/react-query';
import { TagsService } from '@/api/generated/services/TagsService';
import type { TagImportResult } from '@/api/generated/models/TagImportResult';
import type { Body_import_tags_tags_import_post } from '@/api/generated/models/Body_import_tags_tags_import_post';

export interface ImportTagsArgs {
  file: File;
  // Per ADR 028 §Governance #2 the two flags are mutually exclusive
  // and at least one MUST be set — the server rejects bare submits
  // with 400. The wizard always supplies exactly one.
  dryRun?: boolean;
  confirm?: string;
}

/**
 * Wraps `POST /tags/import` for the Phase C wizard.
 *
 * The generated `Body_import_tags_tags_import_post.upload` field is
 * typed as `string` because openapi-typescript-codegen renders
 * `format: binary` fields that way. At runtime the request layer
 * appends each formData entry via `FormData.append`, which accepts
 * `Blob | File` perfectly well — we cast at the boundary.
 */
export function useImportTags() {
  return useMutation<TagImportResult, unknown, ImportTagsArgs>({
    mutationFn: ({ file, dryRun, confirm }) => {
      const formData = {
        upload: file as unknown as string,
      } satisfies Body_import_tags_tags_import_post;
      return TagsService.importTagsTagsImportPost(formData, dryRun ?? false, confirm ?? null);
    },
  });
}
