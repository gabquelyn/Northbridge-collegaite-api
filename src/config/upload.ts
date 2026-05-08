import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import streamifier from "streamifier";
import path from "path";
import fs from "fs";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// const uploadToCloudinary = (
//   buffer: Express.Multer.File["buffer"],
//   folder: string,
// ): Promise<UploadApiResponse> => {
//   return new Promise((resolve, reject) => {
//     const stream = cloudinary.uploader.upload_stream(
//       {
//         folder,
//         resource_type: "raw",
//       },
//       (error, result) => {
//         if (error) reject(error);
//         else if (result) resolve(result);
//       },
//     );

//     streamifier.createReadStream(buffer).pipe(stream);
//   });
// };

export function uploadFileStream(
  filePath: string,
  folder: string,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const ext = path.extname(filePath);
    const filename = path.basename(filePath);

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        public_id: `${Date.now()}${ext}`,
        type: "authenticated",
        filename_override: filename,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    fs.createReadStream(filePath).pipe(stream);
  });
}

export default uploadFileStream;

export async function deleteUploadedFiles(
  uploadedFiles: Record<string, UploadedFile[]>,
): Promise<void> {
  const publicIds = Object.values(uploadedFiles)
    .flat()
    .map((file) => file.public_id)
    .filter(Boolean);

  if (publicIds.length === 0) return;

  // Delete in parallel
  await Promise.all(
    publicIds.map((publicId) =>
      cloudinary.uploader.destroy(publicId).catch((err) => {
        // optional: log error but don't fail entire cleanup
        console.error(`Failed to delete ${publicId}`, err);
      }),
    ),
  );
}

export async function getSignedUrl({
  publicId,
  resourceType,
  format,
  expiresIn = 60 * 5, // 5 minutes
  type = "authenticated",
}: {
  publicId: string;
  resourceType: string;
  format: string;
  expiresIn?: number;
  type?: "authenticated" | "upload";
}) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: resourceType,
    type,
    expires_at: expiresAt,
    // attachment: true,
  });
}
