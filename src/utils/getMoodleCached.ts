import { cache } from "../middlewares/cache";
import { getCoursesByCategory, getMoodleCourses } from "./moodle";
export async function getCachedMoodleCourses(): Promise<
  { id: number; fullname: string }[]
> {
  const cacheKey = "moodle_courses";

  const cached = cache.get<{ id: number; fullname: string }[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const allCourses = await getMoodleCourses();
  const caapCourses = (await getCoursesByCategory(2)).map((c) => c.id);
  const caapSet = new Set(caapCourses);
  const courses = allCourses.filter((c) => !caapSet.has(c.id));
  cache.set(cacheKey, courses);

  return courses;
}
