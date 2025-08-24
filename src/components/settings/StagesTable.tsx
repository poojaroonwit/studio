import React from 'react';

interface StagesTableProps {
  stages: any[];
  isLoading: boolean;
  onEdit: (stage: any) => void;
  onColorChange: (stage: any, colorType: string, newColor: string) => void;
}

const StagesTable: React.FC<StagesTableProps> = ({ stages, isLoading, onEdit, onColorChange }) => {
  return (
    <div>
      <h2>Stages Table</h2>
      <table className="min-w-full border text-sm mt-4">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Description</th>
            <th className="px-4 py-2 text-left">Sort Order</th>
            <th className="px-4 py-2 text-left">Complete Color</th>
            <th className="px-4 py-2 text-left">Badge Color</th>
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
                <input
                  type="color"
                  value={stage.color_complete || "#ffffff"}
                  onChange={e => onColorChange(stage, "color_complete", e.target.value)}
                  title={stage.color_complete}
                  className="w-8 h-8 p-0 border rounded"
                  style={{ background: stage.color_complete || "#fff" }}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="color"
                  value={stage.color_badge || "#ffffff"}
                  onChange={e => onColorChange(stage, "color_badge", e.target.value)}
                  title={stage.color_badge}
                  className="w-8 h-8 p-0 border rounded"
                  style={{ background: stage.color_badge || "#fff" }}
                />
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