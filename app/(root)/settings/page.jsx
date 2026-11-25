import SettingsForm from "@/components/SettingsForm";
import { getCurrentUser } from "@/lib/actions/auth.action";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-8">
      {/* Header Section */}
      <section className="soft-indigo-header rounded-3xl px-8 py-8">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          Manage your account, security, and preferences. All changes are saved to Firebase.
        </p>
      </section>

      {/* Settings Form Card */}
      <section className="card-border">
        <div className="card p-8 md:p-10">
          <SettingsForm user={user} />
        </div>
      </section>

      {/* Info Section */}
      <section className="bg-dark-200/50 border border-dark-300 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-light-100 mb-3">Important Notes</h3>
        <ul className="text-sm text-light-400 space-y-2">
          <li>• Your account data is securely stored in Firebase</li>
          <li>• Clearing history will remove all interview records</li>
          <li>• Deleting your account is permanent and cannot be undone</li>
          <li>• All your personal information will be removed from our servers</li>
        </ul>
      </section>
    </div>
  );
}
