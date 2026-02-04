import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'Nothing here yet', subtitle = 'Try adjusting filters or running analysis.', icon: Icon = Inbox, className = '' }) {
  return (
    <div className={`bg-gray-800/50 text-gray-400 p-6 rounded-lg text-center ${className}`}>
      <div className="flex justify-center mb-2"><Icon className="h-6 w-6 text-gray-500"/></div>
      <p className="font-semibold text-gray-300">{title}</p>
      {subtitle && <p className="text-sm mt-1">{subtitle}</p>}
    </div>
  );
}
