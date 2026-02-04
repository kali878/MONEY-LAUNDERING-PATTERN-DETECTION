import { useState } from 'react';
import { Filter } from 'lucide-react';

const PriorityFilter = ({ onFilterChange }) => {
  const [activeFilter, setActiveFilter] = useState('All');
  const filters = ['All', 'Critical', 'High', 'Medium'];

  const handleFilterClick = (filter) => {
    setActiveFilter(filter);
    // In a real application, this function would trigger a refetch of the data
    // with the selected filter as a query parameter.
  onFilterChange(filter);
  };

  return (
    <div className="w-full p-4 mb-6 bg-gray-900/60 backdrop-blur-md border border-cyan-500/20 rounded-lg flex items-center justify-between animate-fadeIn">
      <div className="flex items-center space-x-3">
        <Filter className="text-cyan-400" size={20} />
        <h3 className="text-lg font-semibold text-gray-200">Filter Alerts</h3>
      </div>
      <div className="flex items-center space-x-2 p-1 bg-gray-800/70 rounded-md">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => handleFilterClick(filter)}
            className={`
              px-4 py-2 text-sm font-medium rounded transition-all duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500
              ${
                activeFilter === filter
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-gray-300 hover:bg-gray-700/50'
              }
            `}
          >
            {filter}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PriorityFilter;
