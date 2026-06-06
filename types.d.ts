type APPLICATION_PROGRAMS = "CAAP" | "GRADE11" | "GRADE12" | "AY12" | "DIRECT";

type UploadedFile = {
  url: string;
  public_id: string;
  filename: string;
};
type UploadResult = {
  field: string;
  file: UploadedFile;
};

type FileFields = {
  [fieldname: string]: Express.Multer.File[];
};

type FipeUploadPaths = Record<string, string[]>;

type DocumentFile = {
  public_id: string;
  filename: string;
  format: string;
  resource_type: string;
  url: string
};
