import { component$, type Component } from '@builder.io/qwik';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  icon?: Component<any>;
  class?: string;
}

/**
 * Statistics card component for dashboard metrics
 */
/**
 * Get icon background color based on card title
 */
const getIconColorClass = (title: string): string => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('order')) {
    return 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-200/50';
  }
  if (lowerTitle.includes('revenue')) {
    return 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-200/50';
  }
  if (lowerTitle.includes('product')) {
    return 'bg-gradient-to-br from-violet-400 to-purple-600 text-white shadow-violet-200/50';
  }
  if (lowerTitle.includes('customer') || lowerTitle.includes('user')) {
    return 'bg-gradient-to-br from-blue-400 to-indigo-600 text-white shadow-blue-200/50';
  }
  // Default to blue gradient
  return 'bg-gradient-to-br from-blue-400 to-indigo-600 text-white shadow-blue-200/50';
};

export const StatCard = component$<StatCardProps>((props) => {
  const changeColor = props.change?.positive
    ? 'text-green-600'
    : 'text-red-600';

  return (
    <>
      {/* Component: StatCard */}
      <div
        class={`group relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 hover:shadow-xl hover:shadow-slate-300/50 dark:hover:shadow-slate-900/70 border border-slate-100/80 dark:border-slate-700/80 p-6 md:p-8 lg:p-10 transition-all duration-500 hover:-translate-y-1 ${props.class || ''}`}
      >
      <div class="flex items-start justify-between">
        <div class="flex-1 pr-6">
          <p class="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 md:mb-4 lg:mb-5 tracking-wide uppercase letter-spacing-wider">
            {props.title}
          </p>
          <p class="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent tracking-tight mb-3 md:mb-4 leading-none">{props.value}</p>
          {props.change && (
            <p class={`text-sm font-semibold flex items-center gap-1.5 mt-1 ${changeColor}`}>
              <span class="text-lg font-bold">{props.change.positive ? '↑' : '↓'}</span>
              <span>{Math.abs(props.change.value)}%</span>
              <span class="text-slate-400 dark:text-slate-500 font-normal">{props.change.label}</span>
            </p>
          )}
        </div>
        {props.icon && (
          <div class={`flex items-center justify-center h-12 w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 rounded-xl md:rounded-2xl ${getIconColorClass(props.title)} flex-shrink-0 shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
            {(() => {
              const IconComponent = props.icon!;
              return <IconComponent />;
            })()}
          </div>
        )}
      </div>
      {/* Elegant gradient overlay on hover */}
      <div class="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/5 group-hover:to-indigo-500/5 transition-all duration-500 pointer-events-none"></div>
    </div>
    </>
  );
});
