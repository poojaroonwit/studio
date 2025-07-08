import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import dynamic from 'next/dynamic';
import { X, ImageIcon, FileTextIcon, FileIcon } from 'lucide-react';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

const LABEL_OPTIONS = [
  { value: 'resume', label: 'Resume' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'other', label: 'Other' },
];

function getFileIcon(fileOrUrl: File | { fileName: string; label: string; url: string }) {
  const name = 'fileName' in fileOrUrl ? fileOrUrl.fileName : fileOrUrl.name;
  if (name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) return <ImageIcon className="w-6 h-6 text-blue-500" />;
  if (name.match(/\.pdf$/i)) return <FileTextIcon className="w-6 h-6 text-red-500" />;
  return <FileIcon className="w-6 h-6 text-gray-500" />;
}

export interface CandidateCommentsSectionProps {
  candidateId: string;
  comments: any[];
  isEditing: boolean;
  onCommentsChange: () => void;
}

const CandidateCommentsSection: React.FC<CandidateCommentsSectionProps> = ({ candidateId, comments: initialComments, isEditing, onCommentsChange }) => {
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [comments, setComments] = useState<any[]>(initialComments);
  const [saving, setSaving] = useState(false);
  const [editingSaving, setEditingSaving] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Drag-and-drop and file state
  const [files, setFiles] = useState<File[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  useEffect(() => {
    setLogsLoading(true);
    fetch(`/api/candidates/${candidateId}/logs`)
      .then(res => res.json())
      .then(data => setLogs(data.data || []))
      .finally(() => setLogsLoading(false));
  }, [candidateId]);

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
    setLabels(prev => [...prev, ...droppedFiles.map(() => 'other')]);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    setFiles(prev => [...prev, ...selectedFiles]);
    setLabels(prev => [...prev, ...selectedFiles.map(() => 'other')]);
    e.target.value = '';
  };
  const handleRemoveFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setLabels(prev => prev.filter((_, i) => i !== idx));
  };
  const handleLabelChange = (idx: number, value: string) => {
    setLabels(prev => prev.map((l, i) => (i === idx ? value : l)));
  };

  // Add comment with attachments
  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newComment.trim() && files.length === 0) return;
    setSaving(true);
    setError(null);
    const formData = new FormData();
    formData.append('content', newComment);
    files.forEach(file => formData.append('attachments', file));
    labels.forEach(label => formData.append('labels', label));
    try {
      const res = await fetch(`/api/candidates/${candidateId}/comments`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to add comment');
      onCommentsChange();
      setNewComment('');
      setFiles([]);
      setLabels([]);
    } catch (err: any) {
      setError('Failed to add comment');
    } finally {
      setSaving(false);
    }
  };

  const handleEditComment = async (id: string) => {
    setEditingSaving(id);
    setError(null);
    // Optimistically update comment
    const prevComments = [...comments];
    setComments(comments.map(c => c.id === id ? { ...c, content: editingContent } : c));
    setEditingId(null);
    setEditingContent('');
    try {
      const res = await fetch(`/api/candidates/${candidateId}/comments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingContent }),
      });
      if (!res.ok) throw new Error('Failed to update comment');
      onCommentsChange();
    } catch (err: any) {
      setComments(prevComments); // revert
      setError('Failed to update comment');
    } finally {
      setEditingSaving(null);
    }
  };

  const handleDeleteComment = async (id: string) => {
    setDeleteLoading(id);
    setError(null);
    // Optimistically remove comment
    const prevComments = [...comments];
    setComments(comments.filter(c => c.id !== id));
    try {
      const res = await fetch(`/api/candidates/${candidateId}/comments/${id}`, {
        method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete comment');
      onCommentsChange();
    } catch (err: any) {
      setComments(prevComments); // revert
      setError('Failed to delete comment');
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Candidate Logs Section */}
      <div>
        <div className="font-semibold mb-2">Candidate Activity Log</div>
        <div className="space-y-2">
          {logsLoading ? (
            <div className="text-muted-foreground text-sm">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-muted-foreground text-sm">No activity logs found.</div>
          ) : (
            (Array.isArray(logs) ? logs : []).map(log => (
              <div key={log.id} className="border rounded p-2 bg-muted/20 flex flex-col md:flex-row md:items-center md:justify-between text-xs md:text-sm">
                <div>
                  <span className="font-medium">{log.action}</span> by <span className="text-blue-700">{log.user}</span>
                  {log.note && <span className="ml-2 text-muted-foreground">Note: {log.note}</span>}
                </div>
                <div className="text-muted-foreground mt-1 md:mt-0">{new Date(log.time).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </div>
      {/* Add Comment Section */}
      <form onSubmit={handleAddComment} className="space-y-3">
        <ReactQuill
          value={newComment}
          onChange={setNewComment}
          placeholder="Add a comment..."
          theme="snow"
          className="bg-white"
        />
        {/* Drag-and-drop area */}
        <div
          className={`border-2 border-dashed rounded p-4 text-center cursor-pointer transition-colors ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            multiple
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
          <div>
            <span className="font-medium">Drag and drop files here</span> or <span className="underline text-blue-600">browse</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Supported: images, PDF, DOC, etc.</div>
        </div>
        {/* File previews */}
        {(Array.isArray(files) ? files : []).length > 0 && (
          <div className="space-y-2">
            {(Array.isArray(files) ? files : []).map((file, idx) => (
              <div key={idx} className="flex items-center gap-3 border rounded p-2 bg-muted/30">
                {/* Preview */}
                {file.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-10 h-10 object-cover rounded"
                    onLoad={e => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                  />
                ) : (
                  getFileIcon(file)
                )}
                <div className="flex-1">
                  <div className="font-medium">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
                {/* Label select */}
                <select
                  className="border rounded px-2 py-1 text-xs"
                  value={labels[idx]}
                  onChange={e => handleLabelChange(idx, e.target.value)}
                >
                  {(Array.isArray(LABEL_OPTIONS) ? LABEL_OPTIONS : []).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {/* Remove */}
                <button
                  type="button"
                  className="ml-2 text-destructive"
                  onClick={() => handleRemoveFile(idx)}
                  aria-label="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <Button type="submit" disabled={saving || (!newComment.trim() && files.length === 0)}>
          {saving ? 'Saving...' : 'Add Comment'}
        </Button>
        {error && <span className="text-destructive text-xs mt-1">{error}</span>}
      </form>
      {/* Comments List */}
      <div className="space-y-3">
        {(Array.isArray(comments) ? comments : []).length === 0 && <div className="text-muted-foreground text-sm">No comments yet.</div>}
        {(Array.isArray(comments) ? comments : []).map(comment => (
          <div key={comment.id} className="border rounded p-3 bg-muted/30">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-sm">{comment.author?.name || comment.author || 'Unknown'}</span>
              <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            <div className="text-sm mb-2 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: comment.content }} />
            {/* Attachments under comment */}
            {(Array.isArray(comment.attachments) ? comment.attachments : []).length > 0 && (
              <div className="flex flex-wrap gap-3 mt-2">
                {(Array.isArray(comment.attachments) ? comment.attachments : []).map((att: any, idx: number) => (
                  <div key={att.id || idx} className="flex items-center gap-2 border rounded px-2 py-1 bg-white">
                    {att.fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                      <img src={att.url} alt={att.fileName} className="w-8 h-8 object-cover rounded" />
                    ) : (
                      getFileIcon(att)
                    )}
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="font-medium text-xs hover:underline">{att.fileName}</a>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 border ml-1">{att.label}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Edit/Delete buttons (if needed) ... */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CandidateCommentsSection; 