// app/(root)/saved-internships/page.jsx

"use client";

import { useState, useEffect } from "react";
import InternshipCard from "@/components/InternshipCard";
import { getSavedInternships } from "@/lib/actions/saved-internships.action";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SavedInternshipsPage() {
  const [savedInternships, setSavedInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get user
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (!currentUser) {
          setLoading(false);
          return;
        }

        // Get saved internships
        const result = await getSavedInternships();
        if (result.success) {
          setSavedInternships(result.internships);
        }
      } catch (error) {
        console.error("Error loading saved internships:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (!user) {
    return (
      <div className="flex flex-col gap-8">
        <section className="blue-gradient-dark rounded-3xl px-8 py-8">
          <h1 className="text-3xl font-semibold">Saved Internships</h1>
          <p className="text-light-100 text-sm">
            Please sign in to view your saved internships
          </p>
        </section>
        <div className="flex justify-center items-center py-16">
          <Link href="/sign-in">
            <Button className="btn-primary">Sign In to Continue</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="blue-gradient-dark rounded-3xl px-8 py-8">
        <h1 className="text-3xl font-semibold">Saved Internships</h1>
        <p className="text-light-100 text-sm">
          {savedInternships.length} internship{savedInternships.length !== 1 ? "s" : ""} saved
        </p>
      </section>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary-100"></div>
        </div>
      ) : savedInternships.length === 0 ? (
        <div className="card-border">
          <div className="card p-12 text-center">
            <h3 className="text-xl font-semibold mb-2">No saved internships yet</h3>
            <p className="text-light-100 mb-6">
              Start exploring internships and save the ones you're interested in!
            </p>
            <Link href="/internships">
              <Button className="btn-primary">Explore Internships</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {savedInternships.map((internship) => (
            <InternshipCard
              key={internship.internshipId}
              internship={{
                ...internship,
                id: internship.internshipId,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
