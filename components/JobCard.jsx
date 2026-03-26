// components/JobCard.jsx
import { Button } from "@/components/ui/button";

const JobCard = ({ job }) => {
  const handleApplyNow = () => {
    if (job.url && job.url !== "#") {
      window.open(job.url, "_blank");
    }
  };

  const handleSave = () => {
    // TODO: Add save functionality
    console.log("Saved job:", job.id);
  };

  return (
    <div className="card-border hover:shadow-lg hover:shadow-primary-200/20 transition-all duration-300 hover:-translate-y-1">
      <div className="card p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold hover:text-primary-100 transition-colors">{job.title}</h3>
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
              <span className="text-slate-400">Location:</span>
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Salary:</span>
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
            {Array.isArray(job.skills) && job.skills.length > 0 ? (
              job.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-dark-200 text-xs rounded-full hover:bg-dark-250 transition-colors duration-300"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs text-light-100/50">No skills listed</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleApplyNow}
            disabled={!job.url || job.url === "#"}
            className="btn-primary flex-1 hover:scale-105 active:scale-95 transition-transform duration-300"
          >
            Apply Now
          </Button>
          <Button onClick={handleSave} className="btn-secondary hover:scale-105 active:scale-95 transition-transform duration-300">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JobCard;