// components/JobCard.jsx
import { Button } from "@/components/ui/button";

const JobCard = ({ job }) => {
  return (
    <div className="card-border">
      <div className="card p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold">{job.title}</h3>
            <p className="text-primary-200">{job.company}</p>
          </div>
          <span className="bg-primary-200/20 text-primary-200 text-xs px-3 py-1 rounded-full">
            {job.type}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span>📍</span>
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>💰</span>
              <span>{job.salary}</span>
            </div>
          </div>

          <div className="text-sm">
            <span className="text-light-100">Experience: </span>
            <span className="font-semibold">{job.experience}</span>
          </div>

          <div className="text-sm text-light-100">
            Posted {job.posted}
          </div>
        </div>

        {/* Skills */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-dark-200 text-xs rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button className="btn-primary flex-1">
            Apply Now
          </Button>
          <Button className="btn-secondary">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JobCard;