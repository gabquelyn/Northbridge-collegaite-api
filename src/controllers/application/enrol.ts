import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";

import { validationResult } from "express-validator";
import { CustomRequest } from "../../types/request";
import Profile from "../../model/profile";
import Application from "../../model/application";
import initializePayment from "../../utils/initializePayment";

import { getMoodleCourses } from "../../utils/moodle";

import User from "../../model/user";

 const enrol = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as CustomRequest).id;
    const { profile } = req.params;
    const { programs, courses } = req.body;
    const error = validationResult(req);
    if (!error.isEmpty()) return res.status(400).json({ error: error.array() });
    const selectedProfile = await Profile.findById(profile).lean().exec();
    const user = await User.findById(userId).lean().exec();
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!selectedProfile)
      return res.status(404).json({ message: "Admission profile not found" });
    const hasPrograms = programs.length > 0;
    const hasCourses = courses.length > 0;

    if (!hasPrograms && !hasCourses) {
      return res.status(400).json({ message: "Select a course or program" });
    }

    if (hasPrograms && hasCourses) {
      return res.status(400).json({
        message: "Can't enrol for a course and a program simultaneously",
      });
    }

    const query: { applicant: string; profile: string; paid?: boolean } = {
      applicant: userId,
      profile: profile,
    };

    if (hasCourses) {
      query.paid = true;
    }

    const prevApplications = await Application.find(query).lean().exec();

    // * check if the admission requested already on the course or program
    // Paid for courses and applied for programs
    for (const application of prevApplications) {
      if (hasCourses) {
        for (const course of courses) {
          if (application.courses.includes(course))
            return res
              .status(400)
              .json({ message: `Course ,${course}, already paid for` });
        }
      }

      if (hasPrograms) {
        for (const program of programs) {
          if (application.programs.includes(program))
            return res
              .status(400)
              .json({ message: `Program ,${program}, already applied for` });
        }
      }
    }

    // for course purchase
    if (hasCourses) {
      const moodleCourses = await getMoodleCourses();
      const moodleCourseIds = moodleCourses.map((obj) => obj.id);
      for (const course of courses)
        if (!moodleCourseIds.includes(course))
          return res
            .status(400)
            .json({ message: "Selected course doesn't exist in moodle" });
    }

    // for non-canadian student: check CAAP is included or taken previously
    if (hasPrograms) {
      const activeCAAP = await Application.findOne({
        ...query,
        paid: true,
        programs: "CAAP",
      })

        .lean()
        .exec();
      if (
        !selectedProfile.citizenship.canadian &&
        !programs.includes("CAAP") &&
        !activeCAAP
      )
        return res
          .status(400)
          .json({ message: "Non-canadian students are mandated to take CAAP" });

      const activeGrade12 = await Application.findOne({
        ...query,
        paid: true,
        programs: "GRADE12",
      });

      // can't take AY12 without grade 12
      if (
        programs.include("AY12") &&
        !programs.include("GRADE12") &&
        !activeGrade12
      ) {
        return res
          .status(400)
          .json({ message: "Grade 12 program must accompany AY12" });
      }

      // can't take Grade 12 without grade 11

      const activeGrade11 = await Application.findOne({
        ...query,
        paid: true,
        programs: "GRADE11",
      });
      if (
        programs.include("GRADE12") &&
        !programs.include("GRADE11") &&
        !activeGrade11
      ) {
        return res
          .status(400)
          .json({ message: "Grade 11 program must be done before grade 12" });
      }
    }

    // create a new application for program or courses
    const application = await Application.create({
      applicant: (req as CustomRequest).id,
      profile,
      programs,
      courses,
      mode: hasCourses ? "off-site" : "on-site",
    });

    if (hasCourses) {
      // * send details to make payments
      const totalPrice = courses.length * 1045000;
      const response = await initializePayment({
        amount: totalPrice,
        email: user.email,
        metadata: {
          applicationId: application._id,
        },
        application: application._id,
        user: (req as CustomRequest).id,
      });

      return res.status(201).json({
        paymentUrl: response.data?.authorization_url,
        accessCode: response.data?.access_code,
      });
    }

    return res
      .status(201)
      .json({ message: `Application for ${programs.join(",")} submitted` });
  },
);


export default enrol;