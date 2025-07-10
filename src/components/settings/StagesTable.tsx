import React from 'react';

interface StagesTableProps {
  stages: any[];
  isLoading: boolean;
  onEdit: (stage: any) => void;
}

const StagesTable: React.FC<StagesTableProps> = ({ stages, isLoading, onEdit }) => {
  return (
    <div>
      <h2>Stages Table</h2>
      <table className="min-w-full border text-sm mt-4">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Description</th>
            <th className="px-4 py-2 text-left">Sort Order</th>
            <th className="px-4 py-2 text-left">Color</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((stage) => (
            <tr key={stage.id}>
              <td className="px-4 py-2">{stage.name}</td>
              <td className="px-4 py-2">{stage.description}</td>
              <td className="px-4 py-2">{stage.sort_order}</td>
              <td className="px-4 py-2">
                {stage.color && (
                  <span className="inline-block w-6 h-6 rounded border" style={{ backgroundColor: stage.color }} title={stage.color}></span>
                )}
              </td>
              <td className="px-4 py-2">
                <button className="text-blue-600 hover:underline" onClick={() => onEdit(stage)}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StagesTable; 