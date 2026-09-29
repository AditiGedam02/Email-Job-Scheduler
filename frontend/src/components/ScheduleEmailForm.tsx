import { useEffect, useRef, useState } from "react";
import { Upload, Send, FileText } from "lucide-react";
import { api } from "../services/api";
import type { Sender } from "../types";

interface ScheduleEmailFormProps {
  onScheduled?: () => void;
}

export default function ScheduleEmailForm({
  onScheduled,
}: ScheduleEmailFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [senders, setSenders] = useState<Sender[]>([]);
  const [senderId, setSenderId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [startAt, setStartAt] = useState("");
  const [delayMs, setDelayMs] = useState(0);
  const [hourlyLimit, setHourlyLimit] = useState(100);

  const [loadingSenders, setLoadingSenders] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSenders() {
      try {
        const response = await api.get("/senders");

        const data: Sender[] = response.data.data || [];

        setSenders(data);

        if (data.length > 0) {
          setSenderId(data[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load senders.");
      } finally {
        setLoadingSenders(false);
      }
    }

    loadSenders();
  }, []);

  function parseRecipients(content: string) {
    const values = content
      .split(/[\s,;]+/)
      .map((value) => value.trim())
      .filter(Boolean);

    const validEmails = values.filter((email) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );

    setRecipients([...new Set(validEmails)]);
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const content = String(reader.result || "");
      parseRecipients(content);
    };

    reader.readAsText(file);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!senderId) {
      setError("Please select a sender.");
      return;
    }

    if (!subject.trim()) {
      setError("Please enter a subject.");
      return;
    }

    if (!body.trim()) {
      setError("Please enter the email body.");
      return;
    }

    if (recipients.length === 0) {
      setError("Please upload a file containing valid email addresses.");
      return;
    }

    if (!startAt) {
      setError("Please select a start time.");
      return;
    }

    try {
      setSubmitting(true);

      await api.post("/campaigns", {
        senderId,
        subject: subject.trim(),
        body: body.trim(),
        recipients,
        startAt: new Date(startAt).toISOString(),
        delayMs,
        hourlyLimit,
      });

      setMessage(
        `Campaign scheduled successfully for ${recipients.length} recipients.`
      );

      setSubject("");
      setBody("");
      setRecipients([]);
      setStartAt("");
      setDelayMs(0);
      setHourlyLimit(100);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onScheduled?.();
    } catch (err: any) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          "Failed to schedule the campaign."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Schedule New Email Campaign
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Configure your email campaign and delivery limits.
        </p>
      </div>

      {message && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-5">
        {/* Sender */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Sender
          </label>

          <select
            value={senderId}
            onChange={(event) => setSenderId(event.target.value)}
            disabled={loadingSenders || submitting}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">
              {loadingSenders
                ? "Loading senders..."
                : "Select sender"}
            </option>

            {senders.map((sender) => (
              <option key={sender.id} value={sender.id}>
                {sender.displayName
                  ? `${sender.displayName} — ${sender.email}`
                  : sender.email}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Subject
          </label>

          <input
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Enter email subject"
            disabled={submitting}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        {/* Body */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Email Body
          </label>

          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write your email message..."
            rows={7}
            disabled={submitting}
            className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        {/* Recipients */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Recipients
          </label>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-slate-400 hover:bg-slate-100"
          >
            <Upload className="mx-auto h-7 w-7 text-slate-500" />

            <p className="mt-2 text-sm font-medium text-slate-700">
              Upload CSV or TXT file
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Email addresses can be separated by commas,
              spaces, semicolons, or new lines.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {recipients.length > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3">
              <FileText className="h-4 w-4 text-slate-500" />

              <span className="text-sm font-medium text-slate-700">
                {recipients.length} valid recipients
              </span>
            </div>
          )}
        </div>

        {/* Scheduling settings */}
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Start Time
            </label>

            <input
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              disabled={submitting}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Delay Between Emails (ms)
            </label>

            <input
              type="number"
              min="0"
              value={delayMs}
              onChange={(event) =>
                setDelayMs(Number(event.target.value))
              }
              disabled={submitting}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Hourly Limit
            </label>

            <input
              type="number"
              min="1"
              value={hourlyLimit}
              onChange={(event) =>
                setHourlyLimit(Number(event.target.value))
              }
              disabled={submitting}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end border-t border-slate-200 pt-5">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />

            {submitting
              ? "Scheduling..."
              : "Schedule Campaign"}
          </button>
        </div>
      </div>
    </form>
  );
}