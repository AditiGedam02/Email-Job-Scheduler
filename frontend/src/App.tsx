import { useEffect, useState } from "react";
import axios from "axios";
import { LogOut, Mail, Send, Clock, CheckCircle } from "lucide-react";

import ScheduleEmailForm from "./components/ScheduleEmailForm";
import ScheduledEmailsTable from "./components/ScheduledEmailsTable";
import SentEmailsTable from "./components/SentEmailsTable";

import { api } from "./services/api";
import { getCurrentUser, logoutUser } from "./services/auth";

import {
  disconnectSlack,
  getSlackStatus,
  sendSlackTest,
} from "./services/slack";

import type { Campaign, EmailJob, User } from "./types";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [scheduledEmails, setScheduledEmails] = useState<EmailJob[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailJob[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EmailJob[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [slackConnected, setSlackConnected] = useState(false);
  const [slackInfo, setSlackInfo] = useState<{
    teamName: string | null;
    channelName: string | null;
  } | null>(null);
  const [slackLoading, setSlackLoading] = useState(false);

  const handleConnectSlack = () => {
    window.location.href = "http://localhost:4000/auth/slack";
  };

  const handleDisconnectSlack = async () => {
    try {
      setSlackLoading(true);

      await disconnectSlack();

      setSlackConnected(false);
      setSlackInfo(null);
    } catch (error) {
      console.error("Failed to disconnect Slack:", error);
    } finally {
      setSlackLoading(false);
    }
  };

  const handleTestSlack = async () => {
    try {
      setSlackLoading(true);

      await sendSlackTest();

      alert("Slack test notification sent successfully.");
    } catch (error) {
      console.error("Failed to send Slack test notification:", error);
      alert("Unable to send Slack notification.");
    } finally {
      setSlackLoading(false);
    }
  };

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Authentication check failed:", error);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    }

    loadUser();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    loadDashboardData();
  }, [user]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError("");

      const [
        scheduledResponse,
        sentResponse,
        campaignsResponse,
        slackStatus,
      ] = await Promise.all([
        api.get("/emails/scheduled"),
        api.get("/emails/sent"),
        api.get("/campaigns"),
        getSlackStatus(),
      ]);

      setScheduledEmails(scheduledResponse.data.data || []);
      setSentEmails(sentResponse.data.data || []);
      setCampaigns(campaignsResponse.data.data || []);

      setSlackConnected(slackStatus.connected);

      setSlackInfo(
        slackStatus.integration
          ? {
              teamName: slackStatus.integration.teamName,
              channelName: slackStatus.integration.channelName,
            }
          : null,
      );
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }
  
  async function handleEmailSearch() {
  const query = searchQuery.trim();

  if (!query) {
    setSearchResults([]);
    return;
  }

  try {
    setSearchLoading(true);

    const response = await axios.get(
      "http://localhost:4000/api/search",
      {
        params: { q: query },
        withCredentials: true,
      }
    );

    setSearchResults(response.data.data || []);
  } catch (error) {
    console.error("Email search failed:", error);
    setSearchResults([]);
  } finally {
    setSearchLoading(false);
  }
}

  async function handleLogout() {
    try {
      await logoutUser();

      setUser(null);
      setScheduledEmails([]);
      setSentEmails([]);
      setCampaigns([]);
      setSlackConnected(false);
      setSlackInfo(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />

          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-gray-200 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gray-900 text-white">
            <Mail size={26} />
          </div>

          <h1 className="text-2xl font-semibold text-gray-900">
            Email Job Scheduler
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Schedule and manage your email campaigns from one dashboard.
          </p>

          <button
            onClick={() => {
              window.location.href = "http://localhost:4000/auth/google";
            }}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  const scheduledCount = scheduledEmails.length;
  const sentCount = sentEmails.length;
  const campaignCount = campaigns.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Email Job Scheduler
            </h1>

            <p className="text-sm text-gray-500">
              Manage scheduled and sent emails
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 font-medium text-gray-700">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {user.name}
                </p>

                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Page heading */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>

          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user.name.split(" ")[0]}.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Statistics */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Campaigns</p>

                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {campaignCount}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <Mail size={20} className="text-gray-700" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Scheduled</p>

                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {scheduledCount}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <Clock size={20} className="text-gray-700" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Sent</p>

                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {sentCount}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <CheckCircle size={20} className="text-gray-700" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Account</p>

                <p className="mt-2 truncate text-sm font-medium text-gray-900">
                  {user.email}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <Send size={20} className="text-gray-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Emails */}
<section className="mb-8 rounded-xl border border-gray-200 bg-white shadow-sm">
  <div className="border-b border-gray-200 px-6 py-5">
    <h3 className="text-lg font-semibold text-gray-900">
      Search Emails
    </h3>

    <p className="mt-1 text-sm text-gray-500">
      Search scheduled and sent emails.
    </p>
  </div>

  <div className="p-6">
    <div className="flex flex-col gap-3 sm:flex-row">
      <input
        type="text"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            handleEmailSearch();
          }
        }}
        placeholder="Search by recipient, subject, or body..."
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
      />

      <button
        type="button"
        onClick={handleEmailSearch}
        disabled={searchLoading}
        className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {searchLoading ? "Searching..." : "Search"}
      </button>
    </div>

    {searchQuery.trim() && !searchLoading && (
      <div className="mt-6">
        {searchResults.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Recipient
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Subject
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Scheduled At
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {searchResults.map((email) => (
                  <tr key={email.id}>
                    <td className="px-4 py-3 text-gray-900">
                      {email.recipient}
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      {email.subject}
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      {email.status}
                    </td>

                    <td className="px-4 py-3 text-gray-500">
                      {new Date(email.scheduledAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
            No matching emails found.
          </div>
        )}
      </div>
    )}
  </div>
</section>

        {/* Slack Notifications */}
        <section className="mb-8 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Slack Notifications
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Receive a Slack notification when the sender&apos;s hourly
                  email limit is reached.
                </p>
              </div>

              {!slackConnected ? (
                <button
                  type="button"
                  onClick={handleConnectSlack}
                  className="rounded-lg bg-[#4A154B] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Connect Slack
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    Connected
                  </span>

                  <button
                    type="button"
                    onClick={handleDisconnectSlack}
                    disabled={slackLoading}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>

          {slackConnected && slackInfo && (
            <div className="p-6">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Workspace:</span>{" "}
                  {slackInfo.teamName || "Connected workspace"}
                </p>

                <p className="mt-1 text-sm text-gray-700">
                  <span className="font-medium">Channel:</span>{" "}
                  {slackInfo.channelName || "Configured channel"}
                </p>

                <button
                  type="button"
                  onClick={handleTestSlack}
                  disabled={slackLoading}
                  className="mt-4 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-white disabled:opacity-50"
                >
                  {slackLoading
                    ? "Sending..."
                    : "Send Test Notification"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Schedule Email */}
        <section className="mb-8 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h3 className="text-lg font-semibold text-gray-900">
              Schedule New Emails
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Create an email campaign and schedule delivery.
            </p>
          </div>

          <div className="p-6">
            <ScheduleEmailForm />
          </div>
        </section>

        {/* Scheduled Emails */}
        <section className="mb-8 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h3 className="text-lg font-semibold text-gray-900">
              Scheduled Emails
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Emails waiting to be delivered.
            </p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="py-10 text-center text-sm text-gray-500">
                Loading scheduled emails...
              </div>
            ) : (
              <ScheduledEmailsTable emails={scheduledEmails} />
            )}
          </div>
        </section>

        {/* Sent Emails */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h3 className="text-lg font-semibold text-gray-900">
              Sent Emails
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Successfully processed email deliveries.
            </p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="py-10 text-center text-sm text-gray-500">
                Loading sent emails...
              </div>
            ) : (
              <SentEmailsTable emails={sentEmails} />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;