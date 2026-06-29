// components/FeaturedCard.jsx
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FeaturedCard = ({ title, company, description, type, prize, stats, buttonText, badge }) => {
  return (
    <div className="card-featured-lift-glow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-foreground leading-snug">{title}</h3>
          {company && <p className="text-primary text-sm font-medium mt-1">{company}</p>}
        </div>
        {badge && (
          <span className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full font-semibold">
            {badge}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-muted-foreground text-sm mb-5 flex-1 leading-relaxed">{description}</p>

      {/* Prize Section */}
      {prize && (
        <div className="bg-secondary/50 border border-border/50 p-4 rounded-xl mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Prize</p>
          <p className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{prize}</p>
        </div>
      )}

      {/* Stats */}
      {stats && stats.length > 0 && (
        <div className="space-y-2 mb-5 border-t border-border/40 pt-4">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{stat.split(':')[0]}:</span>
              <span className="font-semibold text-sm text-foreground">{stat.split(':')[1]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Type Badge */}
      {type && (
        <div className="mb-5">
          <span className={cn(
            "text-xs px-2.5 py-1 rounded-full font-medium capitalize",
            type === "internship" && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
            type === "competition" && "bg-purple-500/10 text-purple-400 border border-purple-500/20",
            type === "award" && "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
          )}>
            {type}
          </span>
        </div>
      )}

      {/* Button */}
      <Button className="btn-primary w-full mt-auto cursor-pointer">
        {buttonText}
      </Button>
    </div>
  );
};

export default FeaturedCard;