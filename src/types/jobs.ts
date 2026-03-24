import { Job } from "bullmq";
type ApplicationJobs = {
  "upload-files": {
    profileId: string;
    files: FipeUploadPaths;
  };
};
type JobMap = ApplicationJobs;
type JobNames = keyof JobMap & string;
export type UploadJob = {
  [K in JobNames]: Job<ApplicationJobs[K], any, K>;
}[JobNames];
