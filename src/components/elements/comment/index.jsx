import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Paperclip, Edit2, Trash2, X, Image as ImageIcon, SendHorizonal } from "lucide-react";
import useApi from '@/lib/dataFetcher';
import { commentBaseUrl } from '@/utils/constants';

export default function CommentSection({ user_id, page_id }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newAttachments, setNewAttachments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editAttachments, setEditAttachments] = useState([]);
  const { loading: initialLoading, data: initialData, callApi: fetchComments, error } = useApi();
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  useEffect(() => {
    fetchComments(`${commentBaseUrl}?id=${page_id}`);
  }, [page_id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim() && newAttachments.length === 0) return;

    const comment = {
      id: Date.now().toString(),
      content: newComment,
      comment_body: newComment,
      author: {
        name: 'John Doe',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
      },
      page_id,
      user_id,
      timestamp: new Date(),
      attachments: newAttachments,
    };

    fetchComments(`${commentBaseUrl}`, {
      method: 'POST',
      body: JSON.stringify(comment),
    });

    setComments([comment, ...comments]);
    setNewComment('');
    setNewAttachments([]);
  };

  const handleEdit = (comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
    setEditAttachments([...comment.attachments]);
  };

  const handleDelete = (id) => {
    setComments(comments.filter(comment => comment.id !== id));
  };

  const handleUpdate = (id) => {
    if (!editContent.trim() && editAttachments.length === 0) return;

    setComments(comments.map(comment =>
      comment.id === id
        ? { ...comment, content: editContent, attachments: editAttachments }
        : comment
    ));
    setEditingId(null);
    setEditAttachments([]);
  };

  const handleFileChange = async (e, isEditing = false) => {
    const files = Array.from(e.target.files || []);
    const newFiles = await Promise.all(files.map(async (file) => {
      const attachment = {
        name: file.name,
        size: file.size,
        type: file.type,
      };

      // Create preview URL for images
      if (file.type.startsWith('image/')) {
        attachment.url = URL.createObjectURL(file);
      }

      return attachment;
    }));

    if (isEditing) {
      setEditAttachments([...editAttachments, ...newFiles]);
    } else {
      setNewAttachments([...newAttachments, ...newFiles]);
    }

    e.target.value = '';
  };

  const handleAttachmentClick = (isEditing = false) => {
    if (isEditing) {
      editFileInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const removeAttachment = (index, isEditing = false) => {
    if (isEditing) {
      const attachment = editAttachments[index];
      if (attachment.url) {
        URL.revokeObjectURL(attachment.url);
      }
      setEditAttachments(editAttachments.filter((_, i) => i !== index));
    } else {
      const attachment = newAttachments[index];
      if (attachment.url) {
        URL.revokeObjectURL(attachment.url);
      }
      setNewAttachments(newAttachments.filter((_, i) => i !== index));
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const AttachmentList = ({ attachments, onRemove, isEditing = false }) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((file, index) => (
        file.type.startsWith('image/') ? (
          <div key={index} className="relative group">
            <img
              src={file.url}
              alt={file.name}
              className="h-20 w-20 object-cover rounded-lg"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onRemove(index)}
            >
              <X className="h-3 w-3 text-white" />
            </Button>
          </div>
        ) : (
          <div
            key={index}
            className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full text-sm"
          >
            <Paperclip className="h-3 w-3" />
            <span>{file.name}</span>
            <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-4 w-4 ml-1 hover:bg-transparent"
              onClick={() => onRemove(index)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )
      ))}
    </div>
  );

  return (
    <div className="w-full space-y-6 mt-3">
      <form onSubmit={handleSubmit} className="space-y-2">
        <h4 className="font-bold">Comments</h4>
        <div className="relative flex items-start gap-3 w-full">
          <Avatar className="w-8 h-8">
            <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <div className="flex-1 relative">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="pr-24"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={(e) => handleFileChange(e)}
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleAttachmentClick()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button type="submit" size="icon" variant="ghost" className="h-8 w-8">
                <SendHorizonal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        {newAttachments.length > 0 && (
          <div className="ml-11">
            <AttachmentList
              attachments={newAttachments}
              onRemove={(index) => removeAttachment(index)}
            />
          </div>
        )}
      </form>

      <div className="space-y-6">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="flex gap-3 group"
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={comment.author.avatar} />
              <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              {editingId === comment.id ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={() => handleUpdate(comment.id)}>Save</Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setEditAttachments([]);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={editFileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      onChange={(e) => handleFileChange(e, true)}
                      accept="image/*,.pdf,.doc,.docx,.txt"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleAttachmentClick(true)}
                    >
                      <Paperclip className="h-4 w-4" />
                      Add files
                    </Button>
                  </div>
                  {editAttachments.length > 0 && (
                    <AttachmentList
                      attachments={editAttachments}
                      onRemove={(index) => removeAttachment(index, true)}
                      isEditing
                    />
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{comment.author.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {comment.timestamp.toLocaleString()}
                      </p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(comment)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(comment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1 text-sm">{comment.content}</p>
                  {comment.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {comment.attachments.map((file, index) => (
                        file.type.startsWith('image/') ? (
                          <div key={index} className="relative">
                            <img
                              src={file.url}
                              alt={file.name}
                              className="h-20 w-20 object-cover rounded-lg"
                            />
                          </div>
                        ) : (
                          <div
                            key={index}
                            className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full text-sm"
                          >
                            <Paperclip className="h-3 w-3" />
                            <span>{file.name}</span>
                            <span className="text-muted-foreground">
                              ({formatFileSize(file.size)})
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}