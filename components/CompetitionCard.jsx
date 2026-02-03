// components/CompetitionCard.jsx
import { Button } from "@/components/ui/button";

const CompetitionCard = ({ competition }) => {
  return (
    <div className="card-border">
      <div className="card p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-xl font-bold">{competition.title}</h3>
            <p className="text-primary-200">by {competition.organizer}</p>
          </div>
          {competition.featured && (
            <span className="bg-primary-200 text-dark-100 text-xs px-3 py-1 rounded-full font-semibold">
              Featured
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-light-100 mb-4">{competition.description}</p>

        {/* Prize */}
        <div className="bg-dark-200 p-3 rounded-lg mb-4">
          <div className="text-center">
            <div className="text-lg font-bold text-primary-200">Prize Pool</div>
            <div className="text-2xl font-bold">{competition.prize}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-between text-sm mb-4">
          <div>
            <div className="font-semibold">{competition.participants}</div>
            <div className="text-light-100">Participants</div>
          </div>
          <div>
            <div className="font-semibold">{competition.deadline}</div>
            <div className="text-light-100">Deadline</div>
          </div>
        </div>

        {/* Tags */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {competition.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-dark-300 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Button */}
        <Button className="btn-primary w-full">
          Register Now
        </Button>
      </div>
    </div>
  );
};

export default CompetitionCard;