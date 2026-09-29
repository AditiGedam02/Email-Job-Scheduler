import { Clock, Mail } from "lucide-react";
import type { EmailJob } from "../types";

interface ScheduledEmailsTableProps {
  emails: EmailJob[];
}

export default function ScheduledEmailsTable({
  emails,
}: ScheduledEmailsTableProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Scheduled Emails
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Upcoming emails waiting for delivery.
        </p>
      </div>

      {emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <Mail className="h-10 w-10 text-slate-300" />

          <p className="mt-3 text-sm font-medium text-slate-700">
            No scheduled emails
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Scheduled emails will appear here.
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
                <th className="px-6 py-3">Scheduled</th>
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
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(
                        email.scheduledAt
                      ).toLocaleString()}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                      {email.status}
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