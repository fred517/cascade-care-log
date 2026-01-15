import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuideCardProps {
  title: string;
  description: string;
  icon: string;
  category: string;
  onClick: () => void;
}

export function GuideCard({ title, description, icon, category, onClick }: GuideCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 group"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground">
              {category}
            </span>
          </div>
          <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        </div>

        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
      </div>
    </button>
  );
}

interface GuideContentProps {
  title: string;
  sections: {
    heading: string;
    content: string[];
  }[];
  tips?: string[];
  warnings?: string[];
}

export function GuideContent({ title, sections, tips, warnings }: GuideContentProps) {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-2xl font-bold text-foreground mb-6">{title}</h1>
      
      {warnings && warnings.length > 0 && (
        <div className="bg-status-warning/10 border border-status-warning/30 rounded-xl p-4 mb-6">
          <h3 className="text-status-warning font-semibold mb-2">⚠️ Safety Notes</h3>
          <ul className="space-y-1">
            {warnings.map((warning, i) => (
              <li key={i} className="text-sm text-muted-foreground">{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {sections.map((section, index) => (
        <div key={index} className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary/20 text-primary text-sm font-bold flex items-center justify-center">
              {index + 1}
            </span>
            {section.heading}
          </h2>
          <div className="pl-10 space-y-2">
            {section.content.map((item, i) => (
              <p key={i} className="text-muted-foreground">{item}</p>
            ))}
          </div>
        </div>
      ))}

      {tips && tips.length > 0 && (
        <div className="bg-status-info/10 border border-status-info/30 rounded-xl p-4">
          <h3 className="text-status-info font-semibold mb-2">💡 Pro Tips</h3>
          <ul className="space-y-1">
            {tips.map((tip, i) => (
              <li key={i} className="text-sm text-muted-foreground">• {tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
