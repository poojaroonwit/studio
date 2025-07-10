import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { X, ImageIcon, FileTextIcon, FileIcon, Send, Paperclip, Activity, MessageSquare } from 'lucide-react';

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

interface CombinedActivityItem {
  id: string;
  type: 'comment' | 'activity';
  content?: string;
  action?: string;
  user?: string;
  note?: string;
  author?: { name: string } | string;
  createdAt?: string;
  time?: string;
  attachments?: any[];
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
  
  // Debug logging
  console.log('CandidateCommentsSection props:', { candidateId, initialComments, isEditing });
  console.log('Current comments state:', comments);
  // Drag-and-drop and file state
  const [files, setFiles] = useState<File[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newComment]);

  // Combine and sort activities by date
  const combinedActivities: CombinedActivityItem[] = [
    // Add comments
    ...(Array.isArray(comments) ? comments : []).map(comment => ({
      id: comment.id,
      type: 'comment' as const,
      content: comment.content,
      author: comment.author,
      createdAt: comment.createdAt,
      attachments: comment.attachments
    })),
    // Add activity logs
    ...(Array.isArray(logs) ? logs : []).map(log => ({
      id: log.id,
      type: 'activity' as const,
      action: log.action,
      user: log.user,
      note: log.note,
      time: log.time
    }))
  ].sort((a, b) => {
    const dateA = (a as any).createdAt || (a as any).time;
    const dateB = (b as any).createdAt || (b as any).time;
    if (!dateA || !dateB) return 0;
    return new Date(dateB).getTime() - new Date(dateA).getTime(); // Sort newest first
  });

  // Pagination state
  const ITEMS_PER_PAGE = 5;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(combinedActivities.length / ITEMS_PER_PAGE) || 1;
  useEffect(() => {
    // Reset to first page if activities change
    setPage(1);
  }, [candidateId, initialComments, logs]);
  const paginatedActivities = combinedActivities.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

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
    
    console.log('Submitting comment:', { newComment, files: files.length });
    
    setSaving(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('content', newComment);
    files.forEach(file => formData.append('attachments', file));
    labels.forEach(label => formData.append('labels', label));
    
    // Create optimistic comment
    const optimisticComment = {
      id: `temp-${Date.now()}`,
      content: newComment,
      author: { name: 'You' }, // This will be replaced with actual user data
      createdAt: new Date().toISOString(),
      attachments: files.map((file, idx) => ({
        id: `temp-attachment-${Date.now()}-${idx}`,
        fileName: file.name,
        label: labels[idx],
        url: URL.createObjectURL(file)
      }))
    };
    
    // Add optimistic comment to the top
    setComments(prev => [optimisticComment, ...prev]);
    
    // Clear form immediately
    setNewComment('');
    setFiles([]);
    setLabels([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    try {
      console.log('Sending request to:', `/api/candidates/${candidateId}/comments`);
      
      const res = await fetch(`/api/candidates/${candidateId}/comments`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', errorText);
        
        // Try to parse as JSON for better error messages
        let errorMessage = `Failed to add comment: ${res.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await res.json();
      console.log('API Response:', result);
      
      // Refresh comments to get the real data
      onCommentsChange();
      
      console.log('Comment added successfully');
      
    } catch (err: any) {
      console.error('Error adding comment:', err);
      
      // Provide more specific error messages
      let errorMessage = err.message || 'Failed to add comment';
      
      if (errorMessage.includes('MinIO') || errorMessage.includes('bucket') || errorMessage.includes('storage')) {
        errorMessage = 'File storage service is not available. Please try again later or contact support.';
      } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
        errorMessage = 'Your session has expired. Please refresh the page and try again.';
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal server error')) {
        errorMessage = 'Server error occurred. Please try again later.';
      }
      
      setError(errorMessage);
      
      // Remove optimistic comment on error
      setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  return (
    <div className="space-y-6">
      {/* Combined Activity and Comments List */}
      <div className="space-y-0">
        {logsLoading ? (
          <div className="text-muted-foreground text-sm py-4 text-center">Loading activities...</div>
        ) : combinedActivities.length === 0 ? (
          <div className="text-muted-foreground text-sm py-4 text-center">No activities or comments yet.</div>
        ) : (
          paginatedActivities.map((item, index) => (
            <div key={item.id} className={`py-4 ${index !== paginatedActivities.length - 1 ? 'border-b border-border' : ''}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  {/* Icon based on type */}
                  {item.type === 'comment' ? (
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                  ) : (
                    <Activity className="w-4 h-4 text-green-500" />
                  )}
                  <span className="font-semibold text-sm">
                    {item.type === 'comment'
                      ? (typeof item.author === 'object' && item.author !== null && 'name' in item.author
                          ? item.author.name
                          : item.author || 'Unknown')
                      : item.user || 'System'
                    }
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                                     <span className="text-xs text-muted-foreground">
                     {new Date((item as any).createdAt || (item as any).time || '').toLocaleString()}
                   </span>
                </div>
                {isEditing && item.type === 'comment' && (
                  <div className="flex items-center gap-1">
                    {editingId === item.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditComment(item.id)}
                          disabled={editingSaving === item.id}
                        >
                          {editingSaving === item.id ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(null);
                            setEditingContent('');
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditingContent(item.content || '');
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteComment(item.id)}
                          disabled={deleteLoading === item.id}
                          className="text-destructive hover:text-destructive"
                        >
                          {deleteLoading === item.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {item.type === 'comment' ? (
                <>
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>
                  ) : (
                    <div className="text-sm mb-3 whitespace-pre-wrap">{item.content}</div>
                  )}
                  {/* Attachments under comment */}
                  {(Array.isArray(item.attachments) ? item.attachments : []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {(Array.isArray(item.attachments) ? item.attachments : []).map((att: any, idx: number) => (
                        <div key={att.id || idx} className="flex items-center gap-2 border rounded px-3 py-2 bg-muted/50 hover:bg-muted/70 transition-colors">
                          {att.fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                            <img src={att.url} alt={att.fileName} className="w-6 h-6 object-cover rounded" />
                          ) : (
                            getFileIcon(att)
                          )}
                          <a href={att.url} target="_blank" rel="noopener noreferrer" className="font-medium text-xs hover:underline">{att.fileName}</a>
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border ml-1">{att.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm">
                  <span className="font-medium">{item.action}</span>
                  {item.note && <span className="ml-2 text-muted-foreground whitespace-pre-line">{item.note}</span>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {/* Pagination Controls */}
      {combinedActivities.length > ITEMS_PER_PAGE && (
        <div className="flex justify-center items-center gap-2 mt-2">
          <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
        </div>
      )}
      
      {/* Chat-like Comment Input */}
      <div className="border rounded-lg bg-background">
        {/* File previews */}
        {(Array.isArray(files) ? files : []).length > 0 && (
          <div className="p-3 border-b border-border bg-muted/30">
            <div className="text-sm font-medium mb-2">Attachments:</div>
            <div className="space-y-2">
              {(Array.isArray(files) ? files : []).map((file, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  {/* Preview */}
                  {file.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-8 h-8 object-cover rounded"
                      onLoad={e => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                    />
                  ) : (
                    getFileIcon(file)
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{file.name}</div>
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
                    className="text-destructive hover:text-destructive/80"
                    onClick={() => handleRemoveFile(idx)}
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Input area */}
        <div className="p-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your comment here... (Press Enter to send, Shift+Enter for new line)"
                className="min-h-[60px] max-h-[120px] resize-none border-0 focus:ring-0 focus:outline-none p-0"
                rows={1}
              />
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="p-2"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                onClick={handleAddComment}
                disabled={saving || (!newComment.trim() && files.length === 0)}
                size="sm"
                className="p-2"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Hidden file input */}
          <input
            type="file"
            multiple
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
          
          {error && <div className="text-destructive text-xs mt-2">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default CandidateCommentsSection; 