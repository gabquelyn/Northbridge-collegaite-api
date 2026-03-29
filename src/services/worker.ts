import { Worker } from "bullmq";
import IORedis from "ioredis";
import { uploadFilesFromPaths } from "../utils/application";
import Profile from "../model/profile";
import connectDB from "../config/connectDB";
import sendMail from "../utils/sendMail";
import Application from "../model/application";
import Invoice from "../model/invoice";
import Temp from "../model/temp";
import moodleCredentials from "../utils/moodleCredentials";
import { enrolStudentInCourses, getCoursesByCategory } from "../utils/moodle";
const connection = new IORedis({
  host: process.env.REDIS_HOST || "redis",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

async function myWorker() {
  try {
    await connectDB();
    const fileUploadWorker = new Worker(
      "file-upload",
      async (job) => {
        if (job.name === "upload-files") {
          const { profileId, files } = job.data;
          const uploadedFiles = await uploadFilesFromPaths(files);

          console.log(files, uploadedFiles);

          const update: {
            [index: string]: DocumentFile[];
          } = {};

          for (const key in uploadedFiles) {
            update[`documents.${key}`] = uploadedFiles[key];
          }

          await Profile.findByIdAndUpdate(
            profileId,
            { $set: update },
            { new: true },
          );
        }
        return { success: true };
      },
      { connection, concurrency: 3 },
    );

    const emailWorker = new Worker(
      "send-email",
      async (job) => {
        if (job.name === "deliver") {
          const { to, html, subject } = job.data;
          await sendMail({ to, html, subject });
        }
        return { success: true };
      },

      {
        connection,
        concurrency: 6,
      },
    );

    const paystackWorker = new Worker(
      "webhook",
      async (job) => {
        if (job.name === "charged") {
          const { applicationId, currency, amount, status, reference } =
            job.data;
          const application = await Application.findById(applicationId).exec();
          const profile = await Profile.findById(application?.profile)
            .lean()
            .exec();

          if (!profile || !application) return { success: false };

          const invoice = await Invoice.findOneAndUpdate(
            { reference },
            {
              $setOnInsert: {
                currency,
                amount,
                status,
                reference,
                application: applicationId,
              },
            },
            { upsert: true, new: false }, // returns null if inserted
          );

          if (invoice) {
            return { success: true };
          }

          const { email, firstName, lastName } = profile.bio;
          // * For an Enrollment into a previously paid application
          if (application.paid) {
            const additional = await Temp.findOne({
              application: applicationId,
              reference: reference,
            });

            if (additional) {
              if (additional.courses.length > 0) {
                const courseSet = new Set([
                  ...application.courses,
                  ...additional.courses,
                ]);
                application.courses = [...courseSet];
                await application.save();
                // Grant access on Moodle

                const id = await moodleCredentials({
                  email,
                  firstName,
                  lastName,
                });

                await enrolStudentInCourses(id, additional.courses);
              }

              if (additional.programs.length > 0) {
                const programs = new Set([
                  ...application.programs,
                  ...additional.programs,
                ]);
                application.programs = [...programs];
                await application.save();
              }
            }
          } else {
            // ! MOODLE FOR ONSITE USERS
            const programsSet = new Set(application.programs);
            if (application?.mode == "on-site") {
              if (programsSet.has("CAAP")) {
                const id = await moodleCredentials({
                  email,
                  firstName,
                  lastName,
                });
                // enroll course in category id: 2
                const coursesInCategory = await getCoursesByCategory(2);
                const courseIds = coursesInCategory.map((course) => course.id);
                await enrolStudentInCourses(id, courseIds);
              }
            }
            if (application.mode == "off-site") {
              const id = await moodleCredentials({
                email,
                firstName,
                lastName,
              });
              await enrolStudentInCourses(id, application.courses);
            }
          }
          application.paid = true;
          application.save();
        }

        return { success: true };
      },

      {
        connection,
        concurrency: 5,
      },
    );

    // Events listeners
    fileUploadWorker.on("failed", (job, err) => {
      console.error(`Job ${job?.id} failed`, err);
    });

    emailWorker.on("failed", (job, err) => {
      console.error(`Job ${job?.id} failed`, err);
    });

    paystackWorker.on("failed", (job, err) => {
      console.error(`Job ${job?.id} failed`, err);
    });

    process.on("SIGINT", async () => {
      await fileUploadWorker.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      await fileUploadWorker.close();
      process.exit(0);
    });
  } catch (err) {
    console.log(err);
  }
}

myWorker();
