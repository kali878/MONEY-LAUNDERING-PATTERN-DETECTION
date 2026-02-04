const SkeletonLoader = ({ 
  type = 'default', 
  count = 1, 
  className = '',
  animated = true 
}) => {
  const baseClasses = `
    ${animated ? 'animate-shimmer shimmer' : 'skeleton-dark'}
    rounded-lg bg-gray-700/50
  `;

  const skeletonTypes = {
    default: 'h-4 w-full',
    card: 'h-48 w-full',
    avatar: 'h-12 w-12 rounded-full',
    button: 'h-10 w-24',
    title: 'h-6 w-3/4',
    subtitle: 'h-4 w-1/2',
    paragraph: 'h-4 w-full',
    image: 'h-32 w-full',
    circle: 'h-16 w-16 rounded-full',
    alert: 'h-64 w-full',
    graph: 'h-80 w-full',
  };

  const SkeletonItem = ({ index }) => (
    <div
      key={index}
      className={`${baseClasses} ${skeletonTypes[type]} ${className}`}
      style={{ animationDelay: `${index * 0.1}s` }}
    />
  );

  if (count === 1) {
    return <SkeletonItem index={0} />;
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonItem key={index} index={index} />
      ))}
    </div>
  );
};

// Specific skeleton components for different use cases
export const AlertCardSkeleton = ({ count = 3 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="p-6 glass-dark rounded-xl border border-gray-700/50 animate-fadeInUp"
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <SkeletonLoader type="avatar" className="w-6 h-6 rounded-lg" />
            <SkeletonLoader type="title" className="w-32" />
          </div>
          <SkeletonLoader type="circle" className="w-16 h-16" />
        </div>
        <div className="space-y-2 mb-6">
          <SkeletonLoader type="paragraph" />
          <SkeletonLoader type="paragraph" className="w-4/5" />
          <SkeletonLoader type="paragraph" className="w-3/5" />
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-gray-700/50">
          <SkeletonLoader type="subtitle" />
          <SkeletonLoader type="button" />
        </div>
      </div>
    ))}
  </div>
);

export const GraphSkeleton = () => (
  <div className="glass-dark rounded-xl border border-gray-700/50 p-6 animate-fadeIn">
    <div className="flex justify-between items-center mb-6">
      <SkeletonLoader type="title" />
      <div className="flex space-x-2">
        <SkeletonLoader type="button" className="w-16" />
        <SkeletonLoader type="button" className="w-16" />
      </div>
    </div>
    <SkeletonLoader type="graph" />
    <div className="flex justify-center mt-4 space-x-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <SkeletonLoader key={index} type="subtitle" className="w-20" />
      ))}
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="glass-dark rounded-xl border border-gray-700/50 overflow-hidden animate-fadeIn">
    {/* Header */}
    <div className="p-4 border-b border-gray-700/50 bg-gray-800/30">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <SkeletonLoader key={index} type="subtitle" />
        ))}
      </div>
    </div>
    
    {/* Rows */}
    <div className="divide-y divide-gray-700/50">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <SkeletonLoader
                key={colIndex}
                type="default"
                className={colIndex === 0 ? 'w-3/4' : 'w-full'}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-8 animate-fadeIn">
    {/* Header section */}
    <div className="space-y-4">
      <SkeletonLoader type="title" className="w-64 h-8" />
      <SkeletonLoader type="paragraph" className="w-96" />
    </div>
    
    {/* Stats cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="p-6 glass-dark rounded-xl border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <SkeletonLoader type="circle" className="w-12 h-12" />
            <SkeletonLoader type="subtitle" className="w-16" />
          </div>
          <SkeletonLoader type="title" className="w-20 h-8" />
          <SkeletonLoader type="default" className="w-24 h-3 mt-2" />
        </div>
      ))}
    </div>
    
    {/* Main content area */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <AlertCardSkeleton />
      </div>
      <div>
        <GraphSkeleton />
      </div>
    </div>
  </div>
);

export default SkeletonLoader;
