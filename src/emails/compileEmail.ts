import fs from "fs";
import path from "path";
import mjml2html from "mjml";
import Handlebars, { TemplateDelegate } from "handlebars";
import { htmlToText } from "html-to-text";

type CompliedTemplate = {
  htmlTemplate: TemplateDelegate;
};

const cachedTemplate: Record<string, CompliedTemplate> = {};

export const compileEmail = (
  templateName: "forget" | "payment" | "welcome" | "moodle",
  data: any,
): { html: string; text: string } => {
  if (!cachedTemplate[templateName]) {
    const filePath = path.join(__dirname, "templates", `${templateName}.mjml`);

    const mjmlTemplate = fs.readFileSync(filePath, "utf8");

    // Compile MJML to HTML
    const { html } = mjml2html(mjmlTemplate, { filePath });

    // Inject variables using Handlebars
    const htmlTemplate = Handlebars.compile(html);
    cachedTemplate[templateName] = { htmlTemplate };
  }

  const { htmlTemplate } = cachedTemplate[templateName];

  const html = htmlTemplate(data);

  const text = htmlToText(html, { wordwrap: 130 });
  return { html, text };
};
