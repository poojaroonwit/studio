interface ApiDocsSidebarProps {
  selectedTag: string;
  tags: string[];
  onSelectTag: (tag: string) => void;
}

export function ApiDocsSidebar({ onSelectTag, selectedTag, tags }: ApiDocsSidebarProps) {
  return (
    <div className="lg:w-64 flex-shrink-0">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">API Categories</h3>
        <div className="space-y-2">
          <ApiDocsSidebarButton
            active={selectedTag === 'all'}
            label="All Endpoints"
            onClick={() => onSelectTag('all')}
          />
          {tags.map((tag) => (
            <ApiDocsSidebarButton
              key={tag}
              active={selectedTag === tag}
              label={tag}
              onClick={() => onSelectTag(tag)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ApiDocsSidebarButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-100 text-blue-800'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );
}
