import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { X, ImageIcon, FileTextIcon, FileIcon, Send, Paperclip, Activity, MessageSquare, ChevronDown } from 'lucide-react';
import { FileViewerModal } from '../ui/file-viewer-modal';

const LABEL_OPTIONS = [
  { value: 'resume', label: 'Resume' },
  { value: 'cover-letter', label: 'Cover Letter' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'reference-letter', label: 'Reference Letter' },
  { value: 'transcript', label: 'Transcript' },
  { value: 'other', label: 'Other' }
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
  console.log('[CandidateCommentsSection] Rendering with candidateId:', candidateId, 'initialComments:', initialComments?.length, 'isEditing:', isEditing);
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
  
  // Load more state
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [commentsOffset, setCommentsOffset] = useState(0);
  const COMMENTS_PER_LOAD = 5;
  
  // Drag-and-drop and file state
  const [files, setFiles] = useState<File[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // File viewer modal state
  const [selectedFile, setSelectedFile] = useState<{
    fileName: string;
    url: string;
    label?: string;
    updatedAt?: string;
    fileSize?: number;
  } | null>(null);
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);

  // Load initial comments from API
  useEffect(() => {
    const loadInitialComments = async () => {
      try {
        const response = await fetch(`/api/candidates/${candidateId}/comments?limit=${COMMENTS_PER_LOAD}&offset=0`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          const initialCommentsData = Array.isArray(data.data) ? data.data : [];
          setComments(initialCommentsData);
          setCommentsOffset(initialCommentsData.length);
          setHasMoreComments(data.pagination?.hasMore || false);
        } else {
          // Fallback to parent-provided comments if API fails
          setComments(Array.isArray(initialComments) ? initialComments : []);
          setCommentsOffset(0);
          setHasMoreComments(true);
        }
      } catch (error) {
        console.error('Error loading initial comments:', error);
        // Fallback to parent-provided comments if API fails
        setComments(Array.isArray(initialComments) ? initialComments : []);
        setCommentsOffset(0);
        setHasMoreComments(true);
      }
    };

    loadInitialComments();
  }, [candidateId, initialComments]);

  // Fetch activity logs once on candidateId change (no real-time polling)
  useEffect(() => {
    setLogsLoading(true);
    fetch(`/api/candidates/${candidateId}/logs`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => setLogs(Array.isArray(data.data) ? data.data : []))
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false));
  }, [candidateId]);

  // Load more comments function
  const loadMoreComments = useCallback(async () => {
    if (loadingMore || !hasMoreComments) return;
    
    setLoadingMore(true);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/comments?limit=${COMMENTS_PER_LOAD}&offset=${commentsOffset}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        const newComments = Array.isArray(data.data) ? data.data : [];
        
        if (newComments.length > 0) {
          setComments(prev => [...prev, ...newComments]);
          setCommentsOffset(prev => prev + newComments.length);
          setHasMoreComments(data.pagination?.hasMore || false);
        } else {
          setHasMoreComments(false);
        }
      }
    } catch (error) {
      console.error('Error loading more comments:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [candidateId, commentsOffset, loadingMore, hasMoreComments]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newComment]);

  const handleFileClick = (attachment: any) => {
    setSelectedFile({
      fileName: attachment.fileName,
      url: attachment.url,
      label: attachment.label,
      updatedAt: attachment.updatedAt,
      fileSize: undefined // Could be added if available
    });
    setIsFileViewerOpen(true);
  };



  // Show all activities (no pagination, use load more for comments)
  const combinedActivities: CombinedActivityItem[] = [
    // Add comments
    ...(Array.isArray(comments) ? comments : []).map(comment => ({
      id: `comment-${comment.id || 'unknown'}`,
      type: 'comment' as const,
      content: comment.content || '',
      author: comment.author || 'Unknown',
      createdAt: comment.createdAt || '',
      attachments: Array.isArray(comment.attachments) ? comment.attachments : []
    })),
    // Add activity logs
    ...(Array.isArray(logs) ? logs : []).map(log => ({
      id: `activity-${log.id || 'unknown'}`,
      type: 'activity' as const,
      action: log.action || '',
      user: log.user || 'System',
      note: log.note || '',
      time: log.time || ''
    }))
  ].sort((a, b) => {
    const dateA = (a as any).createdAt || (a as any).time;
    const dateB = (b as any).createdAt || (b as any).time;
    if (!dateA || !dateB) return 0;
    return new Date(dateB).getTime() - new Date(dateA).getTime(); // Sort newest first
  });

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => {
      const currentFiles = Array.isArray(prev) ? prev : [];
      return [...currentFiles, ...droppedFiles];
    });
    setLabels(prev => {
      const currentLabels = Array.isArray(prev) ? prev : [];
      return [...currentLabels, ...droppedFiles.map(() => 'other')];
    });
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault(); // Prevent any default behavior
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    
    // Preserve existing files and add new ones
    setFiles(prev => {
      const currentFiles = Array.isArray(prev) ? prev : [];
      return [...currentFiles, ...selectedFiles];
    });
    
    setLabels(prev => {
      const currentLabels = Array.isArray(prev) ? prev : [];
      return [...currentLabels, ...selectedFiles.map(() => 'other')];
    });
    
    // Don't clear the input value immediately to prevent issues
    // The value will be cleared after successful upload
  }, []);

  const handleRemoveFile = useCallback((idx: number) => {
    setFiles(prev => Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : []);
    setLabels(prev => Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : []);
  }, []);

  const handleLabelChange = useCallback((idx: number, value: string) => {
    setLabels(prev => Array.isArray(prev) ? prev.map((l, i) => (i === idx ? value : l)) : []);
  }, []);

  // Add comment with attachments
  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newComment.trim() && (!Array.isArray(files) || files.length === 0)) return;
    
    setSaving(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('content', newComment);
    
    // Ensure files and labels are arrays before using forEach
    const safeFiles = Array.isArray(files) ? files : [];
    const safeLabels = Array.isArray(labels) ? labels : [];
    
    safeFiles.forEach(file => formData.append('attachments', file));
    safeLabels.forEach(label => formData.append('labels', label));
    
    // Create optimistic comment
    const optimisticComment = {
      id: `temp-${Date.now()}`,
      content: newComment,
      author: { name: 'You' }, // This will be replaced with actual user data
      createdAt: new Date().toISOString(),
      attachments: safeFiles.map((file, idx) => ({
        id: `temp-attachment-${Date.now()}-${idx}`,
        fileName: file.name,
        label: safeLabels[idx],
        url: URL.createObjectURL(file)
      }))
    };
    
    // Add optimistic comment to the top for immediate UI feedback
    setComments(prev => [optimisticComment, ...(Array.isArray(prev) ? prev : [])]);
    
    try {
      const res = await fetch(`/api/candidates/${candidateId}/comments`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
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
      
      // Clear form only after successful upload
      setNewComment('');
      setFiles([]);
      setLabels([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh comments list to get the latest data from server
      const refreshResponse = await fetch(`/api/candidates/${candidateId}/comments?limit=${COMMENTS_PER_LOAD}&offset=0`, {
        credentials: 'include'
      });
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const refreshedComments = Array.isArray(refreshData.data) ? refreshData.data : [];
        setComments(refreshedComments);
        setCommentsOffset(refreshedComments.length);
        setHasMoreComments(refreshData.pagination?.hasMore || false);
      }
      
      // Also trigger parent refresh
      onCommentsChange();
      
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
      setComments(prev => Array.isArray(prev) ? prev.filter(c => c.id !== optimisticComment.id) : []);
      
    } finally {
      setSaving(false);
    }
  };

  const handleEditComment = async (id: string) => {
    // Extract the original comment ID by removing the 'comment-' prefix
    const originalId = id.replace('comment-', '');
    
    setEditingSaving(id);
    setError(null);
    // Optimistically update comment
    const prevComments = Array.isArray(comments) ? [...comments] : [];
    setComments(Array.isArray(comments) ? comments.map(c => c.id === originalId ? { ...c, content: editingContent } : c) : []);
    setEditingId(null);
    setEditingContent('');
    try {
      const res = await fetch(`/api/candidates/${candidateId}/comments/${originalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: editingContent }),
      });
      if (!res.ok) throw new Error('Failed to update comment');
      
      // Refresh comments list to get the latest data from server
      const refreshResponse = await fetch(`/api/candidates/${candidateId}/comments?limit=${COMMENTS_PER_LOAD}&offset=0`, {
        credentials: 'include'
      });
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const refreshedComments = Array.isArray(refreshData.data) ? refreshData.data : [];
        setComments(refreshedComments);
        setCommentsOffset(refreshedComments.length);
        setHasMoreComments(refreshData.pagination?.hasMore || false);
      }
      
      onCommentsChange();
    } catch (err: any) {
      setComments(prevComments); // revert
      setError('Failed to update comment');
    } finally {
      setEditingSaving(null);
    }
  };

  const handleDeleteComment = async (id: string) => {
    // Extract the original comment ID by removing the 'comment-' prefix
    const originalId = id.replace('comment-', '');
    
    setDeleteLoading(id);
    setError(null);
    // Optimistically remove comment
    const prevComments = Array.isArray(comments) ? [...comments] : [];
    setComments(Array.isArray(comments) ? comments.filter(c => c.id !== originalId) : []);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/comments/${originalId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete comment');
      
      // Refresh comments list to get the latest data from server
      const refreshResponse = await fetch(`/api/candidates/${candidateId}/comments?limit=${COMMENTS_PER_LOAD}&offset=0`, {
        credentials: 'include'
      });
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const refreshedComments = Array.isArray(refreshData.data) ? refreshData.data : [];
        setComments(refreshedComments);
        setCommentsOffset(refreshedComments.length);
        setHasMoreComments(refreshData.pagination?.hasMore || false);
      }
      
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
    <div className="h-full flex flex-col min-h-0">
      {/* Combined Activity and Comments List - Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-0">
        {logsLoading ? (
          <div className="text-muted-foreground text-sm py-4 text-center">Loading activities...</div>
        ) : combinedActivities.length === 0 ? (
          <div className="text-muted-foreground text-sm py-4 text-center">No activities or comments yet.</div>
        ) : (
          <>
            {combinedActivities.map((item, index) => (
              <div key={item.id} className={`py-2 ${index !== combinedActivities.length - 1 ? 'border-b border-border' : ''}`}>
                <div className="flex gap-3">
                  {/* Icon with background based on type */}
                  {item.type === 'comment' ? (
                    <div className="px-1.5 py-0.5 bg-blue-500/10 dark:bg-blue-400/20 rounded-lg w-8 h-8 flex items-center justify-center">
                      <MessageSquare className="w-3 h-3 text-blue-600 dark:text-blue-300" />
                    </div>
                  ) : (
                    <div className="px-1.5 py-0.5 bg-green-500/10 dark:bg-green-400/20 rounded-lg w-8 h-8 flex items-center justify-center">
                      <Activity className="w-3 h-3 text-green-600 dark:text-green-300" />
                    </div>
                  )}
                  
                  {/* Content area */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
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
                    
                    {/* Comment or Activity Content */}
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
                          <div className="text-sm mb-2 whitespace-pre-wrap">{item.content}</div>
                        )}
                        {/* Attachments under comment */}
                        {(Array.isArray(item.attachments) ? item.attachments : []).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(Array.isArray(item.attachments) ? item.attachments : []).map((att: any, idx: number) => (
                              <div key={att.id || idx} className="flex items-center gap-2 border rounded px-2 py-1 bg-muted/50 hover:bg-muted/70 transition-colors">
                                {att.fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                                  <img src={att.url} alt={att.fileName} className="w-6 h-6 object-cover rounded" />
                                ) : (
                                  getFileIcon(att)
                                )}
                                <button 
                                  type="button"
                                  onClick={() => handleFileClick(att)}
                                  className="font-medium text-xs hover:underline text-left"
                                >
                                  {att.fileName}
                                </button>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border ml-1">{att.label}</span>
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
                </div>
              </div>
            ))}
            
            {/* Load More Button - Only show when there are more comments to load */}
            {hasMoreComments && (
              <div className="flex justify-center py-4">
                <Button
                  onClick={loadMoreComments}
                  disabled={loadingMore}
                  variant="outline"
                  size="sm"
                  className="w-full max-w-xs"
                >
                  {loadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                      Loading more...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Load more comments
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Chat-like Comment Input - Fixed at bottom */}
      <div className="border rounded-lg bg-background flex-shrink-0">
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
                    value={Array.isArray(labels) && labels[idx] ? labels[idx] : 'other'}
                    onChange={e => handleLabelChange(idx, e.target.value)}
                  >
                    {LABEL_OPTIONS.map(opt => (
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
                disabled={saving || (!newComment.trim() && (!Array.isArray(files) || files.length === 0))}
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

      {/* File Viewer Modal */}
      <FileViewerModal
        isOpen={isFileViewerOpen}
        onOpenChange={setIsFileViewerOpen}
        file={selectedFile}
      />
    </div>
  );
};

export default CandidateCommentsSection; 