// app/(root)/mentorship/page.jsx
import MentorCard from "@/components/MentorCard";

export default function MentorshipPage() {
  const mentors = [
    {
      id: 1,
      name: "Ankit Kumar",
      role: "Senior Engineer @ Google",
      experience: "8 years",
      rating: 4.9,
      sessions: 245,
      expertise: ["System Design", "Algorithms", "Career Growth"],
      availability: ["Mon", "Wed", "Fri"],
      rate: "$100/hour",
    },
    {
      id: 2,
      name: "Priya Sharma",
      role: "Product Manager @ Meta",
      experience: "6 years",
      rating: 4.8,
      sessions: 189,
      expertise: ["Product Strategy", "UX Design", "Leadership"],
      availability: ["Tue", "Thu"],
      rate: "$120/hour",
    },
    {
      id: 3,
      name: "Rohan Verma",
      role: "Data Scientist @ Amazon",
      experience: "5 years",
      rating: 4.7,
      sessions: 156,
      expertise: ["Machine Learning", "Python", "Statistics"],
      availability: ["Mon", "Thu", "Sat"],
      rate: "$90/hour",
    },
    {
      id: 4,
      name: "Sneha Patel",
      role: "Frontend Lead @ Netflix",
      experience: "7 years",
      rating: 4.9,
      sessions: 210,
      expertise: ["React", "TypeScript", "Performance"],
      availability: ["Wed", "Fri", "Sun"],
      rate: "$110/hour",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Find Your Mentor</h1>
        <p className="text-light-100 max-w-2xl mx-auto">
          Connect with experienced professionals who can guide you through your 
          career journey, interview preparation, and skill development
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mentors.map((mentor) => (
          <MentorCard key={mentor.id} mentor={mentor} />
        ))}
      </div>
    </div>
  );
}