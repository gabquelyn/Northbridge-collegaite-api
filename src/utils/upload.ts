import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import streamifier from "streamifier";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (
  buffer: Express.Multer.File["buffer"],
  folder: string,
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "raw",
      },
      (error, result) => {
        if (error) reject(error);
        else if (result) resolve(result);
      },
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

export default uploadToCloudinary


export async function deleteUploadedFiles(
  uploadedFiles: Record<string, UploadedFile[]>
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
      })
    )
  );
}