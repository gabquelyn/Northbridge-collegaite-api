import fs from "fs/promises";
import pLimit from "p-limit";
import uploadFileStream from "../config/upload";

export async function uploadFilesFromPaths(
  files: FipeUploadPaths,
  folder?: string,
) {
  const limit = pLimit(5); // ✅ reduced
  const results: { [index: string]: DocumentFile[] } = {};
  const tasks: Promise<void>[] = [];

  for (const field in files) {
    for (const filePath of files[field]) {
      tasks.push(
        limit(async () => {
          let result;

          try {
            result = await uploadFileStream(
              filePath,
              folder || "student-documents",
            );

            if (!results[field]) results[field] = [];

            results[field].push({
              url: result.secure_url,
              public_id: result.public_id,
              filename: result.original_filename,
              format: result.format,
              resource_type: result.resource_type,
            });
          } finally {
            // 🧹 ALWAYS delete temp file
            await fs.unlink(filePath).catch(() => {});
          }
        }),
      );
    }
  }

  await Promise.all(tasks);
  return results;
}
