import React from 'react';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SummaryCard {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  status: string;
}

interface ProjectSummaryCardsProps {
  isProvider: boolean;
  stats: {
    pendingRequests: number;
    activeProjects: number;
    completedProjects: number;
  };
  onFilterChange?: (status: string | null) => void;
  activeFilter?: string | null;
}

export function ProjectSummaryCards({ isProvider, stats, onFilterChange, activeFilter }: ProjectSummaryCardsProps) {
  const navigate = useNavigate();

  const cards: SummaryCard[] = [
    {
      label: isProvider ? 'Pending Requests' : 'Draft Projects',
      count: stats.pendingRequests,
      icon: <AlertCircle className="h-6 sm:h-8 w-6 sm:w-8 text-yellow-500" />,
      color: 'yellow',
      status: 'pending'
    },
    {
      label: 'Active Projects',
      count: stats.activeProjects,
      icon: <Clock className="h-6 sm:h-8 w-6 sm:w-8 text-blue-500" />,
      color: 'blue',
      status: 'active'
    },
    {
      label: 'Completed',
      count: stats.completedProjects,
      icon: <CheckCircle className="h-6 sm:h-8 w-6 sm:w-8 text-green-500" />,
      color: 'green',
      status: 'completed'
    }
  ];

  const handleCardClick = (status: string) => {
    if (onFilterChange) {
      onFilterChange(activeFilter === status ? null : status);
    } else {
      navigate('/projects', { state: { filter: status } });
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {cards.map((card) => (
        <button
          key={card.label}
          onClick={() => handleCardClick(card.status)}
          className={`
            bg-white rounded-lg shadow p-4 sm:p-6 transition-all
            hover:scale-[1.02] hover:shadow-md
            focus:outline-none focus:ring-2 focus:ring-${card.color}-500 focus:ring-offset-2
            ${activeFilter === card.status ? `ring-2 ring-${card.color}-500 ring-offset-2` : ''}
          `}
        >
          <div className="flex items-center">
            {card.icon}
            <div className="ml-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">{card.label}</h3>
              <p className="text-xl sm:text-2xl font-semibold text-gray-700">{card.count}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}