import sendMail from "./sendMail";
import { createMoodleUser, getMoodleUserByEmail } from "./moodle";
import generatePassword from "./generateRandomPassword";
import { compileEmail } from "../emails/compileEmail";
export default async function moodleCredentials(details: {
  email: string;
  firstName: string;
  lastName: string;
}): Promise<number> {
  const { email, firstName, lastName } = details;
  const password = generatePassword();
  const exisiting = await getMoodleUserByEmail(email);
  const id = exisiting[0]?.id;
  if (id) return id;
  const newId = await createMoodleUser({
    username: email,
    password,
    firstName,
    lastName,
    email,
  });

  const { html } = compileEmail("moodle", {
    studentEmail: email,
    studentPassword: password,
    companyName: "NBC",
  });

  // * send moodle details to off-site users
  await sendMail({
    to: `${email}`,
    html,
    subject: "Study Account Credentials",
  });
  return newId;
}
