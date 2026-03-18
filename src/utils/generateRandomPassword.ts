export default function generatePassword(length: number = 8): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const specialchars = "!@#$%^&*-";
  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }

  // a special character if missed at random

  return (
    password + specialchars[Math.floor(Math.random() * specialchars.length)]
  );
}
