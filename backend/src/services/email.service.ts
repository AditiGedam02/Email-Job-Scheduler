import nodemailer from "nodemailer";

const host = process.env.ETHEREAL_HOST;
const port = Number(process.env.ETHEREAL_PORT || 587);
const user = process.env.ETHEREAL_USER;
const password = process.env.ETHEREAL_PASSWORD;

if (!host || !user || !password) {
  throw new Error("Ethereal SMTP configuration is missing");
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: false,
  auth: {
    user,
    pass: password,
  },
});

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
}

export async function sendEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const result = await transporter.sendMail({
    from: user,
    to: input.to,
    subject: input.subject,
    text: input.body,
  });

  const previewUrl = nodemailer.getTestMessageUrl(result);

  return {
    messageId: result.messageId,
    previewUrl,
  };
}