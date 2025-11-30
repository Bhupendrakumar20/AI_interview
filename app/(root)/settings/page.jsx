import SettingsForm from "@/components/SettingsForm";
import { getCurrentUser } from "@/lib/actions/auth.action";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-8">
      <section className="blue-gradient-dark rounded-3xl px-8 py-8">
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-light-100 text-sm">
          Manage your account, permissions, and app behavior.
        </p>
      </section>

      <section className="card-border">
        <div className="card p-6">
          <SettingsForm user={user} />
        </div>
      </section>
    </div>
  );
}
