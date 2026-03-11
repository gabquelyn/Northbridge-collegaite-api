import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

export const createMoodleUser = async ({
  username,
  password,
  firstname,
  lastName,
  email,
}: {
  username: string;
  password: string;
  firstname: string;
  lastName: string;
  email: string;
}) => {
  const params = new URLSearchParams();

  params.append("wstoken", MOODLE_TOKEN || "");
  params.append("wsfunction", "core_user_create_users");
  params.append("moodlewsrestformat", "json");

  params.append("users[0][username]", username);
  params.append("users[0][password]", password);
  params.append("users[0][firstname]", firstname);
  params.append("users[0][lastname]", lastName);
  params.append("users[0][email]", email);

  const response = await axios.post(
    `${MOODLE_URL}/webservice/rest/server.php`,
    params,
  );

  console.log(response.data);
};

export const getMoodleUserByEmail = async (email: string) => {
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

export async function getMoodleCourses(): Promise<{ id: number }[]> {
  try {
    const params = new URLSearchParams();

    params.append("wstoken", MOODLE_TOKEN as string);
    params.append("wsfunction", "core_course_get_courses");
    params.append("moodlewsrestformat", "json");

    const response = await axios.post(
      `${MOODLE_URL}/webservice/rest/server.php`,
      params,
    );

    return response.data;
  } catch (error: any) {
    console.error(
      "Failed to retrieve Moodle courses:",
      error.response?.data || error.message,
    );
    throw error;
  }
}
