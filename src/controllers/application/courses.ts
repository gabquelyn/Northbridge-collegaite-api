import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { getMoodleCategories } from "../../utils/moodle";

import { getCachedMoodleCourses } from "../../utils/getMoodleCached";

export const getOnlineCourses = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const data = await getCachedMoodleCourses();
    return res.status(200).json({ data });
  },
);

export const getCoursesCategories = expressAsyncHandler(
  async (req: Request, res: Response): Promise<any> => {
    const data = await getMoodleCategories();
    return res.status(200).json({ data });
  },
);
