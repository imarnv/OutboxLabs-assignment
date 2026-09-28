'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AttachmentUpload } from '@/lib/types';

const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 5 * 1024 * 1024;

export interface LocalAttachment {
  id: string;
  file: File;
  previewUrl: string | null;
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function useAttachments(onError: (msg: string) => void) {
  const [items, setItems] = useState<LocalAttachment[]>([]);

  useEffect(
    () => () => items.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl)),
    // revoke on unmount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const add = useCallback(
    (fileList: FileList | null) => {
      // copy first: the caller resets the input, which empties the live FileList
      const files = Array.from(fileList ?? []);
      if (!files.length) return;
      setItems((prev) => {
        const next = [...prev];
        let total = prev.reduce((s, a) => s + a.file.size, 0);
        for (const file of files) {
          if (next.length >= MAX_FILES) {
            onError(`You can attach up to ${MAX_FILES} files.`);
            break;
          }
          if (total + file.size > MAX_TOTAL_BYTES) {
            onError('Attachments are limited to 5 MB in total.');
            break;
          }
          total += file.size;
          next.push({
            id: `${file.name}-${file.size}-${file.lastModified}`,
            file,
            previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
          });
        }
        return next;
      });
    },
    [onError],
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const serialize = useCallback(
    (): Promise<AttachmentUpload[]> =>
      Promise.all(
        items.map(async (a) => ({
          filename: a.file.name,
          contentType: a.file.type || 'application/octet-stream',
          contentBase64: await toBase64(a.file),
        })),
      ),
    [items],
  );

  return { items, add, remove, serialize };
}
