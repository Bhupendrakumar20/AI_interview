// components/MentorCard.jsx
import { Button } from "@/components/ui/button";

const MentorCard = ({ mentor }) => {
  return (
    <div className="card-border">
      <div className="card p-5">
        {/* Mentor Info */}
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-primary-200 rounded-full size-16 flex items-center justify-center">
            <span className="text-dark-100 font-bold text-xl">
              {mentor.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-bold">{mentor.name}</h3>
            <p className="text-primary-200 text-sm">{mentor.role}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-between mb-4 text-sm">
          <div>
            <div className="font-bold">{mentor.rating} ⭐</div>
            <div className="text-light-100">Rating</div>
          </div>
          <div>
            <div className="font-bold">{mentor.sessions}</div>
            <div className="text-light-100">Sessions</div>
          </div>
          <div>
            <div className="font-bold">{mentor.experience}</div>
            <div className="text-light-100">Experience</div>
          </div>
        </div>

        {/* Expertise */}
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Expertise</h4>
          <div className="flex flex-wrap gap-2">
            {mentor.expertise.map((skill, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-dark-200 text-xs rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Available On</h4>
          <div className="flex gap-2">
            {mentor.availability.map((day, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-primary-200/20 text-primary-200 text-xs rounded-full"
              >
                {day}
              </span>
            ))}
          </div>
        </div>

        {/* Rate & Button */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">{mentor.rate}</div>
            <div className="text-sm text-light-100">per hour</div>
          </div>
          <Button className="btn-primary">
            Book Session
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MentorCard;