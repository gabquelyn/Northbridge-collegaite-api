type APPLICATION_PROGRAMS = "CAAP" | "GRADE11" | "GRADE12" | "AY12";

type UploadedFile = {
  url: string;
  public_id: string;
  filename: string;
};
type UploadResult = {
  field: string;
  file: UploadedFile
};
