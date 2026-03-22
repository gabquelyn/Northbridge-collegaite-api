import { cache } from "../middlewares/cache";
import { getMoodleCourses } from "./moodle";
export async function getCachedMoodleCourses(): Promise<{ id: number }[]> {
  const cacheKey = "moodle_courses";

  const cached = cache.get<{ id: number }[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const courses = await getMoodleCourses();

  cache.set(cacheKey, courses);

  return courses;
}
