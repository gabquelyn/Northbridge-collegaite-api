import pLimit from "p-limit";
import uploadToCloudinary from "../config/upload";

type UploadedFile = {
  url: string;
  public_id: string;
  filename: string;
};

type UploadResponse = Record<string, UploadedFile[]>;

type UploadOptions = {
  folder?: string;
  concurrency?: number;
};

export async function uploadFiles(
  fileFields: { [fieldname: string]: Express.Multer.File[] },
  options?: UploadOptions
): Promise<UploadResponse> {
  const { folder = "uploads", concurrency = 5 } = options || {};

  const limit = pLimit(concurrency);

  const uploadPromises: Promise<{
    field: string;
    file: UploadedFile;
  }>[] = [];

  for (const field in fileFields) {
    for (const file of fileFields[field]) {
      uploadPromises.push(
        limit(async () => {
          const result = await uploadToCloudinary(file.buffer, folder);

          return {
            field,
            file: {
              url: result.secure_url,
              public_id: result.public_id,
              filename: result.original_filename,
            },
          };
        })
      );
    }
  }

  const results = await Promise.all(uploadPromises);

  // Build grouped response
  return results.reduce((acc, { field, file }) => {
    if (!acc[field]) acc[field] = [];
    acc[field].push(file);
    return acc;
  }, {} as UploadResponse);
}