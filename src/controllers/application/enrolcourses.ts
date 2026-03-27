import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { CustomRequest } from "../../types/request";
import { validationResult } from "express-validator";
import { getCachedMoodleCourses } from "../../utils/getMoodleCached";
import Application from "../../model/application";
import initializePayment from "../../utils/initializePayment";
import { UNIT_COURSE } from "../../config/prices";
import User from "../../model/user";
import temp from "../../model/temp";

const enrolCourses = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const userId = (req as CustomRequest).id;
    const { courses } = req.body;

    const error = validationResult(req);
    if (!error.isEmpty()) return res.status(400).json({ error: error.array() });

    const offSiteApplicationPromise = Application.findOne({
      applicant: userId,
      mode: "off-site",
    });

    const userPromise = User.findById(userId).lean().exec();
    const moodleCoursesPromise = getCachedMoodleCourses();
    const [offSiteApplication, moodleCourses, user] = await Promise.all([
      offSiteApplicationPromise,
      moodleCoursesPromise,
      userPromise,
    ]);

    // no application yet, redirect to register
    if (!offSiteApplication)
      return res
        .status(302)
        .json({ message: "Register for online application" });

    const moodleCourseIds = new Set(moodleCourses.map((obj) => obj.id));
    const selectedCourses = new Set(offSiteApplication.courses);

    for (const id of courses) {
      if (!moodleCourseIds.has(id))
        return res.status(400).json({ message: "Invalid course" });
      if (selectedCourses.has(id))
        return res.status(400).json({
          message: `Course, ${moodleCourses.find((c) => c.id == id)?.fullname} already in previous application`,
        });
    }

    // add to selected not paid and trigger the payment
    let paymentUrl, accessCode;
    if (!offSiteApplication.paid) {
      const newCourseSelection = [...offSiteApplication.courses, ...courses];
      offSiteApplication.courses = newCourseSelection;
      await offSiteApplication.save();

      const response = await initializePayment({
        amount: newCourseSelection.length * UNIT_COURSE,
        email: user?.email || "",
        metadata: {
          applicationId: offSiteApplication._id,
        },
      });

      paymentUrl = response.data?.authorization_url;
      accessCode = response.data?.access_code;
    } else {
      const response = await initializePayment({
        amount: courses.length * UNIT_COURSE,
        email: user?.email || "",
        metadata: {
          applicationId: offSiteApplication._id,
        },
      });

      paymentUrl = response.data?.authorization_url;
      accessCode = response.data?.access_code;
      await temp.create({
        application: offSiteApplication._id,
        courses,
        reference: response.data.reference,
      });
    }

    // send payment link for everything
    return res.status(201).json({
      paymentUrl,
      accessCode,
    });
  },
);

export default enrolCourses;
