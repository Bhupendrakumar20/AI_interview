import { getCurrentUser } from "@/lib/actions/auth.action";
import UpdateProfileForm from "@/components/UpdateProfileForm";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-8">
      <section className="blue-gradient-dark rounded-3xl px-8 py-8">
        <h1 className="text-3xl font-semibold">Your Profile</h1>
        <p className="text-light-100 text-sm">
          Update your name and attach a resume link so PrepWise can tailor
          interviews to your background.
        </p>
      </section>

      <section className="card-border w-full">
        <div className="card p-6">
          <UpdateProfileForm user={user} />
        </div>
      </section>
    </div>
  );
}
