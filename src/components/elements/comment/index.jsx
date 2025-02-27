import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Paperclip, Edit2, Trash2, X, SendHorizonal } from "lucide-react";
import useApi from '@/lib/dataFetcher';
import { commentBaseUrl, mediaBaseUrl } from '@/utils/constants';
import { Skeleton } from '@/components/ui/skeleton';
import useSyncStore from '@/stores/useSyncStore';
import Spinner from '../spinner';
import { sanitize } from '@/utils/helper';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import dayjs from 'dayjs';
import ButtonLoading from '@/layouts/elements/components/ButtonLoading';

export default function CommentSection({ user_id, page_id, comments: initialComments }) {
  const [comments, setComments] = useState(initialComments || []);
  const [newComment, setNewComment] = useState('');
  const [newAttachments, setNewAttachments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editAttachments, setEditAttachments] = useState([]);
  const { callApi: fetchComments } = useApi();
  const { callApi: deleteComment } = useApi();
  const [currentDeletingId, setCurrentDeletingId] = useState(null);
  const [currentMediaDeletingId, setCurrentMediaDeletingId] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  const { user } = useSyncStore();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim() && newAttachments.length === 0) return;

    const comment = {
      comment_body: newComment,
      page_id,
      user_id,
    };

    saveComment({
      commentBaseUrl,
      mediaBaseUrl,
      commentBody: comment,
      attachments: newAttachments,
    });

  }

  const saveComment = ({ method = 'POST', commentBaseUrl, mediaBaseUrl, commentBody, attachments }) => {
    if (method === 'PUT') setEditLoading(true);
    else setLoading(true);

    fetchComments(commentBaseUrl, {
      method,
      body: JSON.stringify(commentBody),
    }, (commentResponse) => {
      setNewComment('');
      if (attachments.length === 0) {

        if (method === 'PUT') {
          setComments(comments.map(comment =>
            comment._id === commentResponse?._id
              ? { ...comment, ...sanitize(commentResponse) }
              : comment
          ));
        }
        else {
          setComments([...comments, sanitize(commentResponse)]);
        }
        setLoading(false);
        if (method === 'PUT') {
          setEditLoading(false);
          setEditingId(null);
          setEditAttachments([]);
        }
        return;
      }

      const formData = new FormData()
      formData.append('media_type', 'comment_attachment')
      formData.append('reference_id', commentResponse?._id)
      formData.append('caption', ' ')
      formData.append('reference_for', 'comment')

      for (let i = 0; i < attachments.length; i++) {
        if (attachments[i] instanceof File)
          formData.append('file', attachments[i])
      }

      fetchComments(mediaBaseUrl, {
        method: 'POST',
        body: formData,
      }, (mediaResponse) => {
        setLoading(false);
        if (method === 'PUT') {
          setEditLoading(false);
          setEditingId(null);
          setEditAttachments([]);
        }
        const newComment = commentResponse;
        newComment.mediaAttachments = Array.isArray(mediaResponse) ? mediaResponse : [mediaResponse];

        if (method === 'PUT') {
          setComments(comments.map(comment =>
            comment._id === commentResponse?._id
              ? { ...comment, ...sanitize(commentResponse) }
              : comment
          ));
        }
        else {
          setComments([...comments, sanitize(commentResponse)]);
        }
        setNewAttachments([]);
      });
    });
  }

  const handleEdit = (comment) => {
    setEditingId(comment._id);
    setEditContent(comment.comment_body);
    setEditAttachments([...sanitize(comment.mediaAttachments, 'array')]);
  };

  const handleDelete = (id) => {
    setCurrentDeletingId(id);
    deleteComment(`${commentBaseUrl}?id=${id}`, {
      method: 'DELETE',
    }, () => {
      setCurrentDeletingId(null);
      setComments(comments.filter(comment => comment._id !== id));
    });
  };

  const handleUpdate = (id) => {
    if (!editContent.trim() && editAttachments.length === 0) return;

    setEditLoading(true);

    saveComment({
      method: 'PUT',
      commentBaseUrl,
      mediaBaseUrl,
      commentBody: {
        id,
        comment_body: editContent,
        page_id,
        user_id
      },
      attachments: editAttachments.filter(file => file instanceof File),
    });
  };

  const handleFileChange = async (e, isEditing = false) => {
    const files = Array.from(e.target.files || []);
    // const newFiles = await Promise.all(files.map(async (file) => {

    //   const attachment = file

    //   // Create preview URL for images
    //   if (file.type.startsWith('image/')) {
    //     attachment.url = URL.createObjectURL(file);
    //   }

    //   return attachment;
    // }));

    if (isEditing) {
      setEditAttachments([...editAttachments, ...files]);
    } else {
      setNewAttachments([...newAttachments, ...files]);
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
      setCurrentMediaDeletingId(attachment._id);
      deleteComment(`${mediaBaseUrl}?id=${attachment._id}&reference_for=comment`, {
        method: 'DELETE',
      }, () => {
        setCurrentMediaDeletingId(null);
        setEditAttachments(editAttachments.filter((_, i) => i !== index));
      });
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

  const isImage = (file) => {
    if (!file) return false;
    return file.type?.startsWith('image/') || 
    (file.url?.includes("jpg") || 
    file.url?.includes("png")) ||
    file.url?.includes("jpeg");
  }

  const AttachmentList = ({ attachments, onRemove }) => {
    return <div className="flex flex-wrap gap-2 mt-2" >
      {
        attachments.filter(Boolean).map((file, index) => (
          isImage(file) ? (
            <div key={index} className="relative group">
              {currentMediaDeletingId === file._id && <Spinner className="absolute inset-0" loadingText={false} />}
              <img
                src={file instanceof File ? URL.createObjectURL(file) : file.url}
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
        ))
      }
    </div>
  }
  return (
    <div className="w-full space-y-6 mt-3">
      <form onSubmit={handleSubmit} className="space-y-2">
        <h4 className="font-bold">Comments ({comments?.length})</h4>
        <div className="relative">
          <div className="relative flex items-start gap-3 w-full">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.profileImage} />
              <AvatarFallback>{user?.name}</AvatarFallback>
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
                {loading ? <ButtonLoading />
                  :
                  <>
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
                  </>
                }
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
        </div>

      </form>

      <div className="space-y-6">
        {comments.map((comment) => (
          <div
            key={comment._id}
            className="flex gap-3 group"
          >
            {(currentDeletingId == comment._id) ?
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
              :
              <>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment?.userInfo?.url} />
                  <AvatarFallback>{comment?.userInfo?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  {editingId === comment._id ? (
                    <div className="space-y-2">
                      {editLoading ?
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[250px]" />
                            <Skeleton className="h-4 w-[200px]" />
                          </div>
                        </div>
                        :
                        <>
                          <div className="flex gap-2">
                            <Input
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="flex-1"
                            />
                            <Button onClick={() => handleUpdate(comment._id)}>Save</Button>
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
                        </>}

                    </div>
                  ) : (

                    <>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{comment.userInfo?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {dayjs(comment.createdAt).isValid() ? dayjs(comment.createdAt).format('MMM D, YYYY h:mm A') : ''}
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"

                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure to delete?</AlertDialogTitle>
                                {/* <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your account
                                and remove your data from our servers.
                              </AlertDialogDescription> */}
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>No</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(comment._id)}>Yes</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                        </div>
                      </div>
                      <p className="mt-1 text-sm">{comment.comment_body}</p>
                      {comment.mediaAttachments?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {comment.mediaAttachments.filter(Boolean).map((file, index) => (
                            isImage(file) ? (
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
              </>}

          </div>
        ))}
      </div>
    </div>
  );
}