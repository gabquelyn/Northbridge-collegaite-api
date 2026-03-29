import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

export const createMoodleUser = async ({
  username,
  password,
  firstName,
  lastName,
  email,
}: {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
}): Promise<number> => {
  const params = new URLSearchParams();

  params.append("wstoken", MOODLE_TOKEN || "");
  params.append("wsfunction", "core_user_create_users");
  params.append("moodlewsrestformat", "json");

  params.append("users[0][username]", username);
  params.append("users[0][password]", password);
  params.append("users[0][firstname]", firstName);
  params.append("users[0][lastname]", lastName);
  params.append("users[0][email]", email);

  const response = await axios.post(
    `${MOODLE_URL}/webservice/rest/server.php`,
    params,
  );
  console.log(response.data);
  const createdUserId = response.data[0].id;
  console.log("Created user ID:", createdUserId);

  return createdUserId;
};

export const getMoodleUserByEmail = async (
  email: string,
): Promise<{ id: number }[]> => {
  try {
    const params = new URLSearchParams();

    params.append("wstoken", MOODLE_TOKEN as string);
    params.append("wsfunction", "core_user_get_users_by_field");
    params.append("moodlewsrestformat", "json");
    params.append("field", "email");
    params.append("values[0]", email);

    const response = await axios.post(
      `${MOODLE_URL}/webservice/rest/server.php`,
      params,
    );

    return response.data;
  } catch (error: any) {
    console.error("Moodle lookup failed:", error.response?.data || error);
    throw error;
  }
};

export async function getMoodleCourses(): Promise<
  { id: number; fullname: string }[]
> {
  try {
    const params = new URLSearchParams();

    params.append("wstoken", MOODLE_TOKEN as string);
    params.append("wsfunction", "core_course_get_courses_by_field");
    params.append("moodlewsrestformat", "json");
    params.append("field", ""); // empty = all courses

    const response = await axios.post(
      `${MOODLE_URL}/webservice/rest/server.php`,
      params,
    );

    const courses = response.data.courses || [];
    return courses.map((course: any) => ({
      id: course.id,
      fullname: course.fullname,
      summary: course.summary,
      shortname: course.shortname,
      category: course.categoryid,
      // 👇 Extract image safely
      image: course.overviewfiles?.[0]?.fileurl
        ? `${course.overviewfiles[0].fileurl.replace("/webservice", "")}?token=${MOODLE_TOKEN}`
        : null,
    }));
  } catch (error: any) {
    console.error(
      "Failed to retrieve Moodle courses:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

export async function enrolStudentInCourses(
  userid: number,
  courseIds: number[],
  roleid: number = 5,
) {
  if (courseIds.length === 0) return [];
  const params = new URLSearchParams();

  params.append("wstoken", process.env.MOODLE_TOKEN as string);
  params.append("wsfunction", "enrol_manual_enrol_users");
  params.append("moodlewsrestformat", "json");

  // Prepare enrolments for all courses
  courseIds
    .filter((id) => id !== 1)
    .forEach((courseId, index) => {
      params.append(`enrolments[${index}][roleid]`, roleid.toString());
      params.append(`enrolments[${index}][userid]`, userid.toString());
      params.append(`enrolments[${index}][courseid]`, courseId.toString());
    });

  const response = await axios.post(
    `${process.env.MOODLE_URL}/webservice/rest/server.php`,
    params,
  );

  return response.data;
}

export async function getMoodleCategories() {
  try {
    const params = new URLSearchParams();

    params.append("wstoken", MOODLE_TOKEN as string);
    params.append("wsfunction", "core_course_get_categories");
    params.append("moodlewsrestformat", "json");

    const response = await axios.post(
      `${MOODLE_URL}/webservice/rest/server.php`,
      params,
    );

    return response.data;
  } catch (error: any) {
    console.error(
      "Failed to retrieve Moodle categories:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

export async function getCoursesByCategory(
  categoryId: number,
): Promise<{ id: number }[]> {
  const params = new URLSearchParams();

  params.append("wstoken", process.env.MOODLE_TOKEN as string);
  params.append("wsfunction", "core_course_get_courses_by_field");
  params.append("moodlewsrestformat", "json");

  params.append("field", "category");
  params.append("value", categoryId.toString());

  const res = await axios.post(
    `${process.env.MOODLE_URL}/webservice/rest/server.php`,
    params,
  );

  return res.data.courses || [];
}
