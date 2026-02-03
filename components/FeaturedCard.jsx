// components/FeaturedCard.jsx
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FeaturedCard = ({ title, company, description, type, prize, stats, buttonText, badge }) => {
  return (
    <div className="card-border h-full">
      <div className="card p-5 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-xl font-bold">{title}</h3>
            {company && <p className="text-primary-200 text-sm mt-1">{company}</p>}
          </div>
          {badge && (
            <span className="bg-success-100 text-dark-100 text-xs px-3 py-1 rounded-full font-semibold">
              {badge}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-light-100 mb-4 flex-1">{description}</p>

        {/* Prize Section */}
        {prize && (
          <div className="bg-dark-200 p-3 rounded-lg mb-4">
            <p className="text-sm font-semibold text-primary-200">Prize:</p>
            <p className="text-lg font-bold text-white">{prize}</p>
          </div>
        )}

        {/* Stats */}
        {stats && stats.length > 0 && (
          <div className="space-y-2 mb-4">
            {stats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-light-100">{stat.split(':')[0]}:</span>
                <span className="font-bold text-sm">{stat.split(':')[1]}</span>
              </div>
            ))}
          </div>
        )}

        {/* Type Badge */}
        {type && (
          <div className="mb-4">
            <span className={cn(
              "text-xs px-2 py-1 rounded-full",
              type === "internship" && "bg-blue-500/20 text-blue-300",
              type === "competition" && "bg-purple-500/20 text-purple-300",
              type === "award" && "bg-yellow-500/20 text-yellow-300"
            )}>
              {type}
            </span>
          </div>
        )}

        {/* Button */}
        <Button className="btn-primary w-full mt-auto">
          {buttonText}
        </Button>
      </div>
    </div>
  );
};

export default FeaturedCard;