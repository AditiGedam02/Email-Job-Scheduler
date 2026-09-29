import { CheckCircle, Mail } from "lucide-react";
import type { EmailJob } from "../types";

interface SentEmailsTableProps {
  emails: EmailJob[];
}

export default function SentEmailsTable({
  emails,
}: SentEmailsTableProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Sent Emails
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Recently delivered emails.
        </p>
      </div>

      {emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <Mail className="h-10 w-10 text-slate-300" />

          <p className="mt-3 text-sm font-medium text-slate-700">
            No sent emails
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Sent emails will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Recipient</th>
                <th className="px-6 py-3">Subject</th>
                <th className="px-6 py-3">Sender</th>
                <th className="px-6 py-3">Sent At</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {emails.map((email) => (
                <tr key={email.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {email.recipient}
                  </td>

                  <td className="max-w-xs truncate px-6 py-4 text-slate-600">
                    {email.subject}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {email.sender?.email || "—"}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                    {email.sentAt
                      ? new Date(
                          email.sentAt
                        ).toLocaleString()
                      : "—"}
                  </td>

                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      <CheckCircle className="h-3 w-3" />
                      SENT
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}