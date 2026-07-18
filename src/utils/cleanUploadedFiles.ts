import { unlink } from "fs/promises";
export default async function cleanupUploadedFiles(fileFields: FileFields | undefined) {
  if (!fileFields) return;
  const paths = Object.values(fileFields).flatMap((files) =>
    files.map((f) => f.path),
  );
  await Promise.all(
    paths.map((path) =>
      unlink(path).catch((err) =>
        console.error(`Failed to clean up orphaned upload ${path}:`, err),
      ),
    ),
  );
}
