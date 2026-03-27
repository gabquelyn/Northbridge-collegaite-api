import { cache } from "../middlewares/cache";
import { getMoodleCourses } from "./moodle";
export async function getCachedMoodleCourses(): Promise<{ id: number, fullname: string }[]> {
  const cacheKey = "moodle_courses";

  const cached = cache.get<{ id: number, fullname: string }[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const courses = await getMoodleCourses();

  cache.set(cacheKey, courses);

  return courses;
}
