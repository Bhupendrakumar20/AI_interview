// app/(root)/competitions/page.jsx
import CompetitionCard from "@/components/CompetitionCard";

export default function CompetitionsPage() {
  const competitions = [
    {
      id: 1,
      title: "Quest Ingenium",
      organizer: "Engineering Association",
      description: "Solve the world's hardest engineering problems",
      prize: "₹2,00,000",
      deadline: "2024-04-30",
      participants: "50,000+",
      tags: ["Engineering", "Innovation", "Hardware"],
      featured: true,
    },
    {
      id: 2,
      title: "tbo.com Challenge",
      organizer: "Travel Brand Online",
      description: "Build innovative travel solutions",
      prize: "₹3,00,000",
      deadline: "2024-05-15",
      participants: "30,000+",
      tags: ["Travel", "Tech", "Startup"],
      featured: true,
    },
    {
      id: 3,
      title: "AI Hackathon 2024",
      organizer: "AI Research Lab",
      description: "Build AI solutions for social good",
      prize: "₹1,50,000",
      deadline: "2024-04-20",
      participants: "25,000+",
      tags: ["AI", "ML", "Hackathon"],
    },
    {
      id: 4,
      title: "Code Wars 2024",
      organizer: "Programming Community",
      description: "Competitive programming championship",
      prize: "₹1,00,000",
      deadline: "2024-04-10",
      participants: "100,000+",
      tags: ["Programming", "Algorithms", "DSA"],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Competitions</h1>
        <p className="text-light-100">
          Participate in challenges, win prizes, and showcase your skills
        </p>
      </div>

      {/* Featured Competitions */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Featured Competitions</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {competitions
            .filter(comp => comp.featured)
            .map((competition) => (
              <CompetitionCard key={competition.id} competition={competition} />
            ))
          }
        </div>
      </div>

      {/* All Competitions */}
      <div>
        <h2 className="text-2xl font-bold mb-4">All Competitions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitions.map((competition) => (
            <CompetitionCard key={competition.id} competition={competition} />
          ))}
        </div>
      </div>
    </div>
  );
}