const ResponsiveGrid = ({ 
  children, 
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 6,
  className = '',
  animate = true 
}) => {
  const getGridClasses = () => {
    const { xs, sm, md, lg, xl } = columns;
    
    let classes = `grid gap-${gap}`;
    
    if (xs) classes += ` grid-cols-${xs}`;
    if (sm) classes += ` sm:grid-cols-${sm}`;
    if (md) classes += ` md:grid-cols-${md}`;
    if (lg) classes += ` lg:grid-cols-${lg}`;
    if (xl) classes += ` xl:grid-cols-${xl}`;
    
    return classes;
  };

  return (
    <div className={`${getGridClasses()} ${className}`}>
      {Array.isArray(children) 
        ? children.map((child, index) => (
            <div
              key={index}
              className={animate ? 'animate-fadeInUp' : ''}
              style={animate ? { animationDelay: `${index * 0.1}s` } : {}}
            >
              {child}
            </div>
          ))
        : children
      }
    </div>
  );
};

const MasonryGrid = ({ children, columns = { xs: 1, sm: 2, md: 3 }, gap = 6 }) => {
  const getColumnClasses = () => {
    const { xs, sm, md, lg, xl } = columns;
    
    let classes = `columns-${xs}`;
    if (sm) classes += ` sm:columns-${sm}`;
    if (md) classes += ` md:columns-${md}`;
    if (lg) classes += ` lg:columns-${lg}`;
    if (xl) classes += ` xl:columns-${xl}`;
    
    return classes;
  };

  return (
    <div className={`${getColumnClasses()} gap-${gap} space-y-${gap}`}>
      {Array.isArray(children) 
        ? children.map((child, index) => (
            <div
              key={index}
              className="break-inside-avoid animate-fadeInUp"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {child}
            </div>
          ))
        : children
      }
    </div>
  );
};

const FlexGrid = ({ 
  children, 
  minItemWidth = '300px',
  gap = 6,
  justify = 'start',
  align = 'stretch',
  className = '',
  wrap = true 
}) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline'
  };

  return (
    <div 
      className={`flex ${wrap ? 'flex-wrap' : ''} gap-${gap} 
                  ${justifyClasses[justify]} ${alignClasses[align]} ${className}`}
      style={{
        '--min-item-width': minItemWidth
      }}
    >
      {Array.isArray(children) 
        ? children.map((child, index) => (
            <div
              key={index}
              className="flex-1 animate-fadeInUp"
              style={{ 
                minWidth: `min(100%, var(--min-item-width))`,
                animationDelay: `${index * 0.1}s` 
              }}
            >
              {child}
            </div>
          ))
        : children
      }
    </div>
  );
};

const AutoGrid = ({ 
  children, 
  minItemWidth = '250px',
  maxItemWidth = '1fr',
  gap = 6,
  className = '' 
}) => {
  return (
    <div 
      className={`grid gap-${gap} ${className}`}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, ${maxItemWidth}))`
      }}
    >
      {Array.isArray(children) 
        ? children.map((child, index) => (
            <div
              key={index}
              className="animate-fadeInUp"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {child}
            </div>
          ))
        : children
      }
    </div>
  );
};

// Responsive container with max-width breakpoints
const Container = ({ 
  children, 
  size = 'default', // 'sm', 'md', 'lg', 'xl', '2xl', 'full', 'default'
  className = '',
  centered = true,
  padding = true 
}) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
    default: 'max-w-7xl'
  };

  return (
    <div className={`
      ${sizeClasses[size]} 
      ${centered ? 'mx-auto' : ''} 
      ${padding ? 'px-4 sm:px-6 lg:px-8' : ''} 
      ${className}
    `}>
      {children}
    </div>
  );
};

// Responsive stack component
const Stack = ({ 
  children, 
  direction = 'vertical', // 'vertical', 'horizontal'
  spacing = 4,
  align = 'stretch',
  justify = 'start',
  wrap = false,
  responsive = null, // { md: 'horizontal', lg: 'vertical' }
  className = '' 
}) => {
  const isVertical = direction === 'vertical';
  const baseClasses = isVertical ? 'flex flex-col' : 'flex flex-row';
  
  const spacingClasses = isVertical ? `space-y-${spacing}` : `space-x-${spacing}`;
  
  const alignClasses = {
    start: isVertical ? 'items-start' : 'justify-start',
    center: isVertical ? 'items-center' : 'justify-center', 
    end: isVertical ? 'items-end' : 'justify-end',
    stretch: isVertical ? 'items-stretch' : 'justify-stretch'
  };

  const justifyClasses = {
    start: isVertical ? 'justify-start' : 'items-start',
    center: isVertical ? 'justify-center' : 'items-center',
    end: isVertical ? 'justify-end' : 'items-end',
    between: isVertical ? 'justify-between' : 'items-between',
    around: isVertical ? 'justify-around' : 'items-around'
  };

  let responsiveClasses = '';
  if (responsive) {
    Object.entries(responsive).forEach(([breakpoint, dir]) => {
      const isRespVertical = dir === 'vertical';
      responsiveClasses += ` ${breakpoint}:${isRespVertical ? 'flex-col' : 'flex-row'}`;
      responsiveClasses += ` ${breakpoint}:${isRespVertical ? `space-y-${spacing}` : `space-x-${spacing}`}`;
    });
  }

  return (
    <div className={`
      ${baseClasses}
      ${spacingClasses}
      ${alignClasses[align] || ''}
      ${justifyClasses[justify] || ''}
      ${wrap ? 'flex-wrap' : ''}
      ${responsiveClasses}
      ${className}
    `}>
      {children}
    </div>
  );
};

export { ResponsiveGrid, MasonryGrid, FlexGrid, AutoGrid, Container, Stack };
export default ResponsiveGrid;
