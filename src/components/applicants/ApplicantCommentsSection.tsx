import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { useSession } from 'next-auth/react';
import { XMarkIcon as X, PhotoIcon as ImageIcon, DocumentTextIcon as FileTextIcon, DocumentIcon as FileIcon, PaperAirplaneIcon as Send, PaperClipIcon as Paperclip, ChartBarIcon as Activity, ChatBubbleLeftRightIcon as MessageSquare, ChevronDownIcon as ChevronDown, PencilIcon } from '@heroicons/react/24/outline';
import { FileViewerModal } from '../ui/file-viewer-modal';
import { sanitizeUrl, sanitizeHtml } from '@/lib/utils';
import { TiptapEditor } from '../ui/tiptap-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

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

export interface ApplicantCommentsSectionProps {
  applicantId: string;
  comments: any[];
  isEditing: boolean;
  onCommentsChange: () => void;
}

interface CombinedActivityItem {
  id: string;
  type: 'comment' | 'activity';
  rawType?: string;
  content?: string;
  action?: string;
  user?: string;
  note?: string;
  author?: { name: string } | string;
  createdAt?: string;
  time?: string;
  attachments?: any[];
}

const ApplicantCommentsSection: React.FC<ApplicantCommentsSectionProps> = ({ applicantId: applicantId, comments: initialComments, isEditing, onCommentsChange }) => {
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
  const [counts, setCounts] = useState<{ all: number; comment: number; remark: number; activity: number }>({
    all: 0,
    comment: 0,
    remark: 0,
    activity: 0
  });

  const { data: session } = useSession();
  const userPerms = session?.user?.modulePermissions || [];
  const isAdmin = session?.user?.role === 'Admin';
  
  const canViewAllComments = isAdmin || userPerms.includes('Applicants_COMMENTS_VIEW');
  const canViewRemarksOnly = userPerms.includes('Applicants_COMMENTS_VIEW_REMARK_ONLY');
  const canViewActivities = isAdmin || userPerms.includes('Applicants_ACTIVITIES_VIEW');

  // Tabs and Channels
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'comment' | 'remark' | 'activity'>('all');
  const [selectedChannel, setSelectedChannel] = useState<'comment' | 'remark' | 'activity'>('comment');

  // Set initial active tab and channel based on permissions
  useEffect(() => {
    if (!canViewAllComments && canViewRemarksOnly) {
      setActiveSubTab('remark');
      setSelectedChannel('remark');
    } else if (canViewAllComments) {
      setActiveSubTab('all');
      setSelectedChannel('comment');
    }
  }, [canViewAllComments, canViewRemarksOnly]);

  // Load more state
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [commentsOffset, setCommentsOffset] = useState(0);
  const COMMENTS_PER_LOAD = 5;

  // Activity pagination state
  const [loadingMoreActivities, setLoadingMoreActivities] = useState(false);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const [activitiesOffset, setActivitiesOffset] = useState(0);
  const ACTIVITIES_PER_LOAD = 5;

  // Display state for height-based rendering
  const [displayedItems, setDisplayedItems] = useState(8); // Show 8 items initially
  const ITEMS_PER_LOAD = 5; // Load 5 more items at a time

  // Drag-and-drop and file state
  const [files, setFiles] = useState<File[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // File viewer modal state
  const [selectedFile, setSelectedFile] = useState<{
    fileName: string;
    url: string;
    label?: string;
    updatedAt?: string;
    fileSize?: number;
    filePath?: string;
    applicantId?: string;
  } | null>(null);
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);

  // Load initial comments from API
  useEffect(() => {
    mountedRef.current = true;

    const loadInitialComments = async () => {
      try {
        const response = await fetch(`/api/applicants/${applicantId}/comments?limit=${COMMENTS_PER_LOAD}&offset=0`, {
          credentials: 'include'
        });

        if (!mountedRef.current) return;

        if (response.ok) {
          const data = await response.json();
          const initialCommentsData = Array.isArray(data.data) ? data.data : [];
          setComments(initialCommentsData);
          setCommentsOffset(initialCommentsData.length);
          setHasMoreComments(data.pagination?.hasMore || false);
          
          setCounts(prev => {
            const commentCount = data.pagination?.totalComments || 0;
            const remarkCount = data.pagination?.totalRemarks || 0;
            return {
              ...prev,
              all: commentCount + remarkCount + prev.activity,
              comment: commentCount,
              remark: remarkCount
            };
          });
        } else {
          // Fallback to parent-provided comments if API fails
          setComments(Array.isArray(initialComments) ? initialComments : []);
          setCommentsOffset(0);
          setHasMoreComments(true);
        }
      } catch (error) {
        if (!mountedRef.current) return;

        console.error('Error loading initial comments:', error);
        // Fallback to parent-provided comments if API fails
        setComments(Array.isArray(initialComments) ? initialComments : []);
        setCommentsOffset(0);
        setHasMoreComments(true);
      }
    };

    loadInitialComments();

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [applicantId, initialComments]);

  // Fetch activity logs with pagination
  useEffect(() => {
    setLogsLoading(true);
    fetch(`/api/applicants/${applicantId}/logs?limit=${ACTIVITIES_PER_LOAD}&offset=0`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        const initialLogs = Array.isArray(data.data) ? data.data : [];
        setLogs(initialLogs);
        setActivitiesOffset(initialLogs.length);
        setHasMoreActivities(data.pagination?.hasMore || false);
        setCounts(prev => {
          const activityCount = data.pagination?.total || 0;
          return {
            ...prev,
            activity: activityCount,
            all: prev.comment + prev.remark + activityCount
          };
        });
      })
      .catch(() => {
        setLogs([]);
        setActivitiesOffset(0);
        setHasMoreActivities(false);
      })
      .finally(() => setLogsLoading(false));
  }, [applicantId]);

  // Load more comments function
  const loadMoreComments = useCallback(async () => {
    if (loadingMore || !hasMoreComments) return;

    // Create new abort controller for this request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoadingMore(true);
    try {
      const response = await fetch(`/api/applicants/${applicantId}/comments?limit=${COMMENTS_PER_LOAD}&offset=${commentsOffset}`, {
        credentials: 'include',
        signal: abortControllerRef.current.signal
      });

      if (!mountedRef.current) return;

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
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Error loading more comments:', error);
    } finally {
      if (mountedRef.current) {
        setLoadingMore(false);
      }
    }
  }, [applicantId, commentsOffset, loadingMore, hasMoreComments]);

  // Load more activities function
  const loadMoreActivities = useCallback(async () => {
    if (loadingMoreActivities || !hasMoreActivities) return;

    setLoadingMoreActivities(true);
    try {
      const response = await fetch(`/api/applicants/${applicantId}/logs?limit=${ACTIVITIES_PER_LOAD}&offset=${activitiesOffset}`, {
        credentials: 'include'
      });

      if (!mountedRef.current) return;

      if (response.ok) {
        const data = await response.json();
        const newActivities = Array.isArray(data.data) ? data.data : [];

        if (newActivities.length > 0) {
          setLogs(prev => [...prev, ...newActivities]);
          setActivitiesOffset(prev => prev + newActivities.length);
          setHasMoreActivities(data.pagination?.hasMore || false);
        } else {
          setHasMoreActivities(false);
        }
      }
    } catch (error) {
      console.error('Error loading more activities:', error);
    } finally {
      if (mountedRef.current) {
        setLoadingMoreActivities(false);
      }
    }
  }, [applicantId, activitiesOffset, loadingMoreActivities, hasMoreActivities]);

  // Load more items for height-based display
  const loadMoreItems = useCallback(async () => {
    // Check if we need to load more comments or activities
    const currentComments = Array.isArray(comments) ? comments : [];
    const currentActivities = Array.isArray(logs) ? logs : [];
    const totalCurrentItems = currentComments.length + currentActivities.length;

    if (displayedItems >= totalCurrentItems) {
      // We need to load more data from the server
      if (hasMoreComments && !loadingMore) {
        await loadMoreComments();
      } else if (hasMoreActivities && !loadingMoreActivities) {
        await loadMoreActivities();
      }
    }

    // Increase displayed items
    setDisplayedItems(prev => prev + ITEMS_PER_LOAD);
  }, [comments, logs, displayedItems, hasMoreComments, hasMoreActivities, loadingMore, loadingMoreActivities, loadMoreComments, loadMoreActivities]);

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
      fileSize: attachment.fileSize,
      filePath: attachment.filePath,
      applicantId: attachment.applicantId || applicantId
    });
    setIsFileViewerOpen(true);
  };

  // Combine and sort all activities
  const allCombinedActivities: CombinedActivityItem[] = [
    // Add comments
    ...(Array.isArray(comments) ? comments : []).map(comment => ({
      id: `comment-${comment.id || 'unknown'}`,
      type: ((comment.type || 'comment') === 'activity' ? 'activity' : 'comment') as 'comment' | 'activity', // normalize for main 'type' used for rendering logic mostly
      rawType: comment.type || 'comment', // Keep raw type for filtering
      content: comment.content || '',
      author: comment.author || 'Unknown',
      createdAt: comment.createdAt || '',
      attachments: Array.isArray(comment.attachments) ? comment.attachments : []
    })),
    // Add activity logs - filter out "Comment" activities as they are duplicates of the actual comments
    ...(Array.isArray(logs) ? logs : [])
      .filter(log => !log.action || !log.action.toLowerCase().includes('comment'))
      .map(log => ({
      id: `activity-${log.id || 'unknown'}`,
      type: 'activity' as const,
      rawType: 'activity',
      action: log.action || '',
      user: log.user || 'System',
      note: log.note || '',
      time: log.time || ''
    }))
  ].sort((a, b) => {
    const dateA = (a as any).createdAt || (a as any).time;
    const dateB = (b as any).createdAt || (b as any).time;
    if (!dateA || !dateB) return 0;
    const parsedDateA = new Date(dateA);
    const parsedDateB = new Date(dateB);
    if (isNaN(parsedDateA.getTime()) || isNaN(parsedDateB.getTime())) return 0;
    return parsedDateB.getTime() - parsedDateA.getTime(); // Sort newest first
  });

  // Filter based on Tabs
  const filteredActivities = allCombinedActivities.filter(item => {
    if (activeSubTab === 'all') return true;
    if (activeSubTab === 'activity') return item.rawType === 'activity';
    if (activeSubTab === 'comment') return item.rawType === 'comment' || !item.rawType;
    if (activeSubTab === 'remark') return item.rawType === 'remark';
    return true;
  });

  // Limit displayed activities based on height
  const combinedActivities = filteredActivities.slice(0, displayedItems);
  const hasMoreItems = displayedItems < filteredActivities.length || hasMoreComments || hasMoreActivities;

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
    setFiles(prev => {
      const currentFiles = Array.isArray(prev) ? prev : [];
      return [...currentFiles, ...selectedFiles];
    });
    setLabels(prev => {
      const currentLabels = Array.isArray(prev) ? prev : [];
      return [...currentLabels, ...selectedFiles.map(() => 'other')];
    });
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
    formData.append('type', selectedChannel);

    const safeFiles = Array.isArray(files) ? files : [];
    const safeLabels = Array.isArray(labels) ? labels : [];

    safeFiles.forEach(file => formData.append('attachments', file));
    safeLabels.forEach(label => formData.append('labels', label));

    // Create optimistic comment
    const optimisticComment = {
      id: `temp-${Date.now()}`,
      content: newComment,
      type: selectedChannel,
      rawType: selectedChannel,
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
      const res = await fetch(`/api/applicants/${applicantId}/comments`, {
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
      const refreshResponse = await fetch(`/api/applicants/${applicantId}/comments?limit=${COMMENTS_PER_LOAD}&offset=0`, {
        credentials: 'include'
      });
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const refreshedComments = Array.isArray(refreshData.data) ? refreshData.data : [];
        setComments(refreshedComments);
        setCommentsOffset(refreshedComments.length);
        setHasMoreComments(refreshData.pagination?.hasMore || false);
        
        setCounts(prev => {
          const commentCount = refreshData.pagination?.totalComments || 0;
          const remarkCount = refreshData.pagination?.totalRemarks || 0;
          return {
            ...prev,
            all: commentCount + remarkCount + prev.activity,
            comment: commentCount,
            remark: remarkCount
          };
        });
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
      const res = await fetch(`/api/applicants/${applicantId}/comments/${originalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: editingContent }),
      });
      if (!res.ok) throw new Error('Failed to update comment');

      // Refresh comments list to get the latest data from server
      const refreshResponse = await fetch(`/api/applicants/${applicantId}/comments?limit=${COMMENTS_PER_LOAD}&offset=0`, {
        credentials: 'include'
      });
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const refreshedComments = Array.isArray(refreshData.data) ? refreshData.data : [];
        setComments(refreshedComments);
        setCommentsOffset(refreshedComments.length);
        setHasMoreComments(refreshData.pagination?.hasMore || false);
        
        setCounts(prev => {
          const commentCount = refreshData.pagination?.totalComments || 0;
          const remarkCount = refreshData.pagination?.totalRemarks || 0;
          return {
            ...prev,
            all: commentCount + remarkCount + prev.activity,
            comment: commentCount,
            remark: remarkCount
          };
        });
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
      const res = await fetch(`/api/applicants/${applicantId}/comments/${originalId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete comment');

      // Refresh comments list to get the latest data from server
      const refreshResponse = await fetch(`/api/applicants/${applicantId}/comments?limit=${COMMENTS_PER_LOAD}&offset=0`, {
        credentials: 'include'
      });
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const refreshedComments = Array.isArray(refreshData.data) ? refreshData.data : [];
        setComments(refreshedComments);
        setCommentsOffset(refreshedComments.length);
        setHasMoreComments(refreshData.pagination?.hasMore || false);
        
        setCounts(prev => {
          const commentCount = refreshData.pagination?.totalComments || 0;
          const remarkCount = refreshData.pagination?.totalRemarks || 0;
          return {
            ...prev,
            all: commentCount + remarkCount + prev.activity,
            comment: commentCount,
            remark: remarkCount
          };
        });
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
    <div className="h-full flex flex-col min-h-0 p-4">
      {/* Sub Tabs */}
      <div className="flex items-center border-b mb-4 overflow-x-auto no-scrollbar gap-6">
         {canViewAllComments && (
           <button
              onClick={() => {
                setActiveSubTab('all');
                setSelectedChannel('comment');
              }}
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-all duration-200 relative cursor-pointer whitespace-nowrap h-12 border-b-2 px-1",
                activeSubTab === 'all' 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/50"
              )}
           >
              <FileIcon className="h-4 w-4" />
              All {counts.all > 0 && `(${counts.all})`}
           </button>
         )}
         {canViewAllComments && (
           <button
              onClick={() => {
                setActiveSubTab('comment');
                setSelectedChannel('comment');
              }}
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-all duration-200 relative cursor-pointer whitespace-nowrap h-12 border-b-2 px-1",
                activeSubTab === 'comment' 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/50"
              )}
           >
              <MessageSquare className="h-4 w-4" />
              Comment {counts.comment > 0 && `(${counts.comment})`}
           </button>
         )}
         {(canViewAllComments || canViewRemarksOnly) && (
           <button
              onClick={() => {
                setActiveSubTab('remark');
                setSelectedChannel('remark');
              }}
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-all duration-200 relative cursor-pointer whitespace-nowrap h-12 border-b-2 px-1",
                activeSubTab === 'remark' 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/50"
              )}
           >
              <MessageSquare className="h-4 w-4 text-purple-500" />
              Remark {counts.remark > 0 && `(${counts.remark})`}
           </button>
         )}
         {canViewActivities && (
           <button
              onClick={() => {
                setActiveSubTab('activity');
                setSelectedChannel('activity');
              }}
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-all duration-200 relative cursor-pointer whitespace-nowrap h-12 border-b-2 px-1",
                activeSubTab === 'activity' 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/50"
              )}
           >
              <Activity className="h-4 w-4" />
              Activity {counts.activity > 0 && `(${counts.activity})`}
           </button>
         )}
      </div>

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
                  {/* Icon with background based on Type */}
                  {(item.rawType === 'remark') ? (
                    <div className="px-1.5 py-0.5 bg-purple-500/10 dark:bg-purple-400/20 rounded-lg w-8 h-8 flex items-center justify-center">
                        <MessageSquare className="w-3 h-3 text-purple-600 dark:text-purple-300" />
                    </div>
                  ) : item.type === 'comment' ? (
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
                          {item.type === 'comment' || item.type === 'activity' // 'activity' logged by user is a comment type
                            ? (typeof item.author === 'object' && item.author !== null && 'name' in item.author
                              ? item.author.name
                              : item.author || 'Unknown')
                            : item.user || 'System'
                          }
                        </span>
                        {item.rawType === 'remark' && <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">Remark to HM</span>}
                         {item.rawType === 'activity' && <span className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">Activity Log</span>}
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date((item as any).createdAt || (item as any).time || '').toLocaleString()}
                        </span>
                      </div>
                      {/* Show edit icon for comments - always visible, clicking triggers edit mode */}
                      {item.type === 'comment' && (
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
                                className="p-1 h-auto hover:bg-primary/10"
                                title="Edit comment"
                              >
                                <PencilIcon className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              </Button>
                              {isEditing && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteComment(item.id)}
                                  disabled={deleteLoading === item.id}
                                  className="text-destructive hover:text-destructive p-1 h-auto"
                                  title="Delete comment"
                                >
                                  {deleteLoading === item.id ? (
                                    <span className="text-xs">...</span>
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
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
                            <TiptapEditor
                              value={editingContent}
                              onChange={(value) => setEditingContent(value)}
                              placeholder="Edit your comment..."
                              className="min-h-[60px]"
                              showToolbar={true}
                            />
                          </div>
                        ) : (
                          <div 
                            className="text-sm mb-2 prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content || '') }}
                          />
                        )}
                        {/* Attachments under comment */}
                        {(Array.isArray(item.attachments) ? item.attachments : []).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(Array.isArray(item.attachments) ? item.attachments : []).map((att: any, idx: number) => (
                              <div key={att.id || idx} className="flex items-center gap-2 border rounded px-2 py-1 bg-muted/50 hover:bg-muted/70 transition-colors">
                                {att.fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                                  <img src={sanitizeUrl(att.url)} alt={att.fileName} className="w-6 h-6 object-cover rounded" />
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
                        {item.note && (
                          <span 
                            className="ml-2 text-muted-foreground prose prose-sm dark:prose-invert inline-block max-w-none [&_p]:my-0 [&_p]:inline"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.note) }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Load More Button - Show when there are more items to display */}
            {hasMoreItems && (
              <div className="flex justify-center py-4">
                <Button
                  onClick={loadMoreItems}
                  disabled={loadingMore || loadingMoreActivities}
                  variant="outline"
                  size="sm"
                  className="w-full max-w-xs"
                >
                  {(loadingMore || loadingMoreActivities) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                      Loading more...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Load more
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Channel Selector ABOVE Input - Dropdown Style */}
      <div className="flex items-center gap-2 mb-2">
        <Select
          value={selectedChannel}
          onValueChange={(value: 'comment' | 'remark' | 'activity') => {
            setSelectedChannel(value);
            setActiveSubTab(value);
          }}
        >
          <SelectTrigger className="w-[180px] h-8 text-[11px] font-semibold border-none bg-transparent hover:bg-muted/50 transition-colors focus:ring-0">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Post as:</span>
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {canViewAllComments && (
              <SelectItem value="comment" className="text-[11px]">Comment</SelectItem>
            )}
            {(canViewAllComments || canViewRemarksOnly) && (
              <SelectItem value="remark" className="text-[11px]">Remark to HM</SelectItem>
            )}
            {canViewActivities && (
              <SelectItem value="activity" className="text-[11px]">Activity</SelectItem>
            )}
          </SelectContent>
        </Select>
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
                      src={sanitizeUrl(URL.createObjectURL(file))}
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
        <div className="p-2">
          <div className="mb-2">
            <TiptapEditor
              value={newComment}
              onChange={(value) => setNewComment(value)}
              placeholder="Add a comment..."
              className="min-h-[60px]"
              showToolbar={true}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1"
            >
              <Paperclip className="w-4 h-4" />
              <span className="text-xs">Attach</span>
            </Button>
            <Button
              type="button"
              onClick={handleAddComment}
              disabled={saving || (!newComment.trim() && (!Array.isArray(files) || files.length === 0))}
              size="sm"
              className="flex items-center gap-1"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span className="text-xs">Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span className="text-xs">Send</span>
                </>
              )}
            </Button>
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

export default ApplicantCommentsSection;