import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📭',
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <span className="text-4xl mb-4">{icon}</span>
      <h3 className="text-text-primary text-lg font-medium mb-2">{title}</h3>
      {description && (
        <p className="text-text-secondary text-sm text-center mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
