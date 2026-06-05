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
import {
  enrolStudentInCourses,
  getCoursesByCategory,
  suspendMoodleUserByEmail,
} from "../utils/moodle";
import { emailQueue } from "./queue";
import User from "../model/user";
import { compileEmail } from "../emails/compileEmail";
import moment from "moment";
import cost from "../utils/programs";
import initializePayment from "../utils/initializePayment";
import { formatCurrency } from "../utils/formatCurrency";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "redis",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

// max days for payment expectancy
const MAX_DAYS_WITHOUTPAYMENT = 56;
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

    const paymentWebhookWorker = new Worker(
      "webhook",
      async (job) => {
        if (job.name === "charged") {
          const { applicationId, currency, amount, status, reference } =
            job.data;
          const application = await Application.findById(applicationId).exec();
          const profile = await Profile.findById(application?.profile)
            .lean()
            .exec();

          const invoice = await Invoice.findOne({ reference }).exec();

          // CAAP COURSES
          const CAAP_COURSES_PROMISE = getCoursesByCategory(2);
          const GRADE12_COURSES_PROMISE = getCoursesByCategory(3);
          const GRADE11_COURSES_PROMISE = getCoursesByCategory(6);

          const [CAPP_COURSES, GRADE12_COURSES, GRADE11_COURSES] =
            await Promise.all([
              CAAP_COURSES_PROMISE,
              GRADE12_COURSES_PROMISE,
              GRADE11_COURSES_PROMISE,
            ]);

          const PROGRAM_COURSES_MAP: Record<APPLICATION_PROGRAMS, number[]> = {
            CAAP: CAPP_COURSES.map((course) => course.id),
            GRADE12: GRADE12_COURSES.map((course) => course.id),
            DIRECT: GRADE12_COURSES.map((course) => course.id),
            GRADE11: GRADE11_COURSES.map((course) => course.id),
            AY12: [],
          };

          if (!profile || !application || !invoice)
            throw new Error("Missing important details");

          if (invoice.status == "success") {
            return console.log("Invoice already processed");
          }

          invoice.currency = currency;
          invoice.amount = amount;
          invoice.status = "success";
          invoice.application = applicationId;
          await invoice.save();

          const { email, firstName, lastName } = profile.bio;
          // * For an Enrollment into a previously paid application

          const studentId = await moodleCredentials({
            email,
            firstName,
            lastName,
          });

          const totalPayed =
            (
              await Invoice.find({
                application: applicationId,
                status: "success",
              })
                .lean()
                .exec()
            ).reduce((sum, inv) => sum + inv.amount, 0) / 100;

          // * Enrollment in a new program/course without an outsanding fee
          if (application.paid && application.outstanding <= 0) {
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
                await enrolStudentInCourses(studentId, additional.courses);
              }

              if (additional.programs.length > 0) {
                const programs = new Set([
                  ...application.programs,
                  ...additional.programs,
                ]);
                application.programs = [...programs];
                const totalPrice = cost([...programs]);
                application.outstanding = totalPrice - totalPayed;

                // enrol in the new programs
                const coursesIds = [
                  ...new Set(
                    Array.from(additional.programs).flatMap(
                      (program) => PROGRAM_COURSES_MAP[program] ?? [],
                    ),
                  ),
                ];

                await enrolStudentInCourses(studentId, coursesIds);
              }
            }
          } else {
            const programsSet = new Set(application.programs);
            if (application?.mode == "on-site") {
              if (application.paused) {
                // unsuspending mail
                await suspendMoodleUserByEmail(profile.bio.email, true);
                application.paused = false;
                const { html } = compileEmail("restore", {
                  studentName: profile.bio.firstName,
                  loginUrl: "https://study.northbridgec.ca/login",
                });
                await emailQueue.add(
                  "deliver",
                  {
                    to: email,
                    html,
                    subject: "Account Suspension",
                  },
                  { jobId: `mail-${application._id}` },
                );
              }
              // ! GRANTING ACCESS INTO SELECTED PROGRAMS
              const coursesIds = [
                ...new Set(
                  Array.from(programsSet).flatMap(
                    (program) => PROGRAM_COURSES_MAP[program] ?? [],
                  ),
                ),
              ];

              // ! CHECKING IF IT IS INSTALLMENTAL PAYMENT
              const totalPrice = cost(application.programs);
              // cummulate all invoices for the application and convert from units
              application.outstanding = totalPrice - totalPayed;

              // * Enrol into moodle programs
              await enrolStudentInCourses(studentId, coursesIds);
            }
          }
          application.paid = true;
          await application.save();
        }

        return { success: true };
      },

      {
        connection,
        concurrency: 5,
      },
    );

    const paymentCampaignWorker = new Worker(
      "campaign",
      async (job) => {
        if (job.name === "check-record") {
          const invoices = await Invoice.find({ status: "pending" })
            .lean()
            .exec();

          if (!invoices.length) return;

          // Bulk fetch applications
          const applicationIds = invoices.map((i) => i.application);
          const applications = await Application.find({
            _id: { $in: applicationIds },
          })
            .lean()
            .exec();
          const applicationsMap = Object.fromEntries(
            applications.map((a) => [a._id.toString(), a]),
          );

          // Bulk fetch users
          const userIds = applications.map((a) => a.applicant);
          const users = await User.find({ _id: { $in: userIds } })
            .lean()
            .exec();
          const usersMap = Object.fromEntries(
            users.map((u) => [u._id.toString(), u]),
          );

          // Push email jobs concurrently
          await Promise.all(
            invoices.map(async (invoice) => {
              const application =
                applicationsMap[invoice.application.toString()];
              if (!application || application.paid) return;

              const applicant = usersMap[application.applicant.toString()];
              if (!applicant) return;

              const { html } = compileEmail("reminder", {
                applicantName: applicant.name,
                program:
                  application.programs?.join(", ") ||
                  `${application.courses.length} courses`,
                applicationDate: moment(application.createdAt).format(
                  "YYYY MMM D, h:mm A",
                ),
                paymentUrl: invoice.url,
              });

              await emailQueue.add(
                "deliver",
                { to: applicant.email, html, subject: "Complete your payment" },
                { jobId: `payment-${invoice._id}` },
              );
            }),
          );
        }
      },
      {
        connection,
        concurrency: 5,
      },
    );

    const suspendDebtorWorker = new Worker(
      "suspend",
      async (job) => {
        if (job.name !== "installment") return;

        const installmentApplications = await Application.find({
          installment: { $gt: 0 },
          mode: "on-site",
          paused: { $ne: true },
        }).exec();

        if (!installmentApplications.length) return { success: true };

        for (const application of installmentApplications) {
          try {
            const [lastInvoice, profile, user] = await Promise.all([
              Invoice.findOne({
                application: application._id,
                status: "success",
              })
                .sort({ createdAt: -1 })
                .lean()
                .exec(),

              Profile.findById(application.profile).lean().exec(),
              User.findById(application.applicant).lean().exec(),
            ]);

            if (!lastInvoice || !profile) continue;

            const email = profile?.bio?.email || user?.email;
            if (!email) continue;

            const daysDiff = moment().diff(
              moment(lastInvoice.createdAt),
              "days",
            );

            if (daysDiff <= MAX_DAYS_WITHOUTPAYMENT) continue;

            // Suspend Moodle
            await suspendMoodleUserByEmail(profile.bio.email);

            // Create payment
            const response = await initializePayment({
              amount: application.outstanding,
              email: user?.email || "",
              applicationId: application._id,
              metadata: {
                applicationId: application._id,
              },
              customerName: user?.name || "",
            });

            // Email
            const { html } = compileEmail("suspension", {
              studentName: profile.bio.firstName,
              amount: formatCurrency(application.outstanding),
              paymentUrl: response.data.authorization_url,
              date: moment().format("MMMM Do YYYY, h:mm A"),
            });

            await emailQueue.add(
              "deliver",
              {
                to: email,
                html,
                subject: "Account Suspension",
              },
              { jobId: `payment-${response.data.reference}` },
            );

            application.paused = true;
            await application.save();
          } catch (err) {
            console.error("Failed for application:", application._id, err);
          }
        }
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

    paymentWebhookWorker.on("failed", (job, err) => {
      console.error(`Job ${job?.id} failed`, err);
    });

    suspendDebtorWorker.on("failed", (job, err) => {
      console.error(`Job ${job?.id} failed`, err);
    });

    paymentCampaignWorker.on("failed", (job, err) => {
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
