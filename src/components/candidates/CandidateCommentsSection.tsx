import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

interface Comment {
  id: string;
  author: string;
  content: string; // HTML string
  createdAt: string;
}

interface CandidateLog {
  id: string;
  action: string;
  user: string;
  time: string;
  note?: string;
}

interface CandidateCommentsSectionProps {
  candidateId: string;
  comments: Comment[];
  isEditing: boolean;
  onCommentsChange: () => void;
}

const CandidateCommentsSection: React.FC<CandidateCommentsSectionProps> = ({ candidateId, comments: initialComments, isEditing, onCommentsChange }) => {
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [logs, setLogs] = useState<CandidateLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [saving, setSaving] = useState(false);
  const [editingSaving, setEditingSaving] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleAddComment = async () => {
    if (!newComment || newComment === '<p><br></p>') return;
    setSaving(true);
    setError(null);
    // Optimistically add comment
    const tempId = 'temp-' + Date.now();
    const tempComment: Comment = {
      id: tempId,
      author: 'You',
      content: newComment,
      createdAt: new Date().toISOString(),
    };
    setComments([tempComment, ...comments]);
    setNewComment('');
    try {
      const res = await fetch(`/api/candidates/${candidateId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: tempComment.content }),
      });
      if (!res.ok) throw new Error('Failed to add comment');
      onCommentsChange(); // will update comments from parent
    } catch (err: any) {
      setComments(comments); // revert
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
            logs.map(log => (
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
      <div className="flex flex-col gap-2 mb-4">
        <ReactQuill
          value={newComment}
          onChange={setNewComment}
          placeholder="Add a comment..."
          theme="snow"
          className="bg-white"
        />
        <Button onClick={handleAddComment} disabled={saving || !newComment || newComment === '<p><br></p>'}>
          {saving ? 'Saving...' : 'Add Comment'}
        </Button>
        {error && <span className="text-destructive text-xs mt-1">{error}</span>}
      </div>
      {/* Comments List */}
      <div className="space-y-3">
        {comments.length === 0 && <div className="text-muted-foreground text-sm">No comments yet.</div>}
        {comments.map(comment => (
          <div key={comment.id} className="border rounded p-3 bg-muted/30">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-sm">{comment.author}</span>
              <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            {editingId === comment.id ? (
              <div className="flex flex-col gap-2">
                <ReactQuill
                  value={editingContent}
                  onChange={setEditingContent}
                  theme="snow"
                  className="bg-white"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleEditComment(comment.id)} disabled={editingSaving === comment.id || !editingContent || editingContent === '<p><br></p>'}>
                    {editingSaving === comment.id ? 'Updating...' : 'Save'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={editingSaving === comment.id}>Cancel</Button>
                </div>
                {error && <span className="text-destructive text-xs mt-1">{error}</span>}
              </div>
            ) : (
              <div className="text-sm mb-2 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: comment.content }} />
            )}
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => { setEditingId(comment.id); setEditingContent(comment.content); }} disabled={editingSaving === comment.id || deleteLoading === comment.id}>Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => handleDeleteComment(comment.id)} disabled={deleteLoading === comment.id}>
                {deleteLoading === comment.id ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CandidateCommentsSection; 