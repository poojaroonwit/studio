import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

interface CandidateCommentsSectionProps {
  candidateId: string;
  comments: Comment[];
  isEditing: boolean;
  onCommentsChange: () => void;
}

const CandidateCommentsSection: React.FC<CandidateCommentsSectionProps> = ({ candidateId, comments, isEditing, onCommentsChange }) => {
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await fetch(`/api/candidates/${candidateId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newComment }),
    });
    setNewComment('');
    onCommentsChange();
  };

  const handleEditComment = async (id: string) => {
    await fetch(`/api/candidates/${candidateId}/comments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editingContent }),
    });
    setEditingId(null);
    setEditingContent('');
    onCommentsChange();
  };

  const handleDeleteComment = async (id: string) => {
    await fetch(`/api/candidates/${candidateId}/comments/${id}`, {
      method: 'DELETE' });
    onCommentsChange();
  };

  return (
    <div className="space-y-4">
      {isEditing && (
        <div className="flex flex-col gap-2 mb-4">
          <Textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
          />
          <Button onClick={handleAddComment} disabled={!newComment.trim()}>Add Comment</Button>
        </div>
      )}
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
                <Textarea
                  value={editingContent}
                  onChange={e => setEditingContent(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleEditComment(comment.id)} disabled={!editingContent.trim()}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="text-sm mb-2 whitespace-pre-wrap">{comment.content}</div>
            )}
            {isEditing && editingId !== comment.id && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditingId(comment.id); setEditingContent(comment.content); }}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDeleteComment(comment.id)}>Delete</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CandidateCommentsSection; 